import { describe, expect, it } from 'vitest';
import {
  extractFinalTranscript,
  isNoisyInput,
  shouldSuggestMatch,
  validateBestMatch,
} from '../src/lib/voicePipeline';
import { splitIntoKeyChunks } from '../src/lib/splitKeyChunks';
import {
  chunkSignature,
  parseOrderHits,
  parseOrderMessage,
  parseOrderMessages,
} from '../src/lib/parseOrderMessage';

describe('voicePipeline - isNoisyInput', () => {
  it('chặn transcript quá ngắn', () => {
    expect(isNoisyInput('')).toBe(true);
    expect(isNoisyInput('a')).toBe(true);
  });

  it('chấp nhận câu voice ngắn hợp lệ', () => {
    expect(isNoisyInput('5 kilos de tomates')).toBe(false);
  });

  it('chặn transcript quá dài (>120 ký tự)', () => {
    const long =
      'ajoute tomates salades carottes pommes poireaux aubergines concombres bananes oranges citrons poires peches raisin melon pasteque';
    expect(long.length).toBeGreaterThan(120);
    expect(isNoisyInput(long)).toBe(true);
  });

  it('chặn transcript quá nhiều từ (>18)', () => {
    expect(
      isNoisyInput('un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dixsept dixhuit dixneuf'),
    ).toBe(true);
  });
});

describe('voicePipeline - validateBestMatch', () => {
  it('chấp nhận khi score >= 0.82 và gap đủ lớn', () => {
    expect(
      validateBestMatch(
        { item: 'tomates', score: 0.9, keywordLen: 7 },
        { item: 'tomates cerises', score: 0.75, keywordLen: 14 },
      ),
    ).toBe(true);
  });

  it('từ chối khi score < 0.82', () => {
    expect(
      validateBestMatch({ item: 'tomates', score: 0.75, keywordLen: 7 }, null),
    ).toBe(false);
  });

  it('từ chối khi 2 sản phẩm quá gần nhau (minScoreGap)', () => {
    expect(
      validateBestMatch(
        { item: 'a', score: 0.85, keywordLen: 5 },
        { item: 'b', score: 0.82, keywordLen: 5 },
      ),
    ).toBe(false);
  });

  it('shouldSuggestMatch cho vùng 0.70–0.82', () => {
    expect(shouldSuggestMatch({ item: 'x', score: 0.75, keywordLen: 4 })).toBe(true);
    expect(shouldSuggestMatch({ item: 'x', score: 0.85, keywordLen: 4 })).toBe(false);
    expect(shouldSuggestMatch({ item: 'x', score: 0.65, keywordLen: 4 })).toBe(false);
  });
});

describe('voicePipeline - extractFinalTranscript', () => {
  it('chỉ lấy isFinal, bỏ interim', () => {
    const event = {
      resultIndex: 0,
      results: {
        length: 3,
        0: { isFinal: true, 0: { transcript: '5 kilos' } },
        1: { isFinal: false, 0: { transcript: 'de tomates et salades' } },
        2: { isFinal: true, 0: { transcript: 'de tomates' } },
      },
    };

    expect(extractFinalTranscript(event)).toBe('5 kilos de tomates');
  });

  it('bắt đầu từ resultIndex', () => {
    const event = {
      resultIndex: 1,
      results: {
        length: 2,
        0: { isFinal: true, 0: { transcript: 'ignore moi' } },
        1: { isFinal: true, 0: { transcript: '3 salades' } },
      },
    };

    expect(extractFinalTranscript(event)).toBe('3 salades');
  });
});

describe('voice pipeline - không quét keyword trên transcript dài (voice source)', () => {
  it('text source vẫn parse câu dài hợp lệ', () => {
    const text = '5 kilos de tomates et 3 salades';
    const textResults = parseOrderMessages(text, 'fr', { source: 'text' });
    expect(textResults.some((r) => r.type === 'add' && r.produit === 'Tomates')).toBe(true);
    expect(textResults.some((r) => r.type === 'add' && r.produit === 'Salades')).toBe(true);
  });

  it('voice source không bắt nhầm hàng loạt sản phẩm từ transcript tích lũy giả lập', () => {
    const accumulated =
      'tomates salades carottes pommes poireaux aubergines concombres bananes oranges citrons poires peches raisin melon pasteque ananas mangue';
    expect(isNoisyInput(accumulated)).toBe(true);

    const voiceResults = parseOrderMessages(accumulated, 'fr', { source: 'voice' });
    const adds = voiceResults.filter((r) => r.type === 'add');
    expect(adds.length).toBeLessThanOrEqual(1);
  });

  it('voice source khớp nhiều sản phẩm trong một câu không cần từ nối', () => {
    const results = parseOrderMessages('100 kg oranges 50 kg tomates', 'vi', { source: 'voice' });
    const adds = results.filter((r) => r.type === 'add');
    expect(adds.some((r) => r.produit === 'Oranges' && r.qte === 100)).toBe(true);
    expect(adds.some((r) => r.produit === 'Tomates' && r.qte === 50)).toBe(true);
  });

  it('voice source khớp câu tiếng Việt có dấu và từ nối', () => {
    const results = parseOrderMessages('thêm 100 kg oranges và 50 kg tomates', 'vi', { source: 'voice' });
    const adds = results.filter((r) => r.type === 'add');
    expect(adds.some((r) => r.produit === 'Oranges' && r.qte === 100)).toBe(true);
    expect(adds.some((r) => r.produit === 'Tomates' && r.qte === 50)).toBe(true);
  });

  it('voice source khớp đúng một lệnh ngắn', () => {
    const parsed = parseOrderMessage('5 kilos de tomates', 'fr');
    expect(parsed.type).toBe('add');
    if (parsed.type === 'add') {
      expect(parsed.produit).toBe('Tomates');
      expect(parsed.qte).toBe(5);
    }
  });

  it('transcript dài ASR — tách theo « them » vẫn parse từng lệnh', () => {
    const long =
      'them mot qua chanh mot trai dua leo them mot dua leo them mot dua leo dua leo them mot trai dua them mot dua nua';
    expect(isNoisyInput(long)).toBe(true);
    const chunks = splitIntoKeyChunks(long).filter((c) => !isNoisyInput(c));
    expect(chunks.length).toBeGreaterThan(0);
    const results = chunks.flatMap((c) => parseOrderMessages(c, 'vi', { source: 'voice' }));
    const adds = results.filter((r) => r.type === 'add');
    expect(adds.some((r) => r.produit === 'Citrons')).toBe(true);
    expect(adds.some((r) => r.produit === 'Concombres')).toBe(true);
    expect(adds.some((r) => r.produit === 'Ananas')).toBe(true);
  });

  it('cụm dài — mỗi action gắn sourceText cụm con, không transcript tích lũy', () => {
    const hits = parseOrderHits('them mot cu ca rot 5 trai le', 'vi', { source: 'voice' });
    const carotte = hits.find((h) => h.parsed.type === 'add' && h.parsed.produit === 'Carottes');
    const poire = hits.find((h) => h.parsed.type === 'add' && h.parsed.produit === 'Poires');
    expect(carotte?.sourceText).toMatch(/ca rot/);
    expect(carotte?.sourceText).not.toMatch(/\ble\b/);
    expect(poire?.sourceText).toMatch(/5 trai le|trai le/);
    expect(poire?.sourceText).not.toMatch(/ca rot/);
  });

  it('them mot trai dua leo — ưu tiên dưa leo, không nhầm dứa', () => {
    const parsed = parseOrderMessage('them mot trai dua leo', 'vi');
    expect(parsed.type).toBe('add');
    if (parsed.type === 'add') {
      expect(parsed.produit).toBe('Concombres');
    }
  });

  it('cùng cụm voice — không parse lại khi chunk đã xử lý trong lượt nói', () => {
    const chunk = 'them mot qua tao trai thom';
    const processed = new Set<string>();
    const runOnce = () => {
      const sig = chunkSignature(chunk);
      if (processed.has(sig)) return [];
      processed.add(sig);
      return parseOrderHits(chunk, 'vi', { source: 'voice' });
    };
    expect(runOnce()).toHaveLength(1);
    expect(runOnce()).toHaveLength(0);
  });

  it('bom chua — không nhầm « bo » trong từ khác với lệnh bỏ', () => {
    const parsed = parseOrderMessage('them mot bom chua', 'vi');
    expect(parsed.type).toBe('add');
    if (parsed.type === 'add') {
      expect(parsed.produit).toBe('Tomates');
    }
  });

  it('thêm/sửa/xóa/đổi — bắt đúng từ khóa hành động', () => {
    expect(parseOrderMessage('cho mot qua tao', 'vi').type).toBe('add');
    expect(parseOrderMessage('sua 5 cam', 'vi').type).toBe('correct');
    expect(parseOrderMessage('xoa 2 trai tao', 'vi').type).toBe('remove');
    expect(parseOrderMessage('doi cam thanh tao', 'vi').type).toBe('replace');
    expect(parseOrderMessage('bot 2 cam', 'vi').type).toBe('remove');
  });

  it('FR/EN — từ khóa hành động song song với tiếng Việt', () => {
    expect(parseOrderMessage('want to add 5 kg tomatoes', 'en').type).toBe('add');
    expect(parseOrderMessage('reduce 2 oranges', 'en').type).toBe('remove');
    expect(parseOrderMessage('swap oranges for apples', 'en').type).toBe('replace');
    expect(parseOrderMessage('ajuster 10 kg de tomates', 'fr').type).toBe('correct');
    expect(parseOrderMessage('je veux ajouter 3 salades', 'fr').type).toBe('add');
    expect(parseOrderMessage('diminuer 2 oranges', 'fr').type).toBe('remove');
  });

  it('cho mot X mot Y — kế thừa đúng hành động đầu cụm', () => {
    const hits = parseOrderHits('cho mot qua tao trai thom mot trai le', 'vi', { source: 'voice' });
    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.parsed.type === 'add')).toBe(true);
    const produits = hits.map((h) => (h.parsed.type === 'add' ? h.parsed.produit : '')).sort();
    expect(produits).toEqual(['Ananas', 'Poires']);
  });

  it('them 20 qua — không nhầm « them » với dứa (thom)', () => {
    const hits = parseOrderHits('them 20 qua', 'vi', { source: 'voice' });
    expect(hits).toHaveLength(0);
    const withProduct = parseOrderHits('them 20 qua thom', 'vi', { source: 'voice' });
    expect(withProduct).toHaveLength(1);
    if (withProduct[0]?.parsed.type === 'add') {
      expect(withProduct[0].parsed.produit).toBe('Ananas');
      expect(withProduct[0].parsed.qte).toBe(20);
    }
  });

  it('them 20 qua them 6 — tách 2 lệnh, không parse cụm ảo', () => {
    const hits = parseOrderHits('them 20 qua thom them 6 qua thom', 'vi', { source: 'voice' });
    const adds = hits.filter((h) => h.parsed.type === 'add');
    expect(adds).toHaveLength(2);
    expect(adds.every((h) => h.parsed.produit === 'Ananas')).toBe(true);
    expect(
      adds.map((h) => (h.parsed.type === 'add' ? h.parsed.qte : 0)).sort((a, b) => a - b),
    ).toEqual([6, 20]);
  });

  it('xoa — bớt sản phẩm vừa thêm khi không nói tên', () => {
    const ananas = { id: 'ananas', produit: 'Ananas', defaultUnite: 'piece' } as const;
    const hits = parseOrderHits('xoa 6', 'vi', {
      source: 'voice',
      lastProduct: ananas as import('../src/data/keywords').ProductKeyword,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].parsed.type).toBe('remove');
    if (hits[0].parsed.type === 'remove') {
      expect(hits[0].parsed.produit).toBe('Ananas');
      expect(hits[0].parsed.qte).toBe(6);
    }
  });

  it('xoa 2 trai tao — chỉ remove, không thêm lại từ cụm con', () => {
    const results = parseOrderMessages('xoa 2 trai tao', 'vi', { source: 'voice' });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('remove');
    if (results[0].type === 'remove') {
      expect(results[0].produit).toBe('Pommes');
      expect(results[0].qte).toBe(2);
    }
  });
});

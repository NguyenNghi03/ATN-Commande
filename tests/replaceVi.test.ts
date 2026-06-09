import { describe, expect, it } from 'vitest';
import { hasReplaceIntent, parseOrderMessage, parseOrderMessages } from '../src/lib/parseOrderMessage';
import { parseOrder } from '../src/lib/parseOrder';
import { isNoisyInput } from '../src/lib/voicePipeline';
import { applyParsed, buildInitialRows } from '../src/hooks/useOrderState';

describe('replace VI — đổi cam thành táo', () => {
  const short = 'đổi cam thành táo';
  const long = 'đổi cam thành táo đổi cam thành táo đợi cam thành táo';

  it('parseOrderMessage nhận replace ngắn', () => {
    const r = parseOrderMessage(short, 'vi');
    expect(r.type).toBe('replace');
    if (r.type === 'replace') {
      expect(r.fromProduit).toBe('Oranges');
      expect(r.produit).toBe('Pommes');
    }
  });

  it('parseOrderMessages voice — câu STT lặp', () => {
    expect(isNoisyInput(long)).toBe(false);
    const list = parseOrderMessages(long, 'vi', { source: 'voice' });
    const rep = list.find((r) => r.type === 'replace');
    expect(rep).toBeDefined();
    if (rep?.type === 'replace') {
      expect(rep.fromProduit).toBe('Oranges');
      expect(rep.produit).toBe('Pommes');
    }
  });

  it('hasReplaceIntent nhận lệnh đổi', () => {
    expect(hasReplaceIntent(short)).toBe(true);
    expect(hasReplaceIntent(long)).toBe(true);
  });

  it('parseOrder Phase 1 không chặn replace', () => {
    const { order } = parseOrder(short, { source: 'voice' });
    expect(order.reprompt.reason).not.toBe('missingQuantity');
  });

  it('applyParsed thay oranges bằng pommes', () => {
    const rows = [
      {
        id: 1,
        productId: 'oranges',
        produit: 'Oranges',
        emoji: '🍊',
        categorie: 'fruits',
        qte: 3,
        unite: 'piece',
        avatar: 'bg-orange-50',
      },
    ];
    const parsed = parseOrderMessage(short, 'vi');
    expect(parsed.type).toBe('replace');
    if (parsed.type !== 'replace') return;
    const { rows: next } = applyParsed(rows, parsed, 2);
    expect(next.some((r) => r.productId === 'oranges')).toBe(false);
    expect(next.some((r) => r.productId === 'pommes' && r.qte === 1)).toBe(true);
  });
});


import { describe, expect, it } from 'vitest';
import { parseOrder } from '../src/lib/parseOrder';
import { parseOrderMessages } from '../src/lib/parseOrderMessage';
import { applyParsedItemsToRows } from '../src/lib/orderForm';
import { applyParsed } from '../src/hooks/useOrderState';
import type { OrderRow } from '../src/types/order';

/** Mô phỏng luồng handleMessage sau khi sửa skipItems. */
function resolveRowsAfterMessage(
  text: string,
  lang: 'vi' | 'fr',
  source: 'voice' | 'text',
): OrderRow[] {
  let rows: OrderRow[] = [];
  let nextId = 1;
  let matched = false;

  for (const parsed of parseOrderMessages(text, lang, { source })) {
    if (parsed.type === 'unknown' || parsed.type === 'ignore') continue;
    const result = applyParsed(rows, parsed, nextId);
    rows = result.rows;
    nextId = result.nextId;
    matched = true;
  }

  if (!matched) {
    const { order } = parseOrder(text, { source });
    if (order.items.length > 0) {
      const result = applyParsedItemsToRows(rows, order.items, nextId);
      rows = result.rows;
    }
  }

  return rows;
}

import { describe, expect, it } from 'vitest';
import { parseOrderMessages } from '../src/lib/parseOrderMessage';
import { applyParsed } from '../src/hooks/useOrderState';
import type { ParsedOrderMessage } from '../src/types/order';

function addMsg(produit: string, productId: string, qte: number, unite: string): ParsedOrderMessage {
  return {
    type: 'add',
    productId,
    produit,
    qte,
    unite,
    emoji: '🍅',
    categorie: 'Produit frais',
    avatar: 'bg-rose-50',
    logLabel: '',
  };
}

describe('applyParsed — unité distincte', () => {
  it('même produit, unités différentes → 2 lignes', () => {
    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;

    ({ rows, nextId } = applyParsed(rows, addMsg('Tomates', 'tomates', 100, 'kg'), nextId));
    ({ rows, nextId } = applyParsed(rows, addMsg('Tomates', 'tomates', 5, 'colis'), nextId));

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.unite === 'kg')?.qte).toBe(100);
    expect(rows.find((r) => r.unite === 'colis')?.qte).toBe(5);
  });

  it('même produit, même unité → cộng dồn 1 ligne', () => {
    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;

    ({ rows, nextId } = applyParsed(rows, addMsg('Tomates', 'tomates', 100, 'kg'), nextId));
    ({ rows, nextId } = applyParsed(rows, addMsg('Tomates', 'tomates', 50, 'kg'), nextId));

    expect(rows).toHaveLength(1);
    expect(rows[0].qte).toBe(150);
  });

  it('parse voice: 100 kg et 5 colis tomates → 2 lignes', () => {
    const msgs = parseOrderMessages('100 kg tomates et 5 colis tomates', 'fr', { source: 'voice' }).filter(
      (m) => m.type === 'add',
    );
    expect(msgs.some((m) => m.unite === 'kg' && m.qte === 100)).toBe(true);
    expect(msgs.some((m) => m.unite === 'colis' && m.qte === 5)).toBe(true);

    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;
    for (const msg of msgs) {
      if (msg.type !== 'add') continue;
      ({ rows, nextId } = applyParsed(rows, msg, nextId));
    }
    expect(rows).toHaveLength(2);
  });
});

describe('order double apply', () => {
  it('thêm 100 kg oranges (voice) → 100 kg, không nhân đôi', () => {
    const rows = resolveRowsAfterMessage('thêm 100 kg oranges', 'vi', 'voice');
    expect(rows).toHaveLength(1);
    expect(rows[0].produit).toBe('Oranges');
    expect(rows[0].qte).toBe(100);
  });

  it('200 kg de tomates (text) → 200 kg une seule fois', () => {
    const rows = resolveRowsAfterMessage('200 kg de tomates', 'fr', 'text');
    expect(rows).toHaveLength(1);
    expect(rows[0].qte).toBe(200);
  });
});

describe('applyParsed — remove theo số lượng', () => {
  it('xóa 1 khi đang có 4 → còn 3', () => {
    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;
    ({ rows, nextId } = applyParsed(rows, addMsg('Oranges', 'oranges', 4, 'piece'), nextId));

    const parsed = parseOrderMessages('xoa 1 cam', 'vi', { source: 'voice' }).find((m) => m.type === 'remove');
    expect(parsed?.type).toBe('remove');
    if (parsed?.type !== 'remove') return;

    ({ rows } = applyParsed(rows, parsed, nextId));
    expect(rows).toHaveLength(1);
    expect(rows[0].qte).toBe(3);
  });

  it('remove không số lượng → xóa hết dòng', () => {
    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;
    ({ rows, nextId } = applyParsed(rows, addMsg('Carottes', 'carottes', 4, 'kg'), nextId));

    ({ rows } = applyParsed(
      rows,
      {
        type: 'remove',
        productId: 'carottes',
        produit: 'Carottes',
        unite: 'kg',
        logLabel: ' — supprimées',
      },
      nextId,
    ));
    expect(rows).toHaveLength(0);
  });

  it('bớt hết số lượng → xóa dòng', () => {
    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;
    ({ rows, nextId } = applyParsed(rows, addMsg('Oranges', 'oranges', 2, 'piece'), nextId));

    const parsed = parseOrderMessages('xoa 2 cam', 'vi', { source: 'voice' }).find((m) => m.type === 'remove');
    expect(parsed?.type).toBe('remove');
    if (parsed?.type !== 'remove') return;

    ({ rows } = applyParsed(rows, parsed, nextId));
    expect(rows).toHaveLength(0);
  });
});

describe('applyParsed — thứ tự đầu bảng', () => {
  it('sản phẩm mới thêm xuất hiện ở đầu bảng', () => {
    let rows: ReturnType<typeof applyParsed>['rows'] = [];
    let nextId = 1;

    ({ rows, nextId } = applyParsed(rows, addMsg('Oranges', 'oranges', 100, 'kg'), nextId));
    ({ rows, nextId } = applyParsed(rows, addMsg('Tomates', 'tomates', 50, 'kg'), nextId));

    expect(rows).toHaveLength(2);
    expect(rows[0].produit).toBe('Tomates');
    expect(rows[1].produit).toBe('Oranges');
  });
});

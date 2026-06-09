import { describe, expect, it } from 'vitest';
import {
  hasLeadingCorrectionIntent,
  isAdminOnlyClause,
  isChunkReady,
  parseOrderHits,
  parseOrderMessage,
} from '../src/lib/parseOrderMessage';
import { parseOrder } from '../src/lib/parseOrder';
import { applyParsed, buildInitialRows } from '../src/hooks/useOrderState';

import { splitIntoKeyChunks } from '../src/lib/parseOrderMessage';

describe('scenario Maison Martin + correction không', () => {
  it('đơn hàng cho — không tách nhầm tại « cho »', () => {
    const text = 'đơn hàng cho Maison Martin';
    const chunks = splitIntoKeyChunks(text);
    expect(chunks).toEqual(['don hang cho maison martin']);
    expect(parseOrder(text, { source: 'voice' }).order.client).toBe('Maison Martin');
  });

  it('Tạo đơn hàng cho Maison Martin — admin only, không thêm sản phẩm ảo', () => {
    const text = 'Tạo đơn hàng cho Maison Martin';
    expect(isAdminOnlyClause(text)).toBe(true);
    expect(isChunkReady(text, 'vi')).toBe(true);
    expect(parseOrderHits(text, 'vi', { source: 'voice' })).toHaveLength(0);
    expect(parseOrder(text, { source: 'voice' }).order.client).toBe('Maison Martin');
  });

  it('Giao hàng thứ Sáu — emit progressive ngay', () => {
    const text = 'Giao hàng thứ Sáu';
    expect(isAdminOnlyClause(text)).toBe(true);
    expect(isChunkReady(text, 'vi')).toBe(true);
    expect(parseOrder(text, { source: 'voice' }).order.date_livraison).toBeTruthy();
  });

  it('Không, 300 thùng cà rốt → correct 300 (không cộng dồn)', () => {
    expect(hasLeadingCorrectionIntent('Không, 300 thùng cà rốt')).toBe(true);

    const msg = parseOrderMessage('Không, 300 thùng cà rốt', 'vi');
    expect(msg.type).toBe('correct');
    if (msg.type === 'correct') expect(msg.qte).toBe(300);

    let rows = buildInitialRows();
    const add = parseOrderMessage('200 thùng cà rốt', 'vi');
    expect(add.type).toBe('add');
    if (add.type === 'add') {
      ({ rows } = applyParsed(rows, add, 1));
      expect(rows[0]?.qte).toBe(200);
    }
    if (msg.type === 'correct') {
      ({ rows } = applyParsed(rows, msg, 2));
      expect(rows[0]?.qte).toBe(300);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { parseOrder, toJsonContract } from '../src/lib/parseOrder';

const NOW = new Date('2026-06-09T03:00:00.000Z');

function parse(text: string) {
  return parseOrder(text, { source: 'text', now: NOW });
}

describe('P1-TASK-012 - example bắt buộc', () => {
  it('trích đúng client + date + creneau + 2 item, bỏ noise', () => {
    const { order } = parse(
      'Bonjour attends-moi, commande pour Dupont demain matin 5 kilos de tomates et 3 salades',
    );
    expect(order.client).toBe('Dupont');
    expect(order.date_livraison).toBe('demain');
    expect(order.creneau_livraison).toBe('matin');
    expect(order.items).toEqual([
      { product: 'tomates', quantity: 5, unit: 'kg', category: 'fruits_legumes', raw_segment: expect.any(String) },
      { product: 'salades', quantity: 3, unit: 'pièce', category: 'fruits_legumes', raw_segment: expect.any(String) },
    ]);
    expect(order.ignored_segments).toContain('Bonjour attends-moi');
  });
});

describe('P1-TASK-004 - đơn vị mặc định pièce', () => {
  it('thiếu unit -> pièce', () => {
    const { order } = parse('3 salades');
    expect(order.items[0]).toMatchObject({ product: 'salades', quantity: 3, unit: 'pièce' });
  });

  it('botte được nhận diện', () => {
    const { order } = parse('3 bottes de poireaux');
    expect(order.items[0]).toMatchObject({ product: 'poireaux', quantity: 3, unit: 'botte' });
  });
});

describe('P1-TASK-007 - negation', () => {
  it('pas de tomates không tạo item, vẫn lấy item khác', () => {
    const { order } = parse('pas de tomates, mets 4 kg de pommes de terre');
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ product: 'pommes de terre', quantity: 4, unit: 'kg' });
  });

  it('sans concombres bỏ qua sản phẩm đó', () => {
    const { order } = parse('sans concombres mais 5 kg d aubergines');
    expect(order.items).toEqual([
      expect.objectContaining({ product: 'aubergines', quantity: 5, unit: 'kg' }),
    ]);
  });
});

describe('P1-TASK-008 - correction last-wins', () => {
  it('5 tomates non 6 tomates -> 6', () => {
    const { order } = parse('5 tomates non 6 tomates');
    expect(order.items).toEqual([
      expect.objectContaining({ product: 'tomates', quantity: 6, unit: 'pièce' }),
    ]);
  });

  it('5 kilos de tomates non plutôt 6 kilos de tomates -> 6 kg', () => {
    const { order } = parse('5 kilos de tomates, non plutôt 6 kilos de tomates');
    expect(order.items).toEqual([
      expect.objectContaining({ product: 'tomates', quantity: 6, unit: 'kg' }),
    ]);
  });
});

describe('REQ-038/039 - lỗi: product lạ & thiếu số lượng', () => {
  it('product ngoài từ điển -> không item + ignored', () => {
    const { order } = parse('20 kg de licorne');
    expect(order.items).toHaveLength(0);
    expect(order.ignored_segments.length).toBeGreaterThan(0);
  });

  it('thiếu quantity -> không item + reprompt missingQuantity', () => {
    const { order } = parse('j ai besoin de tomates');
    expect(order.items).toHaveLength(0);
    expect(order.reprompt.reason).toBe('missingQuantity');
    expect(order.reprompt.required).toBe(true);
  });
});

describe('REQ-021 - câu 100% nhiễu', () => {
  it('không tạo item và đưa vào ignored_segments', () => {
    const { order } = parse('bonjour ça va merci');
    expect(order.items).toHaveLength(0);
    expect(order.ignored_segments).toContain('bonjour ça va merci');
  });
});

describe('P1-TASK-006 - admin triggers', () => {
  it('site + date format dd/mm + colis', () => {
    const { order } = parse("magasin Centre 8 colis d oranges le 15/06");
    expect(order.site).toBe('Centre');
    expect(order.date_livraison).toBe('15/06');
    expect(order.items[0]).toMatchObject({ product: 'oranges', quantity: 8, unit: 'colis' });
  });
});

describe('VI - tạo đơn hàng (client + ngày giao + sản phẩm)', () => {
  it('Tạo đơn hàng cho Ets Dupont, Giao hàng ngày mai và 5 kg cà chua', () => {
    const { order } = parse(
      'Tạo đơn hàng cho Ets Dupont, Giao hàng ngày mai và 5 kg cà chua',
    );
    expect(order.client).toBe('Ets Dupont');
    expect(order.date_livraison).toBe('ngày mai');
    expect(order.items).toEqual([
      expect.objectContaining({ product: 'tomates', quantity: 5, unit: 'kg' }),
    ]);
  });

  it('không dấu (voice) — tao don hang cho Ets Dupont, giao hang ngay mai va 5 kg ca chua', () => {
    const { order } = parse(
      'tao don hang cho Ets Dupont, giao hang ngay mai va 5 kg ca chua',
    );
    expect(order.client).toBe('Ets Dupont');
    expect(order.date_livraison).toBe('ngày mai');
    expect(order.items[0]).toMatchObject({ product: 'tomates', quantity: 5, unit: 'kg' });
  });
});

describe('P1-TASK-002 - JSON contract', () => {
  it('có đủ AUTO fields và không lộ field nội bộ', () => {
    const { order } = parse('5 kg de tomates');
    const json = toJsonContract(order);
    expect(Object.keys(json)).toEqual([
      'order_id', 'timestamp', 'source', 'user', 'status', 'client', 'site',
      'date_livraison', 'creneau_livraison', 'commentaire_livraison', 'items', 'ignored_segments',
    ]);
    expect(json.items).toEqual([
      { product: 'tomates', quantity: 5, unit: 'kg', category: 'fruits_legumes' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { parseOrder } from '../src/lib/parseOrder';
import {
  applyParsedItemsToRows,
  buildParsedOrderFromState,
  mapParsedOrderToOrderForm,
} from '../src/lib/orderForm';
import type { OrderRow } from '../src/types/order';

const NOW = new Date('2026-06-09T03:00:00.000Z');

describe('P2-TASK-002 - mapParsedOrderToOrderForm', () => {
  it('map admin + items, không tự thêm giá/ref', () => {
    const { order } = parseOrder(
      'commande pour Dupont demain matin 5 kilos de tomates et 3 salades',
      { source: 'text', now: NOW },
    );
    const form = mapParsedOrderToOrderForm(order, { date_commande: '09/06/2026' });

    expect(form.title).toBe('BON DE COMMANDE CLIENT');
    expect(form.client.name).toBe('Dupont');
    expect(form.date_livraison).toBe('demain');
    expect(form.creneau_livraison).toBe('matin');
    expect(form.date_commande).toBe('09/06/2026');

    expect(form.lines).toEqual([
      { ref: '', designation: 'tomates', unite: 'kg', qte: 5, pu_eur: null, total_eur: null },
      { ref: '', designation: 'salades', unite: 'pièce', qte: 3, pu_eur: null, total_eur: null },
    ]);

    expect(form.totals).toEqual({ total_ht: null, tva_rate: null, tva_amount: null, total_ttc: null });
  });

  it('không mất item khi map', () => {
    const { order } = parseOrder('5 kg de tomates, 2 cagettes de fraises, 3 ananas', {
      source: 'text',
      now: NOW,
    });
    const form = mapParsedOrderToOrderForm(order);
    expect(form.lines).toHaveLength(order.items.length);
    expect(form.lines).toHaveLength(3);
  });
});

describe('P2 — buildParsedOrderFromState + applyParsedItemsToRows', () => {
  it('sync items parser → rows UI', () => {
    const { order } = parseOrder('5 kilos de tomates et 3 salades', { source: 'text', now: NOW });
    const { rows, nextId } = applyParsedItemsToRows([], order.items, 1);
    expect(rows).toHaveLength(2);
    expect(rows[0].qte).toBe(3);
    expect(rows[1].qte).toBe(5);
    expect(nextId).toBe(3);
  });

  it('buildParsedOrderFromState pour JSON export', () => {
    const rows: OrderRow[] = [
      {
        id: 1,
        productId: 'tomates',
        produit: 'Tomates',
        emoji: '🍅',
        categorie: 'Produit frais',
        qte: 5,
        unite: 'kg',
        avatar: 'bg-rose-50',
      },
    ];
    const parsed = buildParsedOrderFromState(
      rows,
      { client: 'Dupont', site: '', date_livraison: 'demain', creneau_livraison: 'matin', commentaire_livraison: '' },
      'draft',
      [],
      { required: false, already_asked: false, reason: '', message: '' },
      { orderId: 'BC-TEST-001', source: 'text' },
    );
    expect(parsed.client).toBe('Dupont');
    expect(parsed.items[0]).toMatchObject({ product: 'tomates', quantity: 5, unit: 'kg' });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseOrder } from '../src/lib/parseOrder';
import {
  applyParsedItemsToRows,
  buildOrderForm,
  buildParsedOrderFromState,
  formatDefaultCreneau,
  formatDefaultDateLivraison,
  mapParsedOrderToOrderForm,
  buildInitialAdmin,
  resolveAdminFields,
  creneauToPickerValue,
  dateLivraisonToPickerValue,
  pickerValueToCreneau,
  pickerValueToDateLivraison,
  resolveCreneauLivraison,
  resolveDateLivraison,
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
    const tomorrow = new Date(NOW);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(form.date_livraison).toBe(formatDefaultDateLivraison(tomorrow));
    expect(form.creneau_livraison).toBe('9:00 AM');
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

function addDaysLocal(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

describe('defaults livraison — ngày / giờ hiện tại', () => {
  const NOW = new Date('2026-06-09T14:30:00.000Z');

  it('buildInitialAdmin khởi tạo date + creneau ngay từ đầu', () => {
    const admin = buildInitialAdmin(NOW);
    expect(admin.date_livraison).toBe(formatDefaultDateLivraison(NOW));
    expect(admin.creneau_livraison).toBe(formatDefaultCreneau(NOW));
    expect(admin.client).toBe('');
  });

  it('resolveAdminFields điền date + creneau khi trống', () => {
    const resolved = resolveAdminFields(
      { client: 'Dupont', site: '', date_livraison: '', creneau_livraison: '', commentaire_livraison: '' },
      NOW,
    );
    expect(resolved.date_livraison).toBe(formatDefaultDateLivraison(NOW));
    expect(resolved.creneau_livraison).toBe(formatDefaultCreneau(NOW));
  });

  it('ngày mai → hôm nay + 1 ngày', () => {
    const tomorrow = addDaysLocal(NOW, 1);
    expect(resolveDateLivraison('ngày mai', NOW)).toBe(formatDefaultDateLivraison(tomorrow));
    expect(resolveDateLivraison('demain', NOW)).toBe(formatDefaultDateLivraison(tomorrow));
    expect(resolveDateLivraison('ngay mai', NOW)).toBe(formatDefaultDateLivraison(tomorrow));
  });

  it('hôm nay / aujourd\'hui → ngày hiện tại', () => {
    expect(resolveDateLivraison('hôm nay', NOW)).toBe(formatDefaultDateLivraison(NOW));
    expect(resolveDateLivraison("aujourd'hui", NOW)).toBe(formatDefaultDateLivraison(NOW));
  });

  it('ngày mốt / mai mốt → +2 ngày', () => {
    const dayAfterTomorrow = addDaysLocal(NOW, 2);
    expect(resolveDateLivraison('ngày mốt', NOW)).toBe(formatDefaultDateLivraison(dayAfterTomorrow));
    expect(resolveDateLivraison('mai mốt', NOW)).toBe(formatDefaultDateLivraison(dayAfterTomorrow));
  });

  it('thứ sáu → thứ gần nhất; thứ sáu tuần sau → +1 tuần', () => {
    // NOW = 2026-06-09 (thứ Ba)
    expect(resolveDateLivraison('thứ sáu', NOW)).toBe(formatDefaultDateLivraison(addDaysLocal(NOW, 3)));
    expect(resolveDateLivraison('thứ sáu tuần sau', NOW)).toBe(
      formatDefaultDateLivraison(addDaysLocal(NOW, 10)),
    );
    expect(resolveDateLivraison('thu sau tuan toi', NOW)).toBe(
      formatDefaultDateLivraison(addDaysLocal(NOW, 10)),
    );
  });

  it('tháng sau / tháng tới → cùng ngày tháng kế', () => {
    const nextMonth = new Date(NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate());
    expect(resolveDateLivraison('tháng sau', NOW)).toBe(formatDefaultDateLivraison(nextMonth));
    expect(resolveDateLivraison('thang toi', NOW)).toBe(formatDefaultDateLivraison(nextMonth));
  });

  it('giữ ngày cố định dd/mm và créneau đã nhập', () => {
    const resolved = resolveAdminFields(
      {
        client: 'Dupont',
        site: '',
        date_livraison: '15/06/2026',
        creneau_livraison: 'matin',
        commentaire_livraison: '',
      },
      NOW,
    );
    expect(resolved.date_livraison).toBe('15/06/2026');
    expect(resolved.creneau_livraison).toBe('9:00 AM');
  });

  it('picker date / heure — conversion aller-retour', () => {
    expect(dateLivraisonToPickerValue('09/06/2026', NOW)).toBe('2026-06-09');
    expect(pickerValueToDateLivraison('2026-06-09')).toBe('09/06/2026');
    expect(creneauToPickerValue('2:30 PM', NOW)).toBe('14:30');
    expect(pickerValueToCreneau('14:30')).toBe('2:30 PM');
  });

  it('creneau — lúc 10, giờ chiều, AM/PM', () => {
    expect(resolveCreneauLivraison('lúc 10', NOW)).toBe('10:00 AM');
    expect(resolveCreneauLivraison('luc 10 gio sang', NOW)).toBe('10:00 AM');
    expect(resolveCreneauLivraison('2 giờ chiều', NOW)).toBe('2:00 PM');
    expect(resolveCreneauLivraison('14:30', NOW)).toBe('2:30 PM');
    expect(resolveCreneauLivraison('matin', NOW)).toBe('9:00 AM');
    expect(resolveCreneauLivraison('soir', NOW)).toBe('6:00 PM');
    expect(resolveCreneauLivraison('avant 10h', NOW)).toBe('9:00 AM');
  });

  it('buildOrderForm áp dụng mặc định khi thiếu', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const form = buildOrderForm(
      { client: 'Dupont', site: '', date_livraison: '', creneau_livraison: '', commentaire_livraison: '' },
      [{ product: 'Tomates', quantity: 5, unit: 'kg' }],
      { date_commande: '09/06/2026' },
    );
    expect(form.date_livraison).toBe(formatDefaultDateLivraison(NOW));
    expect(form.creneau_livraison).toBe(formatDefaultCreneau(NOW));
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

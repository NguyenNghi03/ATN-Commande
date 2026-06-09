import type { OrderForm } from '../types/orderForm';

/** Route hóa đơn — hỗ trợ `#bon-de-commande` và `#/bon-de-commande`. */
export const BON_DE_COMMANDE_HASH = '#/bon-de-commande';
export const BON_STORAGE_KEY = 'atn-bon-de-commande';

function normalizeHash(hash: string): string {
  return hash.replace(/^#\/?/, '').toLowerCase();
}

export type BonDeCommandeSnapshot = {
  form: OrderForm;
  orderId: string;
};

export function saveBonDeCommandeSnapshot(snapshot: BonDeCommandeSnapshot): void {
  sessionStorage.setItem(BON_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadBonDeCommandeSnapshot(): BonDeCommandeSnapshot | null {
  try {
    const raw = sessionStorage.getItem(BON_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BonDeCommandeSnapshot;
  } catch {
    return null;
  }
}

export function mainAppUrl(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function bonDeCommandePageUrl(): string {
  return `${mainAppUrl()}${BON_DE_COMMANDE_HASH}`;
}

export function openBonDeCommandePage(snapshot: BonDeCommandeSnapshot): void {
  saveBonDeCommandeSnapshot(snapshot);
  window.open(bonDeCommandePageUrl(), '_blank', 'noopener,noreferrer');
}

/** Lưu snapshot rồi chuyển sang trang hóa đơn (cùng tab). */
export function navigateToBonDeCommandePage(snapshot: BonDeCommandeSnapshot): void {
  saveBonDeCommandeSnapshot(snapshot);
  window.location.href = bonDeCommandePageUrl();
}

export function isBonDeCommandePage(): boolean {
  return normalizeHash(window.location.hash) === 'bon-de-commande';
}

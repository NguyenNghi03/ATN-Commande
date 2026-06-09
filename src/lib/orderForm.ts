import { products } from '../data/keywords';
import type { OrderRow } from '../types/order';
import type { InputSource, OrderItem, OrderStatus, OrderUnit, ParsedOrder, RepromptState } from '../types/parsedOrder';
import type { OrderForm, OrderFormContext, OrderFormLine } from '../types/orderForm';

const DEFAULT_FOURNISSEUR = 'ATN Grossiste Fruits & Légumes';

const EMPTY_TOTALS = {
  total_ht: null,
  tva_rate: null,
  tva_amount: null,
  total_ttc: null,
} as const;

export type AdminFields = {
  client: string;
  site: string;
  date_livraison: string;
  creneau_livraison: string;
  commentaire_livraison: string;
};

/** Ngày giao mặc định: hôm nay (dd/mm/yyyy). */
export function formatDefaultDateLivraison(now = new Date()): string {
  return now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setMonth(d.getMonth() + months);
  return d;
}

export function normalizeDateToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Thứ trong tuần (0 = CN). */
const WEEKDAY_INDEX: Record<string, number> = {
  'thu hai': 1,
  'thu ba': 2,
  'thu tu': 3,
  'thu nam': 4,
  'thu sau': 5,
  'thu bay': 6,
  'chu nhat': 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 0,
};

/** Offset ngày cố định so với hôm nay. */
const DAY_OFFSET: Record<string, number> = {
  "aujourd'hui": 0,
  'aujourd hui': 0,
  'hom nay': 0,
  'ngay mai': 1,
  demain: 1,
  'ngay mot': 2,
  'mai mot': 2,
  'ngay kia': 2,
  mot: 2,
};

function resolveWeekdayDate(now: Date, weekday: number, nextWeek: boolean): Date {
  const today = now.getDay();
  let days = (weekday - today + 7) % 7;
  if (nextWeek) days += days === 0 ? 7 : 7;
  return addDays(now, days);
}

function tryResolveWeekdayPhrase(n: string, now: Date): string | null {
  const nextWeek = /\b(tuan\s+sau|tuan\s+toi)\b/.test(n);
  const entries = Object.entries(WEEKDAY_INDEX).sort((a, b) => b[0].length - a[0].length);
  for (const [name, day] of entries) {
    const re = new RegExp(`(?:^|\\s)${name.replace(/\s+/g, '\\s+')}(?:\\s|$)`);
    if (!re.test(n)) continue;
    return formatDefaultDateLivraison(resolveWeekdayDate(now, day, nextWeek));
  }
  return null;
}

/**
 * Chuyển date_livraison sang dd/mm/yyyy khi là cụm ngày tương đối (VI/FR).
 * Ví dụ: ngày mai, ngày mốt, thứ sáu tuần sau, tháng tới.
 */
export function resolveDateLivraison(value: string, now = new Date()): string {
  const trimmed = value.trim();
  if (!trimmed) return formatDefaultDateLivraison(now);
  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(trimmed)) return trimmed;

  const n = normalizeDateToken(trimmed);

  const dayOffset = DAY_OFFSET[n];
  if (dayOffset !== undefined) return formatDefaultDateLivraison(addDays(now, dayOffset));

  if (/^thang\s+(sau|toi)$/.test(n)) {
    return formatDefaultDateLivraison(addMonths(now, 1));
  }

  const weekdayResolved = tryResolveWeekdayPhrase(n, now);
  if (weekdayResolved) return weekdayResolved;

  return trimmed;
}

/** Định dạng giờ 12h với AM/PM (vd. `10:00 AM`, `2:30 PM`). */
export function formatCreneau12h(hours24: number, minutes: number): string {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const h12 = hours24 % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Créneau mặc định: giờ hiện tại (AM/PM). */
export function formatDefaultCreneau(now = new Date()): string {
  return formatCreneau12h(now.getHours(), now.getMinutes());
}

/** dd/mm/yyyy → yyyy-mm-dd (input type="date"). */
export function dateLivraisonToPickerValue(value: string, now = new Date()): string {
  const resolved = resolveDateLivraison(value, now);
  const m = resolved.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return '';
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** yyyy-mm-dd → dd/mm/yyyy. */
export function pickerValueToDateLivraison(iso: string): string {
  const [y, mo, d] = iso.split('-');
  if (!y || !mo || !d) return '';
  return `${d.padStart(2, '0')}/${mo.padStart(2, '0')}/${y}`;
}

/** Créneau AM/PM → HH:mm (input type="time"). */
export function creneauToPickerValue(value: string, now = new Date()): string {
  const resolved = resolveCreneauLivraison(value, now);
  const amPm = resolved.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = amPm[2];
    const pm = amPm[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const h24 = resolved.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    return `${String(parseInt(h24[1], 10)).padStart(2, '0')}:${h24[2]}`;
  }
  return '';
}

/** HH:mm → Créneau AM/PM. */
export function pickerValueToCreneau(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  return formatCreneau12h(h, m);
}

/** Giá trị créneau dạng đồng hồ (12h AM/PM hoặc 24h HH:mm). */
export function isClockCreneau(value: string): boolean {
  const t = value.trim();
  return /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(t);
}

const NAMED_CRENEAU: Record<string, [number, number]> = {
  matin: [9, 0],
  sang: [9, 0],
  'buoi sang': [9, 0],
  'fin de matinee': [11, 0],
  'fin de matinée': [11, 0],
  'avant midi': [11, 0],
  'apres-midi': [14, 0],
  'après-midi': [14, 0],
  'debut d apres-midi': [14, 0],
  aprem: [14, 0],
  chieu: [14, 0],
  'buoi chieu': [14, 0],
  toi: [18, 0],
  soir: [18, 0],
};

function parseHourPeriod(hour: number, period?: string): number {
  const p = period?.toLowerCase();
  if (p === 'chieu' || p === 'toi' || p === 'pm') return hour < 12 ? hour + 12 : hour;
  if (p === 'sang' || p === 'am') return hour === 12 ? 0 : hour;
  if (hour >= 13) return hour;
  if (hour === 12) return 12;
  if (hour >= 1 && hour <= 11) return hour;
  return hour;
}

/**
 * Chuyển creneau_livraison sang giờ 12h AM/PM.
 * `lúc 10` → 10:00 AM · `2 giờ chiều` → 2:00 PM · `matin` → 9:00 AM.
 */
export function resolveCreneauLivraison(value: string, now = new Date()): string {
  const trimmed = value.trim();
  if (!trimmed) return formatDefaultCreneau(now);

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    const h = parseInt(amPmMatch[1], 10);
    const m = parseInt(amPmMatch[2], 10);
    const pm = amPmMatch[3].toUpperCase() === 'PM';
    const h24 = pm ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
    return formatCreneau12h(h24, m);
  }

  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    return formatCreneau12h(parseInt(h24Match[1], 10), parseInt(h24Match[2], 10));
  }

  const n = normalizeDateToken(trimmed);

  const avant = n.match(/avant\s*(\d{1,2})\s*h?/);
  if (avant) {
    const h = Math.max(0, parseInt(avant[1], 10) - 1);
    return formatCreneau12h(h, 0);
  }

  const timePatterns = [
    /(?:luc|a|at)\s*(\d{1,2})(?:h|gio|:)?(\d{2})?\s*(sang|chieu|toi|am|pm)?/,
    /(\d{1,2})\s*(?:h|gio)\s*(\d{2})?\s*(sang|chieu|toi|am|pm)?/,
    /(\d{1,2})\s*(?:gio|h)\s*(sang|chieu|toi|am|pm)/,
  ];
  for (const re of timePatterns) {
    const m = n.match(re);
    if (!m) continue;
    const hour = parseInt(m[1], 10);
    const minute = m[2] && /^\d+$/.test(m[2]) ? parseInt(m[2], 10) : 0;
    const period = m[3] ?? (m[2] && !/^\d+$/.test(m[2]) ? m[2] : undefined);
    const h24 = parseHourPeriod(hour, period);
    return formatCreneau12h(h24, minute);
  }

  const namedKeys = Object.keys(NAMED_CRENEAU).sort((a, b) => b.length - a.length);
  for (const name of namedKeys) {
    if (n === name) return formatCreneau12h(...NAMED_CRENEAU[name]);
  }

  return trimmed;
}

/** Điền date_livraison / creneau_livraison khi người dùng chưa nói hoặc nhập. */
export function resolveAdminFields(admin: AdminFields, now = new Date()): AdminFields {
  return {
    ...admin,
    date_livraison: resolveDateLivraison(admin.date_livraison, now),
    creneau_livraison: resolveCreneauLivraison(admin.creneau_livraison, now),
  };
}

/** Champs admin vides (preview / tests) — sans date ni créneau. */
export const EMPTY_ADMIN: AdminFields = {
  client: '',
  site: '',
  date_livraison: '',
  creneau_livraison: '',
  commentaire_livraison: '',
};

/** État admin au démarrage / reset — date et créneau = maintenant. */
export function buildInitialAdmin(now = new Date()): AdminFields {
  return {
    client: '',
    site: '',
    date_livraison: formatDefaultDateLivraison(now),
    creneau_livraison: formatDefaultCreneau(now),
    commentaire_livraison: '',
  };
}

/** Exemples affichés en placeholder quand le champ est vide. */
export const ADMIN_FIELD_PLACEHOLDERS: Record<keyof AdminFields, string> = {
  client: 'Ex. Restaurant Dupont',
  site: 'Ex. Entrepôt Lyon',
  date_livraison: 'Ex. demain, vendredi…',
  creneau_livraison: 'Ex. lúc 10 sáng, 2 giờ chiều',
  commentaire_livraison: 'Ex. Livraison quai arrière',
};

export type OrderFormItem = {
  product: string;
  quantity: number;
  unit: string;
};

/** Unité UI interne (`piece`) → token contract (`pièce`). */
export function unitToContract(unit: string): OrderUnit {
  if (unit === 'piece') return 'pièce';
  return unit as OrderUnit;
}

/** Token contract → unité UI interne. */
export function unitToInternal(unit: string): string {
  if (unit === 'pièce') return 'piece';
  return unit;
}

export function findProductMeta(productName: string) {
  const n = productName.toLowerCase();
  return products.find(
    (p) =>
      p.produit.toLowerCase() === n ||
      p.id.replace(/-/g, ' ') === n ||
      p.id === n.replace(/\s+/g, '-'),
  );
}

/** Construire ParsedOrder depuis l'état UI (P2 — JSON debug / export). */
export function buildParsedOrderFromState(
  rows: OrderRow[],
  admin: AdminFields,
  status: OrderStatus,
  ignoredSegments: string[],
  reprompt: RepromptState,
  opts: { orderId: string; source?: InputSource; timestamp?: string } = { orderId: 'AUTO' },
): ParsedOrder {
  const items: OrderItem[] = rows
    .filter((r) => r.qte > 0)
    .map((r) => ({
      product: r.produit.toLowerCase(),
      quantity: r.qte,
      unit: unitToContract(r.unite),
      category: 'fruits_legumes' as const,
    }));

  const resolved = resolveAdminFields(admin);

  return {
    order_id: opts.orderId,
    timestamp: opts.timestamp ?? new Date().toISOString(),
    source: opts.source ?? 'voice',
    user: 'AUTO_SESSION_USER',
    status,
    client: admin.client,
    site: admin.site,
    date_livraison: resolved.date_livraison,
    creneau_livraison: resolved.creneau_livraison,
    commentaire_livraison: admin.commentaire_livraison,
    items,
    ignored_segments: ignoredSegments,
    missing_fields: [],
    reprompt,
  };
}

/** Appliquer items du parser Phase 1 sur les lignes UI (correction last-wins). */
export function applyParsedItemsToRows(
  rows: OrderRow[],
  items: OrderItem[],
  nextId: number,
): { rows: OrderRow[]; nextId: number } {
  let current = [...rows];
  let id = nextId;

  for (const item of items) {
    const meta = findProductMeta(item.product);
    if (!meta) continue;

    const unite = unitToInternal(item.unit);
    const existing = current.find((r) => r.productId === meta.id && r.unite === unite);

    if (existing) {
      current = current.map((r) =>
        r.id === existing.id ? { ...r, qte: item.quantity, unite } : r,
      );
    } else {
      current.unshift({
        id: id++,
        productId: meta.id,
        produit: meta.produit,
        emoji: meta.emoji,
        categorie: meta.categorie,
        qte: item.quantity,
        unite,
        avatar: meta.avatar,
      });
    }
  }

  return { rows: current, nextId: id };
}

/**
 * Build OrderForm từ admin + lines (P2-TASK-001/002).
 * Không tự suy diễn giá/ref: pu_eur/total_eur/totals = null khi chưa có catalog.
 */
export function buildOrderForm(
  admin: AdminFields,
  items: OrderFormItem[],
  context: OrderFormContext = {},
): OrderForm {
  const resolved = resolveAdminFields(admin);
  const lines: OrderFormLine[] = items.map((it) => ({
    ref: '',
    designation: it.product,
    unite: it.unit,
    qte: it.quantity,
    pu_eur: null,
    total_eur: null,
  }));

  return {
    title: 'BON DE COMMANDE CLIENT',
    fournisseur: context.fournisseur ?? DEFAULT_FOURNISSEUR,
    client: {
      name: admin.client,
      code: context.client_code ?? '',
      address: context.client_address ?? '',
    },
    date_commande: context.date_commande ?? '',
    date_livraison: resolved.date_livraison,
    creneau_livraison: resolved.creneau_livraison,
    lines,
    totals: { ...EMPTY_TOTALS },
    commande_passee_par: context.commande_passee_par ?? '',
    validation_client: '',
    observations: context.observations ?? admin.commentaire_livraison ?? '',
  };
}

/** Mapper trực tiếp từ ParsedOrder (P2-TASK-002). */
export function mapParsedOrderToOrderForm(
  parsed: ParsedOrder,
  context: OrderFormContext = {},
): OrderForm {
  return buildOrderForm(
    {
      client: parsed.client,
      site: parsed.site,
      date_livraison: parsed.date_livraison,
      creneau_livraison: parsed.creneau_livraison,
      commentaire_livraison: parsed.commentaire_livraison,
    },
    parsed.items.map((i) => ({ product: i.product, quantity: i.quantity, unit: i.unit })),
    context,
  );
}

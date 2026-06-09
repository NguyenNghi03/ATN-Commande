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

  return {
    order_id: opts.orderId,
    timestamp: opts.timestamp ?? new Date().toISOString(),
    source: opts.source ?? 'voice',
    user: 'AUTO_SESSION_USER',
    status,
    client: admin.client,
    site: admin.site,
    date_livraison: admin.date_livraison,
    creneau_livraison: admin.creneau_livraison,
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
    date_livraison: admin.date_livraison,
    creneau_livraison: admin.creneau_livraison,
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

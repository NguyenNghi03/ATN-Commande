import { findProductsInText, parseOrder } from './parseOrder';
import { isValidateIntent } from './orderValidate';

/** Action phát ra khi replay hội thoại (P3-TASK-002/003). Token giữ nguyên đặc tả. */
export type ScenarioAction =
  | { type: 'SET_CLIENT'; value: string }
  | { type: 'SET_SITE'; value: string }
  | { type: 'SET_DATE'; value: string }
  | { type: 'ADD_LIGNE'; product: string; quantity: number; unit: string }
  | { type: 'UPDATE_LIGNE'; product: string; quantity: number; unit: string }
  | { type: 'DELETE_LIGNE'; product: string }
  | { type: 'IGNORE'; value: string }
  | { type: 'VALIDATE'; status: 'validée' }
  | { type: 'REOPEN' };

type LineState = { quantity: number; unit: string };

type ScenarioState = {
  client: string;
  site: string;
  date_livraison: string;
  creneau_livraison: string;
  items: Map<string, LineState>;
};

const REOPEN_RE = /\b(r[eé]ouvre|r[eé]ouvrir|modifier\s+la\s+commande|corriger\s+la\s+commande)\b/i;
const DELETE_RE = /\b(supprime[rz]?|retire[rz]?|enl[eè]ve[rz]?|enlever|annule[rz]?)\b/i;

function emptyState(): ScenarioState {
  return {
    client: '',
    site: '',
    date_livraison: '',
    creneau_livraison: '',
    items: new Map(),
  };
}

function dateValue(date: string, creneau: string): string {
  return creneau ? `${date} ${creneau}`.trim() : date;
}

/** Xử lý một lượt hội thoại, trả về các action phát sinh. */
function processTurn(state: ScenarioState, turn: string): ScenarioAction[] {
  const actions: ScenarioAction[] = [];

  if (isValidateIntent(turn)) {
    actions.push({ type: 'VALIDATE', status: 'validée' });
    return actions;
  }
  if (REOPEN_RE.test(turn)) {
    actions.push({ type: 'REOPEN' });
    return actions;
  }

  if (DELETE_RE.test(turn)) {
    const recognized = findProductsInText(turn);
    if (recognized.length > 0) {
      for (const product of recognized) {
        state.items.delete(product);
        actions.push({ type: 'DELETE_LIGNE', product });
      }
      return actions;
    }
  }

  const { order } = parseOrder(turn, { source: 'voice' });

  if (order.client && order.client !== state.client) {
    state.client = order.client;
    actions.push({ type: 'SET_CLIENT', value: order.client });
  }
  if (order.site && order.site !== state.site) {
    state.site = order.site;
    actions.push({ type: 'SET_SITE', value: order.site });
  }
  if (order.date_livraison || order.creneau_livraison) {
    const nextDate = order.date_livraison || state.date_livraison;
    const nextCreneau = order.creneau_livraison || state.creneau_livraison;
    const value = dateValue(nextDate, nextCreneau);
    const prevValue = dateValue(state.date_livraison, state.creneau_livraison);
    if (value && value !== prevValue) {
      state.date_livraison = nextDate;
      state.creneau_livraison = nextCreneau;
      actions.push({ type: 'SET_DATE', value });
    }
  }

  for (const item of order.items) {
    const existing = state.items.get(item.product);
    if (!existing) {
      state.items.set(item.product, { quantity: item.quantity, unit: item.unit });
      actions.push({
        type: 'ADD_LIGNE',
        product: item.product,
        quantity: item.quantity,
        unit: item.unit,
      });
    } else if (existing.quantity !== item.quantity || existing.unit !== item.unit) {
      state.items.set(item.product, { quantity: item.quantity, unit: item.unit });
      actions.push({
        type: 'UPDATE_LIGNE',
        product: item.product,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }

  for (const seg of order.ignored_segments) {
    actions.push({ type: 'IGNORE', value: seg });
  }

  return actions;
}

/** Replay toàn bộ dialogue → chuỗi action phẳng (P3-TASK-002/003). */
export function replayScenario(dialogue: string[]): ScenarioAction[] {
  const state = emptyState();
  const all: ScenarioAction[] = [];
  for (const turn of dialogue) {
    if (!turn.trim()) continue;
    all.push(...processTurn(state, turn));
  }
  return all;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { products } from '../data/keywords';
import {
  chunkSignature,
  formatTime,
  parseOrderHits,
  parsedFingerprint,
  splitIntoKeyChunks,
} from '../lib/parseOrderMessage';
import { parseOrder, toJsonContract } from '../lib/parseOrder';
import { maxActionLog } from '../data/keywords';
import { isNoisyInput } from '../lib/voicePipeline';
import type { Lang, ProductKeyword } from '../data/keywords';
import type { ActionLogEntry, OrderRow, ParsedOrderMessage } from '../types/order';
import type { OrderStatus, RepromptState } from '../types/parsedOrder';
import {
  applyParsedItemsToRows,
  buildOrderForm,
  buildParsedOrderFromState,
  buildInitialAdmin,
  formatDefaultCreneau,
  unitToContract,
  type AdminFields,
} from '../lib/orderForm';
import {
  navigateToBonDeCommandePage,
  type BonDeCommandeSnapshot,
} from '../lib/bonDeCommandeUrl';
import { isValidateIntent } from '../lib/orderValidate';

const STORAGE_KEY = 'atn-commande-draft';

export type AdminFieldKey = keyof AdminFields;

const EMPTY_REPROMPT: RepromptState = {
  required: false,
  already_asked: false,
  reason: '',
  message: '',
};

const REOPEN_RE = /\b(r[eé]ouvre|modifier\s+la\s+commande|corriger\s+la\s+commande)\b/i;

/** Spinner avant application tableau, puis icône check. */
const ACTION_SPIN_MS = 550;
const ACTION_CHECK_MS = 400;

let actionIdSeq = 0;
function newActionId(): string {
  actionIdSeq += 1;
  return `act-${Date.now()}-${actionIdSeq}`;
}

function formatDateCommande(d = new Date()): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function newOrderId(): string {
  return `BC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

export type OrderLine = {
  produit: string;
  qte: number;
  unite: string;
  categorie: string;
};

/** Bảng rỗng — chỉ thêm dòng khi người dùng nói / nhập sản phẩm. */
export function buildInitialRows(): OrderRow[] {
  return [];
}

type SavedState = {
  rows: OrderRow[];
  actionLog: ActionLogEntry[];
  ignoredSegments?: string[];
};

function normalizeActionLog(entries: ActionLogEntry[]): ActionLogEntry[] {
  return entries.map((e, i, arr) => ({
    ...e,
    id: typeof e.id === 'string' ? e.id : `saved-${i}`,
    phase: 'done' as const,
    userText: typeof e.userText === 'string' ? e.userText : '',
    source: e.source === 'text' ? 'text' : 'voice',
    isLatest: i === arr.length - 1,
  }));
}

function loadSavedState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedState;
    if (!Array.isArray(data.rows)) return null;
    const actionLog = normalizeActionLog(
      Array.isArray(data.actionLog) ? (data.actionLog as ActionLogEntry[]) : [],
    );
    return {
      rows: data.rows,
      actionLog,
      ignoredSegments: Array.isArray(data.ignoredSegments) ? data.ignoredSegments : undefined,
    };
  } catch {
    return null;
  }
}

function saveState(rows: OrderRow[], actionLog: ActionLogEntry[], ignoredSegments: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, actionLog, ignoredSegments }));
  } catch {
    /* quota / private mode */
  }
}

function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function findRowByProductUnit(
  rows: OrderRow[],
  productId: string,
  unite: string,
): OrderRow | undefined {
  return rows.find((r) => r.productId === productId && r.unite === unite);
}

function findRowForRemove(
  rows: OrderRow[],
  productId: string,
  unite: string,
): OrderRow | undefined {
  const byUnit = findRowByProductUnit(rows, productId, unite);
  if (byUnit) return byUnit;
  const matches = rows.filter((r) => r.productId === productId);
  if (matches.length === 1) return matches[0];
  return matches.find((r) => r.unite === unite) ?? matches[0];
}

export function applyParsed(rows: OrderRow[], parsed: ParsedOrderMessage, nextId: number): { rows: OrderRow[]; nextId: number } {
  if (parsed.type === 'unknown' || parsed.type === 'ignore') {
    return { rows, nextId };
  }

  if (parsed.type === 'remove') {
    const existing = findRowForRemove(rows, parsed.productId, parsed.unite);
    if (!existing) return { rows, nextId };

    if (parsed.qte === undefined) {
      return {
        rows: rows.filter((r) => r.id !== existing.id),
        nextId,
      };
    }

    const newQte = existing.qte - parsed.qte;
    if (newQte <= 0) {
      return {
        rows: rows.filter((r) => r.id !== existing.id),
        nextId,
      };
    }

    return {
      rows: rows.map((r) => (r.id === existing.id ? { ...r, qte: newQte } : r)),
      nextId,
    };
  }

  if (parsed.type === 'replace') {
    const withoutFrom = rows.filter((r) => r.productId !== parsed.fromProductId);
    const existingTo = findRowByProductUnit(withoutFrom, parsed.productId, parsed.unite);
    if (existingTo) {
      return {
        rows: withoutFrom.map((r) =>
          r.id === existingTo.id ? { ...r, qte: parsed.qte, unite: parsed.unite } : r,
        ),
        nextId,
      };
    }
    const newRow: OrderRow = {
      id: nextId,
      productId: parsed.productId,
      produit: parsed.produit,
      emoji: parsed.emoji,
      categorie: parsed.categorie,
      qte: parsed.qte,
      unite: parsed.unite,
      avatar: parsed.avatar,
    };
    return { rows: [newRow, ...withoutFrom], nextId: nextId + 1 };
  }

  if (parsed.type === 'correct') {
    const existing = findRowByProductUnit(rows, parsed.productId, parsed.unite);
    if (existing) {
      return {
        rows: rows.map((r) =>
          r.id === existing.id ? { ...r, qte: parsed.qte, unite: parsed.unite } : r,
        ),
        nextId,
      };
    }
    const meta = products.find((p) => p.id === parsed.productId);
    if (!meta) return { rows, nextId };
    return {
      rows: [
        {
          id: nextId,
          productId: parsed.productId,
          produit: meta.produit,
          emoji: meta.emoji,
          categorie: meta.categorie,
          qte: parsed.qte,
          unite: parsed.unite,
          avatar: meta.avatar,
        },
        ...rows,
      ],
      nextId: nextId + 1,
    };
  }

  if (parsed.type === 'add') {
    const existing = findRowByProductUnit(rows, parsed.productId, parsed.unite);
    if (existing) {
      return {
        rows: rows.map((r) =>
          r.id === existing.id ? { ...r, qte: r.qte + parsed.qte } : r,
        ),
        nextId,
      };
    }
    const newRow: OrderRow = {
      id: nextId,
      productId: parsed.productId,
      produit: parsed.produit,
      emoji: parsed.emoji,
      categorie: parsed.categorie,
      qte: parsed.qte,
      unite: parsed.unite,
      avatar: parsed.avatar,
    };
    return { rows: [newRow, ...rows], nextId: nextId + 1 };
  }

  return { rows, nextId };
}

function clearActionTimers(timers: Map<string, number[]>) {
  for (const ids of timers.values()) {
    for (const id of ids) window.clearTimeout(id);
  }
  timers.clear();
}

function toLogEntry(
  parsed: ParsedOrderMessage,
  userText: string,
  source: 'voice' | 'text',
  id: string,
): ActionLogEntry | null {
  const base = {
    id,
    userText,
    source,
    time: formatTime(),
    isLatest: true,
    phase: 'pending' as const,
  };
  if (parsed.type === 'unknown') return null;
  if (parsed.type === 'ignore') {
    return { type: 'ignore', label: parsed.logLabel, ...base };
  }
  if (parsed.type === 'remove') {
    return {
      type: 'remove',
      product: parsed.produit,
      qte: parsed.qte,
      unite: parsed.unite,
      ...base,
    };
  }
  if (parsed.type === 'replace') {
    return {
      type: 'replace',
      product: parsed.produit,
      fromProduct: parsed.fromProduit,
      qte: parsed.qte,
      unite: parsed.unite,
      ...base,
    };
  }
  if (parsed.type === 'correct') {
    return {
      type: 'correct',
      product: parsed.produit,
      qte: parsed.qte,
      oldQte: parsed.oldQte,
      unite: parsed.unite,
      ...base,
    };
  }
  return {
    type: 'add',
    product: parsed.produit,
    qte: parsed.qte,
    unite: parsed.unite,
    ...base,
  };
}

function rowsToLines(rows: OrderRow[]): OrderLine[] {
  return rows
    .filter((r) => r.qte > 0)
    .map((r) => ({
      produit: r.produit,
      qte: r.qte,
      unite: r.unite,
      categorie: r.categorie,
    }));
}

export function useOrderState() {
  const initialRows = buildInitialRows();
  const saved = loadSavedState();

  const [rows, setRows] = useState<OrderRow[]>(saved?.rows ?? initialRows);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>(saved?.actionLog ?? []);
  const [lastValidated, setLastValidated] = useState<OrderLine[] | null>(null);
  const [admin, setAdmin] = useState<AdminFields>(() => buildInitialAdmin());
  const [ignoredSegments, setIgnoredSegments] = useState<string[]>(saved?.ignoredSegments ?? []);
  const [reprompt, setReprompt] = useState<RepromptState>(EMPTY_REPROMPT);
  const [status, setStatus] = useState<OrderStatus>('draft');
  const [orderId, setOrderId] = useState(() => newOrderId());
  const nextIdRef = useRef(
    (saved?.rows?.length ?? 0) > 0
      ? Math.max(...(saved?.rows ?? []).map((r) => r.id)) + 1
      : 1,
  );
  const orderIdRef = useRef(orderId);
  const processedChunksRef = useRef<Set<string>>(new Set());
  const appliedFingerprintsRef = useRef<Set<string>>(new Set());
  const lastVoiceProductRef = useRef<ProductKeyword | null>(null);
  const preferredLangRef = useRef<Lang>('fr');
  const repromptRef = useRef<RepromptState>(EMPTY_REPROMPT);
  const actionTimersRef = useRef<Map<string, number[]>>(new Map());
  /** Créneau = đồng hồ thực cho đến khi người dùng / parser đặt khác (matin, sáng…). */
  const creneauAutoRef = useRef(true);
  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  useEffect(() => () => clearActionTimers(actionTimersRef.current), []);

  useEffect(() => {
    repromptRef.current = reprompt;
  }, [reprompt]);

  useEffect(() => {
    saveState(rows, actionLog, ignoredSegments);
  }, [rows, actionLog, ignoredSegments]);

  /** Cập nhật créneau theo giờ hiện tại mỗi phút khi chưa chỉnh thủ công. */
  useEffect(() => {
    const tick = () => {
      if (!creneauAutoRef.current) return;
      const next = formatDefaultCreneau();
      setAdmin((prev) => (prev.creneau_livraison === next ? prev : { ...prev, creneau_livraison: next }));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const pushLog = useCallback((entry: ActionLogEntry) => {
    setActionLog((prev) => {
      const next = [
        ...prev.map((e) => ({ ...e, isLatest: false })),
        entry,
      ];
      return next.length > maxActionLog ? next.slice(-maxActionLog) : next;
    });
  }, []);

  const applyParsedResult = useCallback(
    (parsed: ParsedOrderMessage, userText: string, source: 'voice' | 'text'): boolean => {
      if (parsed.type === 'unknown') return false;

      if (source === 'voice') {
        const fp = parsedFingerprint(parsed);
        if (fp) {
          if (appliedFingerprintsRef.current.has(fp)) return false;
          appliedFingerprintsRef.current.add(fp);
        }
      }

      const actionId = newActionId();
      const entry = toLogEntry(parsed, userText, source, actionId);
      if (!entry) return false;
      pushLog(entry);

      const applyRows = () => {
        if (parsed.type === 'ignore') return;

        setRows((prev) => {
          const result = applyParsed(prev, parsed, nextIdRef.current);
          nextIdRef.current = result.nextId;
          return result.rows;
        });

        if (source === 'voice') {
          const pid =
            parsed.type === 'replace'
              ? parsed.productId
              : parsed.type === 'remove' ||
                  parsed.type === 'add' ||
                  parsed.type === 'correct'
                ? parsed.productId
                : null;
          if (pid) {
            const meta = products.find((p) => p.id === pid);
            if (meta) lastVoiceProductRef.current = meta;
          }
        }
      };

      const markDone = () => {
        setActionLog((prev) =>
          prev.map((e) => (e.id === actionId ? { ...e, phase: 'done' as const } : e)),
        );
        actionTimersRef.current.delete(actionId);
      };

      const tApply = window.setTimeout(applyRows, ACTION_SPIN_MS);
      const tDone = window.setTimeout(markDone, ACTION_SPIN_MS + ACTION_CHECK_MS);
      actionTimersRef.current.set(actionId, [tApply, tDone]);

      return true;
    },
    [pushLog],
  );

  const clearSpeechCache = useCallback(() => {
    processedChunksRef.current.clear();
    appliedFingerprintsRef.current.clear();
    lastVoiceProductRef.current = null;
  }, []);

  const setPreferredLang = useCallback((lang: Lang) => {
    preferredLangRef.current = lang;
  }, []);

  /** Trích admin + items + ignored + reprompt (parser Phase 1). */
  const applyParseOrder = useCallback(
    (text: string, source: 'voice' | 'text' = 'voice', options?: { skipItems?: boolean }): boolean => {
      const { order } = parseOrder(text, {
        source,
        alreadyAsked: repromptRef.current.already_asked,
      });
      let changed = false;

      setAdmin((prev) => {
        const next = { ...prev };
        let adminChanged = false;
        (['client', 'site', 'date_livraison', 'creneau_livraison'] as const).forEach((field) => {
          if (order[field] && order[field] !== prev[field]) {
            next[field] = order[field];
            adminChanged = true;
            if (field === 'creneau_livraison') creneauAutoRef.current = false;
          }
        });
        if (adminChanged) changed = true;
        return adminChanged ? next : prev;
      });

      if (!options?.skipItems && order.items.length > 0) {
        setRows((prev) => {
          const result = applyParsedItemsToRows(prev, order.items, nextIdRef.current);
          if (result.rows !== prev) changed = true;
          nextIdRef.current = result.nextId;
          return result.rows;
        });
      }

      if (order.ignored_segments.length > 0) {
        setIgnoredSegments((prev) => {
          const merged = [...prev];
          for (const seg of order.ignored_segments) {
            if (!merged.includes(seg)) merged.push(seg);
          }
          if (merged.length !== prev.length) changed = true;
          return merged.length !== prev.length ? merged : prev;
        });
      }

      if (source === 'voice' && order.reprompt.required && order.reprompt.reason) {
        setReprompt(order.reprompt);
      }

      return changed;
    },
    [],
  );

  const validateOrder = useCallback((): OrderLine[] => {
    const lignes = rowsToLines(rows);
    setLastValidated(lignes);
    setStatus('validated');
    setReprompt(EMPTY_REPROMPT);
    return lignes;
  }, [rows]);

  const reopenOrder = useCallback(() => {
    setStatus('reopened');
  }, []);

  const resetToInitial = useCallback(() => {
    clearActionTimers(actionTimersRef.current);
    const fresh = buildInitialRows();
    setRows(fresh);
    setActionLog([]);
    setLastValidated(null);
    creneauAutoRef.current = true;
    setAdmin(buildInitialAdmin());
    setIgnoredSegments([]);
    setReprompt(EMPTY_REPROMPT);
    setStatus('draft');
    setOrderId(newOrderId());
    nextIdRef.current = 1;
    processedChunksRef.current.clear();
    appliedFingerprintsRef.current.clear();
    lastVoiceProductRef.current = null;
    clearSavedState();
  }, []);

  const buildBonSnapshot = useCallback((): BonDeCommandeSnapshot | null => {
    const active = rows.filter((r) => r.qte > 0);
    if (active.length === 0) return null;

    const form = buildOrderForm(
      admin,
      active.map((r) => ({
        product: r.produit,
        quantity: r.qte,
        unit: unitToContract(r.unite),
      })),
      { date_commande: formatDateCommande() },
    );

    return { form, orderId };
  }, [rows, admin, orderId]);

  /** Valider / thanh toán: mở hóa đơn rồi reset app về trống. */
  const submitOrder = useCallback((): boolean => {
    const snapshot = buildBonSnapshot();
    if (!snapshot) return false;

    setLastValidated(rowsToLines(rows));
    clearSavedState();
    navigateToBonDeCommandePage(snapshot);
    return true;
  }, [buildBonSnapshot, rows]);

  const handleMessage = useCallback(
    (text: string, preferredLang?: Lang, source: 'voice' | 'text' = 'voice'): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      if (source === 'voice') {
        setReprompt(EMPTY_REPROMPT);
      }

      let understood = false;

      if (isValidateIntent(trimmed)) {
        const submitted = submitOrder();
        if (source === 'voice') {
          processedChunksRef.current.clear();
          appliedFingerprintsRef.current.clear();
        }
        return submitted;
      }
      if (REOPEN_RE.test(trimmed)) {
        reopenOrder();
        if (source === 'voice') {
          processedChunksRef.current.clear();
          appliedFingerprintsRef.current.clear();
        }
        return true;
      }

      const lang = preferredLang ?? preferredLangRef.current;
      let matched = false;
      const voiceNoisyFull = source === 'voice' && isNoisyInput(trimmed);

      const applyList = (hits: ReturnType<typeof parseOrderHits>) => {
        for (const { parsed, sourceText } of hits) {
          if (applyParsedResult(parsed, sourceText, source)) matched = true;
        }
      };

      const processChunk = (chunk: string) => {
        if (source === 'voice' && isNoisyInput(chunk)) return;
        const sig = chunkSignature(chunk);
        if (processedChunksRef.current.has(sig)) return;
        applyList(
          parseOrderHits(chunk, lang, {
            source,
            lastProduct: source === 'voice' ? lastVoiceProductRef.current : null,
          }),
        );
        processedChunksRef.current.add(sig);
      };

      if (!voiceNoisyFull) {
        processChunk(trimmed);
      }

      const subChunks = splitIntoKeyChunks(trimmed);
      for (const chunk of subChunks) {
        processChunk(chunk);
      }

      // Phase 1 parser: admin + reprompt (luôn chạy; items có thể skip khi đã khớp voice)
      let parseChanged = false;
      if (!voiceNoisyFull) {
        if (applyParseOrder(trimmed, source, { skipItems: matched })) parseChanged = true;
        const fullSig = chunkSignature(trimmed);
        for (const chunk of subChunks) {
          if (chunkSignature(chunk) === fullSig) continue;
          if (
            applyParseOrder(chunk, source, {
              skipItems: true,
            })
          ) {
            parseChanged = true;
          }
        }
      }

      if (matched) {
        setStatus((s) => (s === 'validated' ? 'reopened' : s));
        setReprompt(EMPTY_REPROMPT);
        understood = true;
      } else if (parseChanged) {
        understood = true;
      }

      return understood;
    },
    [applyParseOrder, applyParsedResult, submitOrder, reopenOrder],
  );

  const setAdminField = useCallback((field: AdminFieldKey, value: string) => {
    if (field === 'creneau_livraison') creneauAutoRef.current = false;
    setAdmin((prev) => ({ ...prev, [field]: value }));
  }, []);

  const dismissReprompt = useCallback(() => {
    setReprompt((prev) => ({ ...prev, required: false, already_asked: true }));
  }, []);

  const setQty = useCallback((id: number, qte: number) => {
    if (qte <= 0) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qte } : r)));
  }, []);

  const removeRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getParsedOrder = useCallback(
    (source: 'voice' | 'text' = 'voice') =>
      buildParsedOrderFromState(rows, admin, status, ignoredSegments, reprompt, {
        orderId,
        source,
      }),
    [rows, admin, status, ignoredSegments, reprompt, orderId],
  );

  const getOrderForm = useCallback(() => {
    const parsed = getParsedOrder();
    return buildOrderForm(admin, parsed.items.map((i) => ({
      product: i.product,
      quantity: i.quantity,
      unit: i.unit,
    })), { date_commande: formatDateCommande() });
  }, [admin, getParsedOrder]);

  const getJsonContract = useCallback(
    (source: 'voice' | 'text' = 'voice') => toJsonContract(getParsedOrder(source)),
    [getParsedOrder],
  );

  return {
    rows,
    actionLog,
    lastValidated,
    admin,
    ignoredSegments,
    reprompt,
    status,
    orderId,
    handleMessage,
    clearSpeechCache,
    setPreferredLang,
    setQty,
    removeRow,
    setAdminField,
    dismissReprompt,
    reset: resetToInitial,
    validateOrder,
    submitOrder,
    reopenOrder,
    getOrderForm,
    getJsonContract,
  };
}

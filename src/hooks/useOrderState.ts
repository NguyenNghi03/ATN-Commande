import { useCallback, useRef, useState } from 'react';
import { products } from '../data/keywords';
import {
  formatTime,
  parseOrderMessages,
  parsedFingerprint,
} from '../lib/parseOrderMessage';
import type { ActionLogEntry, OrderRow, ParsedOrderMessage } from '../types/order';

const INITIAL_ROWS: OrderRow[] = [
  { id: 1, productId: 'tomates',  produit: 'Tomates',  emoji: '🍅', categorie: 'Produit frais', qte: 200, unite: 'kg',      avatar: 'bg-rose-50 ring-rose-300' },
  { id: 2, productId: 'carottes', produit: 'Carottes', emoji: '🥕', categorie: 'Produit frais', qte: 300, unite: 'kg',      avatar: 'bg-orange-50 ring-orange-300' },
  { id: 3, productId: 'salades',  produit: 'Salades',  emoji: '🥬', categorie: 'Produit frais', qte: 150, unite: 'cagette', avatar: 'bg-emerald-50 ring-emerald-300' },
  { id: 4, productId: 'oranges',  produit: 'Oranges',  emoji: '🍊', categorie: 'Produit frais', qte: 80,  unite: 'colis',   avatar: 'bg-amber-50 ring-amber-300' },
];

const INITIAL_LOG: ActionLogEntry[] = [
  { type: 'add',     product: 'Tomates',  label: ' ajoutées — 200 kg',                             time: '09:41', isLatest: false },
  { type: 'add',     product: 'Carottes', label: ' ajoutées — 300 kg',                            time: '09:42', isLatest: false },
  { type: 'correct', product: 'Salades',  label: ' — quantité corrigée\u00a0: 100 → 150 cagettes', time: '09:43', isLatest: false },
  { type: 'ignore',  label: '«\u00a0bonjour\u00a0», «\u00a0attends deux secondes\u00a0»', time: '09:43', isLatest: false },
  { type: 'add',     product: 'Salades',  label: ' ajoutées — 150 cagettes',                       time: '09:44', isLatest: true  },
];

function applyParsed(rows: OrderRow[], parsed: ParsedOrderMessage, nextId: number): { rows: OrderRow[]; nextId: number } {
  if (parsed.type === 'unknown' || parsed.type === 'ignore') {
    return { rows, nextId };
  }

  const existing = rows.find((r) => r.productId === parsed.productId);

  if (parsed.type === 'remove') {
    return { rows: rows.filter((r) => r.productId !== parsed.productId), nextId };
  }

  if (parsed.type === 'correct') {
    if (existing) {
      return {
        rows: rows.map((r) =>
          r.productId === parsed.productId ? { ...r, qte: parsed.qte, unite: parsed.unite } : r,
        ),
        nextId,
      };
    }
    const meta = products.find((p) => p.id === parsed.productId);
    if (!meta) return { rows, nextId };
    return {
      rows: [
        ...rows,
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
      ],
      nextId: nextId + 1,
    };
  }

  if (parsed.type === 'add') {
    if (existing) {
      return {
        rows: rows.map((r) =>
          r.productId === parsed.productId
            ? { ...r, qte: parsed.qte, unite: parsed.unite }
            : r,
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
    return { rows: [...rows, newRow], nextId: nextId + 1 };
  }

  return { rows, nextId };
}

function toLogEntry(parsed: ParsedOrderMessage): ActionLogEntry | null {
  if (parsed.type === 'unknown') return null;
  if (parsed.type === 'ignore') {
    return { type: 'ignore', label: parsed.logLabel, time: formatTime(), isLatest: true };
  }
  return {
    type: parsed.type,
    product: parsed.produit,
    label: parsed.logLabel,
    time: formatTime(),
    isLatest: true,
  };
}

export function useOrderState() {
  const [rows, setRows] = useState<OrderRow[]>(INITIAL_ROWS);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>(INITIAL_LOG);
  const nextIdRef = useRef(INITIAL_ROWS.length + 1);
  const lastFingerprintRef = useRef('');
  const lastProcessedAtRef = useRef(0);

  const pushLog = useCallback((entry: ActionLogEntry) => {
    setActionLog((prev) => [
      ...prev.map((e) => ({ ...e, isLatest: false })),
      entry,
    ]);
  }, []);

  const applyParsedResult = useCallback(
    (parsed: ParsedOrderMessage): boolean => {
      if (parsed.type === 'unknown') return false;

      const fingerprint = parsedFingerprint(parsed);
      const now = Date.now();
      if (
        fingerprint &&
        fingerprint === lastFingerprintRef.current &&
        now - lastProcessedAtRef.current < 4000
      ) {
        return true;
      }

      if (parsed.type !== 'ignore') {
        setRows((prev) => {
          const result = applyParsed(prev, parsed, nextIdRef.current);
          nextIdRef.current = result.nextId;
          return result.rows;
        });
      }

      const entry = toLogEntry(parsed);
      if (entry) pushLog(entry);

      if (fingerprint) {
        lastFingerprintRef.current = fingerprint;
        lastProcessedAtRef.current = now;
      }
      return true;
    },
    [pushLog],
  );

  const handleMessage = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const parsedList = parseOrderMessages(trimmed);
      if (parsedList.length === 0) return false;
      let matched = false;
      for (const parsed of parsedList) {
        if (applyParsedResult(parsed)) matched = true;
      }
      return matched;
    },
    [applyParsedResult],
  );

  const setQty = useCallback((id: number, qte: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qte } : r)));
  }, []);

  const removeRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const reset = useCallback(() => {
    setRows([]);
    setActionLog([]);
    nextIdRef.current = 1;
    lastFingerprintRef.current = '';
    lastProcessedAtRef.current = 0;
  }, []);

  return { rows, actionLog, handleMessage, setQty, removeRow, reset };
}

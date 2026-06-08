import {
  actions,
  allActionKeywords,
  allIgnoreKeywords,
  allProductKeywords,
  allUnitKeywords,
  matchThreshold,
  type Lang,
  type ProductKeyword,
} from '../data/keywords';
import { matchKeywordInText } from './fuzzyMatch';
import type { ParsedOrderMessage } from '../types/order';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[«»""'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(raw: string): number {
  return Math.round(parseFloat(raw.replace(',', '.')) * 100) / 100;
}

const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  quinze: 15,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  cent: 100,
  cents: 100,
  mille: 1000,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
  tram: 100,
  nghin: 1000,
};

function extractSpokenQuantity(text: string): number | null {
  const n = normalize(text);

  const digitMatches = [...n.matchAll(/(\d+(?:[.,]\d+)?)/g)];
  if (digitMatches.length > 0) {
    return parseNumber(digitMatches[digitMatches.length - 1][1]);
  }

  const compound = n.match(
    /\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|trente|quarante|cinquante|soixante|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s+(cent|cents|tram)\b/,
  );
  if (compound) {
    return WORD_NUMBERS[compound[1]] * 100;
  }

  const centOnly = n.match(/\b(cent|cents|tram)\b/);
  if (centOnly) return 100;

  const single = n.match(
    /\b(zero|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante|cinquante|soixante|mille|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi|nghin)\b/,
  );
  if (single && WORD_NUMBERS[single[1]] !== undefined) {
    return WORD_NUMBERS[single[1]];
  }

  return null;
}

function detectLang(text: string): Lang {
  const n = normalize(text);
  const viHints = [
    'them', 'can', 'cho', 'sua', 'chinh', 'xin chao', 'cam on', 'cai chua', 'ca rot',
    'cà chua', 'cà rốt', 'chuối', 'thêm', 'đặt', 'kilo', 'kilô', 'tram', 'trăm',
  ];
  const enHints = ['add', 'order', 'need', 'correct', 'change', 'hello', 'tomato', 'carrot'];
  if (viHints.some((h) => n.includes(h))) return 'vi';
  if (enHints.some((h) => n.includes(h))) return 'en';
  return 'fr';
}

function findProduct(text: string): ProductKeyword | null {
  const n = normalize(text);
  let fuzzyBest: { product: ProductKeyword; score: number; keywordLen: number } | null = null;

  for (const { product, keyword } of allProductKeywords()) {
    const nk = normalize(keyword);
    if (nk.length < 3) continue;

    const escaped = nk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\s)${escaped}(?:s|es)?(?:\\s|$)|${escaped}(?:s|es)?(?:\\s|$)`, 'i');
    if (re.test(n) || (nk.length >= 4 && n.includes(nk))) return product;

    if (matchThreshold > 0) {
      const score = matchKeywordInText(n, nk, matchThreshold);
      if (
        score !== null &&
        (!fuzzyBest ||
          score > fuzzyBest.score ||
          (score === fuzzyBest.score && nk.length > fuzzyBest.keywordLen))
      ) {
        fuzzyBest = { product, score, keywordLen: nk.length };
      }
    }
  }

  return fuzzyBest?.product ?? null;
}

function findUnit(text: string, fallback: string): string {
  const n = normalize(text);
  let fuzzyBest: { unite: string; score: number; keywordLen: number } | null = null;

  for (const { unite, keyword } of allUnitKeywords()) {
    const nk = normalize(keyword);
    if (nk.length < 2) continue;

    const escaped = nk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\s)${escaped}(?:s|es)?(?:\\s|$)`, 'i');
    if (re.test(n)) return unite;

    if (matchThreshold > 0 && nk.length >= 3) {
      const score = matchKeywordInText(n, nk, matchThreshold);
      if (
        score !== null &&
        (!fuzzyBest ||
          score > fuzzyBest.score ||
          (score === fuzzyBest.score && nk.length > fuzzyBest.keywordLen))
      ) {
        fuzzyBest = { unite, score, keywordLen: nk.length };
      }
    }
  }

  return fuzzyBest?.unite ?? fallback;
}

function detectActionType(text: string): 'add' | 'correct' | 'remove' | 'ignore' | null {
  const n = normalize(text);
  for (const { type, keyword } of allActionKeywords()) {
    if (n.includes(normalize(keyword))) return type;
  }
  return null;
}

function extractCorrection(text: string): { oldQte: number; qte: number } | null {
  const patterns = [
    /(\d+)\s*(?:→|->|vers|to|thanh)\s*(\d+)/i,
    /:\s*(\d+)\s*(?:→|->|vers|to|thanh)\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return { oldQte: parseNumber(m[1]), qte: parseNumber(m[2]) };
  }
  return null;
}

function matchIgnoreOnly(text: string): string[] | null {
  const n = normalize(text);
  const matched: string[] = [];
  for (const kw of allIgnoreKeywords()) {
    const nk = normalize(kw);
    if (n === nk || n.includes(nk)) matched.push(kw);
  }
  if (matched.length === 0) return null;
  const product = findProduct(text);
  const hasQty = extractSpokenQuantity(text) !== null;
  if (!product && !hasQty) return matched;
  return null;
}

function formatLogLabel(
  type: 'add' | 'correct' | 'remove',
  lang: Lang,
  vars: { qte?: number; oldQte?: number; unite?: string },
): string {
  const action = actions.find((a) => a.type === type);
  if (!action) return '';
  let label = action.logLabel[lang] || action.logLabel.fr;
  if (vars.oldQte !== undefined) label = label.replace('{oldQte}', String(vars.oldQte));
  if (vars.qte !== undefined) label = label.replace('{qte}', String(vars.qte));
  if (vars.unite !== undefined) label = label.replace('{unite}', vars.unite);
  return label;
}

function parseSingleMessage(rawText: string): ParsedOrderMessage {
  const text = rawText.trim();
  if (!text) return { type: 'unknown' };

  const lang = detectLang(text);
  const ignoreMatch = matchIgnoreOnly(text);
  if (ignoreMatch) {
    const quoted = ignoreMatch.map((s) => `«\u00a0${s}\u00a0»`).join(', ');
    return { type: 'ignore', segments: ignoreMatch, logLabel: quoted };
  }

  const product = findProduct(text);
  if (!product) return { type: 'unknown' };

  const actionType = detectActionType(text);
  const correction = extractCorrection(text);
  const qte = correction?.qte ?? extractSpokenQuantity(text);
  const unite = findUnit(text, product.defaultUnite);

  if (actionType === 'remove') {
    return {
      type: 'remove',
      productId: product.id,
      produit: product.produit,
      logLabel: formatLogLabel('remove', lang, {}),
    };
  }

  if (actionType === 'correct' || correction) {
    if (qte === null) return { type: 'unknown' };
    return {
      type: 'correct',
      productId: product.id,
      produit: product.produit,
      qte,
      oldQte: correction?.oldQte,
      unite,
      logLabel: formatLogLabel('correct', lang, {
        qte,
        oldQte: correction?.oldQte,
        unite,
      }),
    };
  }

  const resolvedQte = qte ?? (actionType === 'add' ? 1 : null);

  if (resolvedQte !== null) {
    const resolvedAction = actionType === 'ignore' ? 'add' : actionType ?? 'add';
    if (resolvedAction === 'add') {
      return {
        type: 'add',
        productId: product.id,
        produit: product.produit,
        qte: resolvedQte,
        unite,
        emoji: product.emoji,
        categorie: product.categorie,
        avatar: product.avatar,
        logLabel: formatLogLabel('add', lang, { qte: resolvedQte, unite }),
      };
    }
  }

  return { type: 'unknown' };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectParsed(parsed: ParsedOrderMessage, bucket: ParsedOrderMessage[], seen: Set<string>) {
  if (parsed.type === 'unknown') return;
  const fp = parsedFingerprint(parsed);
  if (!fp || seen.has(fp)) return;
  seen.add(fp);
  bucket.push(parsed);
}

function splitSegments(text: string): string[] {
  return text
    .split(/\s*(?:[,;]|\.|\bet\b|\bpuis\b|\b aussi\b)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/** Tìm lệnh trong câu dài / transcript vocal (thử cả câu, từng đoạn, ghép 2 đoạn liền kề). */
export function parseOrderMessage(rawText: string): ParsedOrderMessage {
  const all = parseOrderMessages(rawText);
  return all[0] ?? { type: 'unknown' };
}

/** Quét mọi cụm từ khóa sản phẩm trong transcript (giọng nói / text dài). */
export function parseOrderMessages(rawText: string): ParsedOrderMessage[] {
  const text = rawText.trim();
  if (!text) return [];

  const found: ParsedOrderMessage[] = [];
  const seen = new Set<string>();

  collectParsed(parseSingleMessage(text), found, seen);

  const segments = splitSegments(text);
  for (const segment of segments) {
    collectParsed(parseSingleMessage(segment), found, seen);
  }

  for (let i = 0; i < segments.length - 1; i++) {
    collectParsed(parseSingleMessage(`${segments[i]} ${segments[i + 1]}`), found, seen);
  }

  for (const { keyword } of allProductKeywords()) {
    const regex = new RegExp(escapeRegex(keyword), 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 35);
      const end = Math.min(text.length, match.index + keyword.length + 35);
      collectParsed(parseSingleMessage(text.slice(start, end)), found, seen);
    }
  }

  return found;
}

export function parsedFingerprint(parsed: ParsedOrderMessage): string | null {
  if (parsed.type === 'unknown') return null;
  if (parsed.type === 'ignore') return `ignore:${parsed.logLabel}`;
  if (parsed.type === 'remove') return `remove:${parsed.productId}`;
  return `${parsed.type}:${parsed.productId}:${parsed.qte}:${parsed.unite}`;
}

export function formatTime(date = new Date()): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export { matchThreshold };

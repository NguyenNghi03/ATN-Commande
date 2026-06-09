import {
  actions,
  allActionKeywords,
  allIgnoreKeywords,
  allProductKeywords,
  allUnitKeywords,
  fuzzyConfig,
  fuzzySearchMaxDistance,
  matchThreshold,
  type Lang,
  type ProductKeyword,
} from '../data/keywords';
import { matchKeywordInText } from './fuzzyMatch';
import { validateBestMatch, type FuzzyMatchCandidate } from './voicePipeline';
import type { ActionLogEntry, ParsedOrderMessage } from '../types/order';

import {
  chunkSignature,
  matchesKeywordAtStart,
  matchesKeywordBoundary,
  splitIntoKeyChunks,
} from './splitKeyChunks';
import { isValidateIntent } from './orderValidate';

export {
  chunkSignature,
  matchesKeywordAtStart,
  matchesKeywordBoundary,
  splitIntoKeyChunks,
} from './splitKeyChunks';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
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

function detectLang(text: string, preferred?: Lang): Lang {
  const n = normalize(text);
  const viHints = [
    'them', 'can', 'cho', 'sua', 'chinh', 'xin chao', 'cam on', 'cai chua', 'ca rot',
    'cà chua', 'cà rốt', 'chuối', 'thêm', 'đặt', 'kilo', 'kilô', 'tram', 'trăm',
  ];
  const enHints = ['add', 'order', 'need', 'correct', 'change', 'hello', 'tomato', 'carrot'];
  const frHints = ['ajoute', 'ajouté', 'kilos', 'kilogramme', 'bonjour', 'carotte', 'tomate'];
  if (viHints.some((h) => n.includes(h))) return 'vi';
  if (enHints.some((h) => n.includes(h))) return 'en';
  if (frHints.some((h) => n.includes(h))) return 'fr';
  return preferred ?? 'fr';
}

function rankProductMatches(
  text: string,
  preferredLang?: Lang,
): FuzzyMatchCandidate<ProductKeyword>[] {
  const n = stripActionKeywordsForProductMatch(normalize(text));
  if (!n) return [];
  const byProduct = new Map<string, FuzzyMatchCandidate<ProductKeyword>>();

  for (const { product, keyword } of allProductKeywords(preferredLang)) {
    const nk = normalize(keyword);
    if (nk.length < 3) continue;

    const escaped = nk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\s)${escaped}(?:s|es)?(?:\\s|$)|${escaped}(?:s|es)?(?:\\s|$)`, 'i');
    let score: number | null = null;

    if (re.test(n) || (nk.length >= 4 && n.includes(nk))) {
      score = 1;
    } else if (fuzzySearchMaxDistance > 0) {
      score = matchKeywordInText(n, nk, fuzzySearchMaxDistance);
    }

    if (score === null) continue;

    const existing = byProduct.get(product.id);
    if (
      !existing ||
      score > existing.score ||
      (score === existing.score && nk.length > existing.keywordLen)
    ) {
      byProduct.set(product.id, { item: product, score, keywordLen: nk.length });
    }
  }

  return [...byProduct.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.keywordLen - a.keywordLen;
  });
}

function findProduct(text: string, preferredLang?: Lang): ProductKeyword | null {
  const ranked = rankProductMatches(text, preferredLang);
  const best = ranked[0] ?? null;
  if (!best || best.score < fuzzyConfig.autoMatchThreshold) return null;

  const tied = ranked.filter((r) => r.score === best.score);
  if (tied.length > 1) {
    tied.sort((a, b) => b.keywordLen - a.keywordLen);
    const winner = tied[0];
    const runnerUp = tied[1];
    if (winner.keywordLen > runnerUp.keywordLen) return winner.item;
  }

  const secondBest = ranked.find((r) => r.item.id !== best.item.id) ?? null;
  if (!validateBestMatch(best, secondBest)) return null;
  return best.item;
}

function findUnit(text: string, fallback: string, preferredLang?: Lang): string {
  const n = normalize(text);
  let fuzzyBest: { unite: string; score: number; keywordLen: number } | null = null;

  for (const { unite, keyword } of allUnitKeywords(preferredLang)) {
    const nk = normalize(keyword);
    if (nk.length < 2) continue;

    const escaped = nk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\s)${escaped}(?:s|es)?(?:\\s|$)`, 'i');
    if (re.test(n)) return unite;

    if (matchThreshold > 0 && nk.length >= 3) {
      const score = matchKeywordInText(n, nk, fuzzySearchMaxDistance);
      if (
        score !== null &&
        score >= fuzzyConfig.autoMatchThreshold &&
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

type OrderActionType = 'add' | 'correct' | 'remove' | 'replace' | 'ignore';

const EXCLUSIVE_ACTION_TYPES: OrderActionType[] = ['remove', 'replace', 'correct'];

const ACTION_PRIORITY: OrderActionType[] = ['remove', 'replace', 'correct', 'ignore', 'add'];

type CachedActionKeyword = { type: OrderActionType; normalized: string };

let cachedActionKeywords: CachedActionKeyword[] | null = null;

function getActionKeywordsByPriority(): CachedActionKeyword[] {
  if (cachedActionKeywords) return cachedActionKeywords;

  const buckets: Record<OrderActionType, string[]> = {
    add: [],
    correct: [],
    remove: [],
    replace: [],
    ignore: [],
  };

  for (const { type, keyword } of allActionKeywords()) {
    buckets[type].push(normalize(keyword));
  }

  const list: CachedActionKeyword[] = [];
  for (const type of ACTION_PRIORITY) {
    const unique = [...new Set(buckets[type])].sort((a, b) => b.length - a.length);
    for (const normalized of unique) {
      if (normalized) list.push({ type, normalized });
    }
  }

  cachedActionKeywords = list;
  return list;
}

function detectActionType(text: string): OrderActionType | null {
  const n = normalize(text);
  for (const { type, normalized } of getActionKeywordsByPriority()) {
    if (matchesKeywordBoundary(n, normalized)) return type;
  }
  return null;
}

/** Loại từ khóa hành động trước khi khớp sản phẩm (tránh « them » ≈ « thom »). */
function stripActionKeywordsForProductMatch(normalized: string): string {
  let n = normalized;
  const seen = new Set<string>();
  for (const { normalized: kw } of getActionKeywordsByPriority()) {
    if (!kw || seen.has(kw)) continue;
    seen.add(kw);
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    n = n.replace(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'gi'), ' ');
  }
  return n.replace(/\s+/g, ' ').trim();
}

function isBareActionClause(clause: string): boolean {
  const n = normalize(clause);
  const lead = findLeadActionKeyword(n);
  return lead !== null && n === lead;
}

/** Từ khóa hành động dài nhất ở đầu cụm (kế thừa khi tách « mot X mot Y »). */
function findLeadActionKeyword(text: string): string | null {
  const n = normalize(text);
  let best: string | null = null;
  for (const { normalized } of getActionKeywordsByPriority()) {
    if (!matchesKeywordAtStart(n, normalized)) continue;
    if (!best || normalized.length > best.length) best = normalized;
  }
  return best;
}

/** Cụm con bỏ mất từ khóa hành động (vd. « 2 trai tao » trong « xoa 2 trai tao »). */
function shouldSkipDerivedClause(parent: string, child: string): boolean {
  const parentAction = detectActionType(parent);
  if (!parentAction || !EXCLUSIVE_ACTION_TYPES.includes(parentAction)) return false;
  const childAction = detectActionType(child);
  if (childAction === parentAction) return false;
  return childAction === null || childAction === 'add';
}

/** Voice: cụm chỉ có số lượng + sản phẩm — chờ speechend để tránh emit sớm trước « xoa ». */
export function shouldDeferImplicitVoiceChunk(chunk: string): boolean {
  if (isValidateIntent(chunk)) return false;
  return detectActionType(chunk) === null;
}

const REPLACE_SEP = /\s+(?:thanh|thành|->|→|to|par|en|vers|bang|bằng)\s+/i;
const REPLACE_INTENT_RE =
  /(?:^|\s)(?:doi|đổi|thay|remplacer|echanger|echange|replace|switch|change)(?:\s|$)/i;

/** Câu có ý định thay sản phẩm (đổi X thành Y) — không yêu cầu số lượng. */
export function hasReplaceIntent(text: string): boolean {
  const n = normalize(text);
  if (!REPLACE_INTENT_RE.test(n)) return false;
  if (REPLACE_SEP.test(text) || REPLACE_SEP.test(n)) return true;
  return findAllProducts(text).length >= 2;
}

function productHitIndex(n: string, nk: string): number {
  const escaped = nk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\s)${escaped}(?:s|es)?(?:\\s|$)|${escaped}(?:s|es)?(?:\\s|$)`, 'i');
  const m = re.exec(n);
  if (m) return m.index + (m[0].length > nk.length ? 1 : 0);
  if (nk.length >= 4 && n.includes(nk)) return n.indexOf(nk);
  return -1;
}

function findProductAt(
  text: string,
  pick: 'first' | 'last',
  preferredLang?: Lang,
): ProductKeyword | null {
  const n = stripActionKeywordsForProductMatch(normalize(text));
  if (!n) return null;
  const hits: { product: ProductKeyword; index: number; keywordLen: number }[] = [];

  for (const { product, keyword } of allProductKeywords(preferredLang)) {
    const nk = normalize(keyword);
    if (nk.length < 3) continue;
    const idx = productHitIndex(n, nk);
    if (idx < 0) continue;
    if (hits.some((h) => h.product.id === product.id)) continue;
    hits.push({ product, index: idx, keywordLen: nk.length });
  }

  if (hits.length === 0) return null;
  hits.sort((a, b) =>
    pick === 'first'
      ? a.index - b.index || b.keywordLen - a.keywordLen
      : b.index - a.index || b.keywordLen - a.keywordLen,
  );

  const best = hits[0];
  const contenders = hits.filter((h) => h.index === best.index);
  if (contenders.length > 1) {
    const ranked = rankProductMatches(text, preferredLang);
    const match = ranked.find((r) => r.item.id === contenders[0].product.id);
    const second = ranked[1] ?? null;
    if (!validateBestMatch(match ?? null, second)) return null;
  }

  return best.product;
}

/** Tách lặp lệnh đổi trong transcript STT dài. */
export function splitReplaceClauses(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(/(?=\s*(?:đổi|doi|thay)\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return parts.length > 0 ? parts : [trimmed];
}

function findAllProducts(text: string, preferredLang?: Lang): ProductKeyword[] {
  const n = normalize(text);
  const hits: { product: ProductKeyword; index: number }[] = [];

  for (const { product, keyword } of allProductKeywords(preferredLang)) {
    const nk = normalize(keyword);
    if (nk.length < 3) continue;
    const idx = n.indexOf(nk);
    if (idx < 0) continue;
    if (hits.some((h) => h.product.id === product.id)) continue;
    hits.push({ product, index: idx });
  }

  return hits.sort((a, b) => a.index - b.index).map((h) => h.product);
}

function tryParseReplace(text: string, preferredLang?: Lang): ParsedOrderMessage | null {
  const labelLang = preferredLang ?? detectLang(text);
  const actionType = detectActionType(text);
  if (actionType === 'remove' || actionType === 'add' || actionType === 'ignore') {
    return null;
  }

  const replaceIntent = hasReplaceIntent(text);

  const sep = text.match(REPLACE_SEP);
  if (sep?.index !== undefined) {
    const left = text.slice(0, sep.index);
    const right = text.slice(sep.index + sep[0].length);
    const fromProduct = findProductAt(left, 'last', preferredLang) ?? findProduct(left, preferredLang);
    const toProduct = findProductAt(right, 'first', preferredLang) ?? findProduct(right, preferredLang);

    if (toProduct && fromProduct && fromProduct.id !== toProduct.id) {
      const qte = extractSpokenQuantity(right) ?? extractSpokenQuantity(text) ?? 1;
      const unite = findUnit(right, toProduct.defaultUnite, preferredLang);
      return {
        type: 'replace',
        fromProductId: fromProduct.id,
        fromProduit: fromProduct.produit,
        productId: toProduct.id,
        produit: toProduct.produit,
        qte,
        unite,
        emoji: toProduct.emoji,
        categorie: toProduct.categorie,
        avatar: toProduct.avatar,
        logLabel: formatActionLabel('replace', labelLang, {
          qte,
          unite,
          fromProduit: fromProduct.produit,
        }),
      };
    }
  }

  const products = findAllProducts(text, preferredLang);
  if (
    products.length >= 2 &&
    (actionType === 'replace' || actionType === 'correct' || replaceIntent)
  ) {
    const [fromProduct, toProduct] = products;
    const qte = extractSpokenQuantity(text) ?? 1;
    const unite = findUnit(text, toProduct.defaultUnite, preferredLang);
    return {
      type: 'replace',
      fromProductId: fromProduct.id,
      fromProduit: fromProduct.produit,
      productId: toProduct.id,
      produit: toProduct.produit,
      qte,
      unite,
      emoji: toProduct.emoji,
      categorie: toProduct.categorie,
      avatar: toProduct.avatar,
      logLabel: formatActionLabel('replace', labelLang, {
        qte,
        unite,
        fromProduit: fromProduct.produit,
      }),
    };
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

function matchIgnoreOnly(text: string, preferredLang?: Lang): string[] | null {
  const n = normalize(text);
  const matched: string[] = [];
  for (const kw of allIgnoreKeywords()) {
    const nk = normalize(kw);
    if (n === nk || n.includes(nk)) matched.push(kw);
  }
  if (matched.length === 0) return null;
  const product = findProduct(text, preferredLang);
  const hasQty = extractSpokenQuantity(text) !== null;
  if (!product && !hasQty) return matched;
  return null;
}

export function formatActionLabel(
  type: 'add' | 'correct' | 'remove' | 'replace',
  lang: Lang,
  vars: { qte?: number; oldQte?: number; unite?: string; fromProduit?: string },
): string {
  const action = actions.find((a) => a.type === type);
  if (!action) return '';
  let label = action.logLabel[lang] || action.logLabel.fr;
  if (vars.fromProduit !== undefined) label = label.replace('{fromProduit}', vars.fromProduit);
  if (vars.oldQte !== undefined) label = label.replace('{oldQte}', String(vars.oldQte));
  if (vars.qte !== undefined) label = label.replace('{qte}', String(vars.qte));
  if (vars.unite !== undefined) label = label.replace('{unite}', vars.unite);
  return label;
}

const REMOVE_ALL_LABEL: Record<Lang, string> = {
  fr: ' — supprimées',
  en: ' — removed',
  vi: ' — đã xóa',
};

export type ParseMessageContext = {
  lastProduct?: ProductKeyword | null;
};

function resolveRemoveWithContext(
  parsed: ParsedOrderMessage,
  text: string,
  preferredLang?: Lang,
  context?: ParseMessageContext,
): ParsedOrderMessage {
  if (parsed.type !== 'unknown' || detectActionType(text) !== 'remove') return parsed;
  const last = context?.lastProduct;
  if (!last) return parsed;

  const labelLang = preferredLang ?? detectLang(text);
  const qte = extractSpokenQuantity(text);
  const unite = findUnit(text, last.defaultUnite, preferredLang);
  return {
    type: 'remove',
    productId: last.id,
    produit: last.produit,
    ...(qte !== null ? { qte } : {}),
    unite,
    logLabel:
      qte !== null
        ? formatActionLabel('remove', labelLang, { qte, unite })
        : REMOVE_ALL_LABEL[labelLang],
  };
}

function parseSingleMessage(
  rawText: string,
  preferredLang?: Lang,
  context?: ParseMessageContext,
): ParsedOrderMessage {
  const text = rawText.trim();
  if (!text) return { type: 'unknown' };

  /** Nhãn timeline theo ngôn ngữ đã chọn, không theo ngôn ngữ nghe được. */
  const labelLang = preferredLang ?? detectLang(text);
  const ignoreMatch = matchIgnoreOnly(text, preferredLang);
  if (ignoreMatch) {
    const quoted = ignoreMatch.map((s) => `«\u00a0${s}\u00a0»`).join(', ');
    return { type: 'ignore', segments: ignoreMatch, logLabel: quoted };
  }

  const replaced = tryParseReplace(text, preferredLang);
  if (replaced) return replaced;

  const actionType = detectActionType(text);
  const product = findProduct(text, preferredLang);

  if (actionType === 'remove') {
    if (!product) {
      return resolveRemoveWithContext({ type: 'unknown' }, text, preferredLang, context);
    }
    const qte = extractSpokenQuantity(text);
    const unite = findUnit(text, product.defaultUnite, preferredLang);
    return {
      type: 'remove',
      productId: product.id,
      produit: product.produit,
      ...(qte !== null ? { qte } : {}),
      unite,
      logLabel:
        qte !== null
          ? formatActionLabel('remove', labelLang, { qte, unite })
          : REMOVE_ALL_LABEL[labelLang],
    };
  }

  if (!product) return { type: 'unknown' };

  const correction = extractCorrection(text);
  const qte = correction?.qte ?? extractSpokenQuantity(text);
  const unite = findUnit(text, product.defaultUnite, preferredLang);

  if (actionType === 'correct' || correction) {
    const resolvedQte = qte ?? (actionType === 'correct' ? 1 : null);
    if (resolvedQte === null) return { type: 'unknown' };
    return {
      type: 'correct',
      productId: product.id,
      produit: product.produit,
      qte: resolvedQte,
      oldQte: correction?.oldQte,
      unite,
      logLabel: formatActionLabel('correct', labelLang, {
        qte: resolvedQte,
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
        logLabel: formatActionLabel('add', labelLang, { qte: resolvedQte, unite }),
      };
    }
  }

  return { type: 'unknown' };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ParsedOrderHit = {
  parsed: ParsedOrderMessage;
  /** Cụm con đã parse — không dùng transcript tích lũy. */
  sourceText: string;
};

function collectHit(
  parsed: ParsedOrderMessage,
  sourceText: string,
  bucket: ParsedOrderHit[],
  seen: Set<string>,
  preferredLang?: Lang,
  context?: ParseMessageContext,
) {
  parsed = resolveRemoveWithContext(parsed, sourceText, preferredLang, context);
  if (parsed.type === 'unknown') return;
  const fp = parsedFingerprint(parsed);
  if (!fp || seen.has(fp)) return;
  seen.add(fp);
  bucket.push({ parsed, sourceText: sourceText.trim() });
}

const SEGMENT_SEP =
  /\s*(?:[,;]|\.(?=\s)|\s[-—]\s+|\bet\b|\bpuis\b|\baussi\b|\band\b|\bwith\b|\bva\b|\bvà\b|\broi\b|\brồi\b|\bcon\b|\bcòn\b|\bplus\b)\s*/i;

const VOICE_CLAUSE_SCAN_MAX = 72;

function splitSegments(text: string): string[] {
  const normalized = normalize(text);
  return normalized
    .split(SEGMENT_SEP)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/** Tách « them mot X mot Y » (số lượng viết bằng chữ) thành nhiều lệnh. */
function splitViWordQuantityClauses(text: string): string[] {
  const n = normalize(text);
  const qtyWord = /^(?:mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)$/;
  const parts = n
    .split(/(?<=\s)(?=\b(?:mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (parts.length <= 1) return [];

  const leadPrefix = findLeadActionKeyword(parts[0]) ?? '';

  return parts.map((part, i) => {
    if (i === 0 || detectActionType(part)) return part;
    const firstWord = part.split(/\s+/)[0];
    if (!qtyWord.test(firstWord)) return part;
    const prefix = leadPrefix || 'them';
    return `${prefix} ${part}`;
  });
}

/** Tách thêm khi nhiều số lượng trong cùng cụm (không cần từ nối). */
function splitQuantityClauses(text: string): string[] {
  const n = normalize(text);
  if (!/\d/.test(n)) return [];

  const parts = n
    .split(/(?<![\d.])(?=\d+\s*)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (parts.length <= 1) return [];

  if (parts.length === 2 && isBareActionClause(parts[0])) return [];

  return parts;
}

/** Gom mọi biến thể cụm có thể chứa 1+ sản phẩm (câu dài, từ nối, nhiều số lượng). */
function collectMessageClauses(rawText: string): string[] {
  const text = rawText.trim();
  if (!text) return [];

  const clauses = new Set<string>();
  const add = (slice: string) => {
    const t = slice.trim();
    if (t.length > 2) clauses.add(t);
  };

  add(normalize(text));

  for (const chunk of splitIntoKeyChunks(text)) {
    add(chunk);
  }

  for (const seg of splitSegments(text)) {
    add(seg);
    for (const qtyPart of splitQuantityClauses(seg)) {
      if (!shouldSkipDerivedClause(seg, qtyPart)) add(qtyPart);
    }
    for (const viPart of splitViWordQuantityClauses(seg)) {
      if (!shouldSkipDerivedClause(seg, viPart)) add(viPart);
    }
  }

  for (const qtyPart of splitQuantityClauses(text)) {
    if (!shouldSkipDerivedClause(text, qtyPart)) add(qtyPart);
  }

  for (const replacePart of splitReplaceClauses(text)) {
    add(replacePart);
    add(normalize(replacePart));
  }

  const list = [...clauses];
  for (let i = 0; i < list.length - 1; i++) {
    if (isBareActionClause(list[i + 1])) continue;
    add(`${list[i]} ${list[i + 1]}`);
  }

  return [...clauses];
}

function scanProductWindows(
  text: string,
  preferredLang: Lang | undefined,
  bucket: ParsedOrderHit[],
  seen: Set<string>,
  maxLen: number,
  context?: ParseMessageContext,
) {
  if (text.length > maxLen) return;

  const productText = stripActionKeywordsForProductMatch(normalize(text));
  if (!productText) return;

  for (const { keyword } of allProductKeywords(preferredLang)) {
    const nk = normalize(keyword);
    if (nk.length < 3) continue;

    const regex = new RegExp(escapeRegex(nk), 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(productText)) !== null) {
      const start = Math.max(0, match.index - 35);
      const end = Math.min(text.length, match.index + keyword.length + 35);
      const window = text.slice(start, end);
      if (shouldSkipDerivedClause(text, window)) continue;
      collectHit(
        parseSingleMessage(window, preferredLang, context),
        window,
        bucket,
        seen,
        preferredLang,
        context,
      );
    }
  }
}

/** Tìm lệnh trong câu dài / transcript vocal (thử cả câu, từng đoạn, ghép 2 đoạn liền kề). */
export function parseOrderMessage(rawText: string, preferredLang?: Lang): ParsedOrderMessage {
  const all = parseOrderMessages(rawText, preferredLang);
  return all[0] ?? { type: 'unknown' };
}

/** Quét mọi cụm từ khóa sản phẩm trong transcript (giọng nói / text dài). */
export function parseOrderHits(
  rawText: string,
  preferredLang?: Lang,
  options?: { source?: 'voice' | 'text'; lastProduct?: ProductKeyword | null },
): ParsedOrderHit[] {
  const text = rawText.trim();
  if (!text) return [];

  const context: ParseMessageContext = { lastProduct: options?.lastProduct ?? null };
  const found: ParsedOrderHit[] = [];
  const seen = new Set<string>();
  const clauses = [...collectMessageClauses(text)].sort((a, b) => a.length - b.length);

  for (const clause of clauses) {
    collectHit(
      parseSingleMessage(clause, preferredLang, context),
      clause,
      found,
      seen,
      preferredLang,
      context,
    );
  }

  if (options?.source === 'voice') {
    for (const clause of clauses) {
      scanProductWindows(clause, preferredLang, found, seen, VOICE_CLAUSE_SCAN_MAX, context);
    }
  } else {
    scanProductWindows(text, preferredLang, found, seen, fuzzyConfig.maxInputLength, context);
  }

  return found;
}

export function parseOrderMessages(
  rawText: string,
  preferredLang?: Lang,
  options?: { source?: 'voice' | 'text' },
): ParsedOrderMessage[] {
  return parseOrderHits(rawText, preferredLang, options).map((h) => h.parsed);
}

/** Cụm đủ sản phẩm + số lượng (hoặc lệnh rõ) để xử lý ngay — dùng cho voice progressive. */
export function isChunkReady(chunk: string, preferredLang?: Lang): boolean {
  const trimmed = chunk.trim();
  if (trimmed.length < 3) return false;

  if (isValidateIntent(trimmed)) return true;

  const direct = parseOrderMessage(trimmed, preferredLang);
  if (direct.type !== 'unknown' && direct.type !== 'ignore') return true;

  if (trimmed.length <= fuzzyConfig.maxInputLength) {
    return parseOrderMessages(trimmed, preferredLang, { source: 'text' }).length > 0;
  }

  return parseOrderMessages(trimmed, preferredLang, { source: 'voice' }).length > 0;
}

export function parsedFingerprint(parsed: ParsedOrderMessage): string | null {
  if (parsed.type === 'unknown') return null;
  if (parsed.type === 'ignore') return `ignore:${parsed.logLabel}`;
  if (parsed.type === 'remove') {
    return parsed.qte !== undefined
      ? `remove:${parsed.productId}:${parsed.qte}:${parsed.unite}`
      : `remove-all:${parsed.productId}:${parsed.unite}`;
  }
  if (parsed.type === 'replace') {
    return `replace:${parsed.fromProductId}:${parsed.productId}:${parsed.qte}:${parsed.unite}`;
  }
  return `${parsed.type}:${parsed.productId}:${parsed.qte}:${parsed.unite}`;
}

export function formatTime(date = new Date()): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function resolveActionLabel(entry: ActionLogEntry, lang: Lang): string {
  if (entry.type === 'ignore') return entry.label ?? '';
  if (entry.type === 'remove') {
    return formatActionLabel('remove', lang, {
      qte: entry.qte,
      unite: entry.unite,
    });
  }
  if (entry.type === 'replace' && entry.qte !== undefined) {
    return formatActionLabel('replace', lang, {
      qte: entry.qte,
      unite: entry.unite,
      fromProduit: entry.fromProduct,
    });
  }
  if (entry.type === 'correct' && entry.qte !== undefined) {
    return formatActionLabel('correct', lang, {
      qte: entry.qte,
      oldQte: entry.oldQte,
      unite: entry.unite,
    });
  }
  if (entry.type === 'add' && entry.qte !== undefined) {
    return formatActionLabel('add', lang, { qte: entry.qte, unite: entry.unite });
  }
  return entry.label ?? '';
}

export { matchThreshold };

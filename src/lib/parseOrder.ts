import {
  products,
  units,
  triggers,
  allIgnoreKeywords,
  type ProductKeyword,
} from '../data/keywords';
import type {
  MissingField,
  OrderItem,
  OrderUnit,
  ParseOptions,
  ParsedOrder,
  RepromptReason,
  RepromptState,
  SkippedSegment,
} from '../types/parsedOrder';

/** Chuẩn hóa: thường hóa, bỏ dấu, bỏ ngoặc kép, gộp khoảng trắng. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[«»“”"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Map đơn vị nội bộ -> token đặc tả (giữ dấu `pièce`). */
const UNIT_OUTPUT: Record<string, OrderUnit> = {
  kg: 'kg',
  cagette: 'cagette',
  botte: 'botte',
  colis: 'colis',
  piece: 'pièce',
};

const DEFAULT_UNIT_OUTPUT: OrderUnit = 'pièce';

/** Chuẩn hóa id đơn vị nội bộ (vd `piece`) sang token đặc tả (`pièce`). */
export function toOutputUnit(unitId: string): OrderUnit {
  return UNIT_OUTPUT[unitId] ?? DEFAULT_UNIT_OUTPUT;
}

const REPROMPT_MESSAGES: Record<Exclude<RepromptReason, ''>, string> = {
  missingClient:
    'Mình chưa nghe rõ khách hàng. Bạn nói lại tên khách hàng một lần nữa giúp mình.',
  missingDate:
    'Mình chưa nghe rõ ngày giao hàng. Bạn nói lại ngày giao hàng một lần nữa giúp mình.',
  missingQuantity:
    'Mình nghe được sản phẩm nhưng chưa rõ số lượng. Bạn nói lại số lượng một lần nữa giúp mình.',
  noValidItems:
    'Mình chưa bắt được dòng sản phẩm hợp lệ. Bạn nói lại đơn hàng một lần nữa giúp mình.',
  unknownProduct:
    'Sản phẩm này chưa có trong từ điển. Bạn nói lại bằng tên sản phẩm trong danh sách hỗ trợ giúp mình.',
};

const WORD_NUMBERS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50,
  soixante: 60, cent: 100, mille: 1000,
};

type ProductHit = { product: ProductKeyword; start: number; end: number; keywordLen: number };

let normalizedProductIndex: { product: ProductKeyword; keyword: string }[] | null = null;
let normalizedUnitIndex: { unite: string; keyword: string }[] | null = null;

function getProductIndex() {
  if (normalizedProductIndex) return normalizedProductIndex;
  const out: { product: ProductKeyword; keyword: string }[] = [];
  for (const product of products) {
    for (const lang of ['fr', 'en', 'vi'] as const) {
      for (const kw of product.keywords[lang]) {
        const nk = normalize(kw);
        if (nk.length >= 3) out.push({ product, keyword: nk });
      }
    }
  }
  out.sort((a, b) => b.keyword.length - a.keyword.length);
  normalizedProductIndex = out;
  return out;
}

function getUnitIndex() {
  if (normalizedUnitIndex) return normalizedUnitIndex;
  const out: { unite: string; keyword: string }[] = [];
  for (const unit of units) {
    for (const lang of ['fr', 'en', 'vi'] as const) {
      for (const kw of unit.keywords[lang]) {
        const nk = normalize(kw);
        if (nk.length >= 2) out.push({ unite: unit.unite, keyword: nk });
      }
    }
  }
  out.sort((a, b) => b.keyword.length - a.keyword.length);
  normalizedUnitIndex = out;
  return out;
}

/**
 * Tìm MỌI sản phẩm trong segment (alias dài nhất thắng khi chồng nhau),
 * sắp theo vị trí xuất hiện. Hỗ trợ nhiều sản phẩm / lặp sản phẩm trong 1 segment.
 */
function findAllProductHits(norm: string): ProductHit[] {
  const raw: ProductHit[] = [];
  for (const { product, keyword } of getProductIndex()) {
    const re = new RegExp(`(?:^|\\s)${escapeRegex(keyword)}(?:s|es)?(?=\\s|$)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm)) !== null) {
      const start = m.index + (m[0].startsWith(' ') ? 1 : 0);
      raw.push({ product, start, end: start + keyword.length, keywordLen: keyword.length });
      if (re.lastIndex === m.index) re.lastIndex += 1;
    }
  }
  raw.sort((a, b) => a.start - b.start || b.keywordLen - a.keywordLen);

  const hits: ProductHit[] = [];
  let lastEnd = -1;
  for (const h of raw) {
    if (h.start < lastEnd) continue;
    hits.push(h);
    lastEnd = h.end;
  }
  return hits;
}

function findUnit(norm: string): string | null {
  for (const { unite, keyword } of getUnitIndex()) {
    const re = new RegExp(`(?:^|\\s)${escapeRegex(keyword)}(?:s|es)?(?=\\s|$)`);
    if (re.test(norm)) return unite;
  }
  return null;
}

/** Lấy số nguyên đứng TRƯỚC sản phẩm (theo đặc tả). null nếu không có. */
function findIntegerQuantityBefore(before: string): { value: number } | { nonInteger: true } | null {
  const digitMatches = [...before.matchAll(/(\d+(?:[.,]\d+)?)/g)];
  if (digitMatches.length > 0) {
    const raw = digitMatches[digitMatches.length - 1][1];
    if (/[.,]/.test(raw)) return { nonInteger: true };
    return { value: parseInt(raw, 10) };
  }

  const compound = before.match(
    /\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|trente|quarante|cinquante|soixante)\s+cents?\b/,
  );
  if (compound) return { value: WORD_NUMBERS[compound[1]] * 100 };

  const wordTokens = before.split(' ').reverse();
  for (const tok of wordTokens) {
    if (WORD_NUMBERS[tok] !== undefined) return { value: WORD_NUMBERS[tok] };
  }

  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Có phủ định (pas de / pas / sans) đứng ngay trước sản phẩm (trong window `before`)? */
function hasNegationBefore(before: string): boolean {
  const trimmed = before.trim();
  for (const neg of triggers.negation) {
    const nn = normalize(neg);
    const re = new RegExp(`(?:^|\\s)${escapeRegex(nn)}(?:\\s+(?:de|d|les|le|la|the)\\b)?\\s*$`);
    if (re.test(trimmed)) return true;
  }
  return false;
}

/** Token tên hợp lệ (không phải số / trigger / từ điển). */
function isNameToken(normTok: string): boolean {
  if (!normTok || /^\d/.test(normTok)) return false;
  if (WORD_NUMBERS[normTok] !== undefined) return false;
  const stop = new Set<string>();
  for (const arr of [
    triggers.client, triggers.site, triggers.date_tokens, triggers.creneau,
    triggers.connectors, triggers.negation, triggers.correction,
  ]) {
    for (const t of arr) for (const w of normalize(t).split(' ')) stop.add(w);
  }
  for (const { keyword } of getProductIndex()) for (const w of keyword.split(' ')) stop.add(w);
  for (const { keyword } of getUnitIndex()) for (const w of keyword.split(' ')) stop.add(w);
  // Token normalize có thể tách thành nhiều từ (vd "aujourd'hui" -> "aujourd hui").
  return normTok.split(' ').every((w) => w.length > 0 && !stop.has(w));
}

/** Trích giá trị (tên) sau một trong các trigger. Trả về chuỗi gốc (giữ hoa). */
function extractAfterTrigger(clause: string, triggerList: string[]): string | null {
  const origTokens = clause.split(/\s+/).filter(Boolean);
  const normTokens = origTokens.map((t) => normalize(t));

  for (const trig of triggerList) {
    const tw = normalize(trig).split(' ').filter(Boolean);
    for (let i = 0; i + tw.length <= normTokens.length; i++) {
      if (normTokens.slice(i, i + tw.length).join(' ') !== tw.join(' ')) continue;
      const value: string[] = [];
      for (let j = i + tw.length; j < origTokens.length && value.length < 2; j++) {
        if (!isNameToken(normTokens[j])) break;
        value.push(origTokens[j].replace(/[.,;:]+$/, ''));
      }
      if (value.length > 0) return value.join(' ');
    }
  }
  return null;
}

function extractDate(norm: string): string {
  const dateFormat = norm.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
  if (dateFormat) return dateFormat[1];
  for (const token of triggers.date_tokens) {
    const nt = normalize(token);
    const re = new RegExp(`(?:^|\\s)${escapeRegex(nt)}(?=\\s|$)`);
    if (re.test(norm)) return token.replace('’', "'");
  }
  return '';
}

function extractCreneau(norm: string): string {
  for (const token of triggers.creneau) {
    const nt = normalize(token);
    const re = new RegExp(`(?:^|\\s)${escapeRegex(nt)}(?=\\s|$)`);
    if (re.test(norm)) return token;
  }
  return '';
}

let ignoreKeywordsCache: string[] | null = null;
function isPureNoise(norm: string): boolean {
  if (!ignoreKeywordsCache) ignoreKeywordsCache = allIgnoreKeywords().map((k) => normalize(k));
  const words = norm.split(' ').filter(Boolean);
  if (words.length === 0) return true;
  return words.every((w) =>
    ignoreKeywordsCache!.some((kw) => kw === w || kw.split(' ').includes(w)) || w.length <= 2,
  );
}

type ItemOutcome =
  | { kind: 'item'; item: OrderItem }
  | { kind: 'negated' }
  | { kind: 'noQty' }
  | { kind: 'nonInteger' }
  | { kind: 'outOfScopeUnit' };

/** Đơn vị ngoài phạm vi V1: không tự quy về `pièce` vì làm sai nghĩa (P1-TASK-004 / P3-TASK-003). */
const OUT_OF_SCOPE_UNITS = ['tonne', 'tonnes'];

function hasOutOfScopeUnit(before: string): boolean {
  for (const u of OUT_OF_SCOPE_UNITS) {
    if (new RegExp(`(?:^|\\s)${escapeRegex(u)}(?=\\s|$)`).test(before)) return true;
  }
  return false;
}

/** Xử lý một segment, trả về kết quả cho TỪNG sản phẩm tìm thấy. */
function processItemSegment(seg: string): ItemOutcome[] {
  const norm = normalize(seg);
  if (!norm) return [];

  const hits = findAllProductHits(norm);
  if (hits.length === 0) return [];

  const outcomes: ItemOutcome[] = [];
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const windowStart = i === 0 ? 0 : hits[i - 1].end;
    const before = norm.slice(windowStart, hit.start);

    if (hasNegationBefore(before)) {
      outcomes.push({ kind: 'negated' });
      continue;
    }

    const qty = findIntegerQuantityBefore(before);
    if (qty === null) {
      outcomes.push({ kind: 'noQty' });
      continue;
    }
    if ('nonInteger' in qty) {
      outcomes.push({ kind: 'nonInteger' });
      continue;
    }

    if (hasOutOfScopeUnit(before)) {
      outcomes.push({ kind: 'outOfScopeUnit' });
      continue;
    }

    const unitId = findUnit(before) ?? 'piece';
    const unit = UNIT_OUTPUT[unitId] ?? DEFAULT_UNIT_OUTPUT;

    outcomes.push({
      kind: 'item',
      item: {
        product: hit.product.produit.toLowerCase(),
        quantity: qty.value,
        unit,
        category: 'fruits_legumes',
        raw_segment: seg.trim(),
      },
    });
  }
  return outcomes;
}

function splitClauses(text: string): string[] {
  return text
    .split(/[,;.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitItemSegments(normClause: string): string[] {
  const pattern = triggers.item_connectors.map((c) => escapeRegex(normalize(c))).join('|');
  return normClause
    .split(new RegExp(`\\s(?:${pattern})\\s`))
    .map((s) => s.trim())
    .filter(Boolean);
}

export type ParseOrderResult = {
  order: ParsedOrder;
  skipped: SkippedSegment[];
};

/**
 * Parser deterministic Phase 1: text/voice -> JSON contract `ParsedOrder`.
 * Không suy diễn dữ liệu thiếu. Rule + dictionary.
 */
export function parseOrder(rawText: string, opts: ParseOptions = {}): ParseOrderResult {
  const now = opts.now ?? new Date();
  const order: ParsedOrder = {
    order_id: `ATN-${now.getTime()}`,
    timestamp: now.toISOString(),
    source: opts.source ?? 'text',
    user: opts.user ?? 'AUTO_SESSION_USER',
    status: 'draft',
    client: '',
    site: '',
    date_livraison: '',
    creneau_livraison: '',
    commentaire_livraison: '',
    items: [],
    ignored_segments: [],
    missing_fields: [],
    reprompt: { required: false, already_asked: opts.alreadyAsked ?? false, reason: '', message: '' },
  };

  const skipped: SkippedSegment[] = [];
  const itemsByProduct = new Map<string, OrderItem>();
  let sawProductWithoutQuantity = false;

  for (const clause of splitClauses(rawText)) {
    const norm = normalize(clause);
    let contributed = false;

    if (!order.client) {
      const client = extractAfterTrigger(clause, triggers.client);
      if (client) {
        order.client = client;
        contributed = true;
      }
    }
    if (!order.site) {
      const site = extractAfterTrigger(clause, triggers.site);
      if (site) {
        order.site = site;
        contributed = true;
      }
    }
    if (!order.date_livraison) {
      const date = extractDate(norm);
      if (date) {
        order.date_livraison = date;
        contributed = true;
      }
    }
    if (!order.creneau_livraison) {
      const creneau = extractCreneau(norm);
      if (creneau) {
        order.creneau_livraison = creneau;
        contributed = true;
      }
    }

    for (const seg of splitItemSegments(norm)) {
      for (const outcome of processItemSegment(seg)) {
        switch (outcome.kind) {
          case 'item':
            // Correction last-wins cho cùng sản phẩm.
            itemsByProduct.set(outcome.item.product, outcome.item);
            contributed = true;
            break;
          case 'negated':
            skipped.push({ segment: seg, reason: 'negated' });
            contributed = true;
            break;
          case 'noQty':
            sawProductWithoutQuantity = true;
            skipped.push({ segment: seg, reason: 'missing_quantity' });
            break;
          case 'nonInteger':
            skipped.push({ segment: seg, reason: 'non_integer_quantity' });
            break;
          case 'outOfScopeUnit':
            // Product nhận diện nhưng đơn vị ngoài V1 -> skip, không quy về pièce.
            skipped.push({ segment: seg, reason: 'out_of_scope_unit' });
            contributed = true;
            break;
        }
      }
    }

    if (!contributed) {
      if (isPureNoise(norm)) skipped.push({ segment: clause, reason: 'noise' });
      else skipped.push({ segment: clause, reason: 'unknown_product' });
      order.ignored_segments.push(clause.trim());
    }
  }

  order.items = [...itemsByProduct.values()];

  computeMissingAndReprompt(order, sawProductWithoutQuantity);
  return { order, skipped };
}

function computeMissingAndReprompt(order: ParsedOrder, sawProductWithoutQuantity: boolean): void {
  const missing: MissingField[] = [];
  if (!order.client) missing.push('client');
  if (!order.site) missing.push('site');
  if (!order.date_livraison) missing.push('date_livraison');
  if (!order.creneau_livraison) missing.push('creneau_livraison');
  if (order.items.length === 0) missing.push('product');
  if (sawProductWithoutQuantity) missing.push('quantity');
  order.missing_fields = missing;

  // Ưu tiên: không có item > thiếu số lượng > thiếu khách > thiếu ngày.
  let reason: RepromptReason = '';
  if (order.items.length === 0 && !sawProductWithoutQuantity) reason = 'noValidItems';
  else if (sawProductWithoutQuantity) reason = 'missingQuantity';
  else if (!order.client) reason = 'missingClient';
  else if (!order.date_livraison) reason = 'missingDate';

  order.reprompt = buildReprompt(reason, order.reprompt.already_asked);
}

export function buildReprompt(reason: RepromptReason, alreadyAsked: boolean): RepromptState {
  if (reason === '' || alreadyAsked) {
    return { required: false, already_asked: alreadyAsked, reason: '', message: '' };
  }
  return { required: true, already_asked: false, reason, message: REPROMPT_MESSAGES[reason] };
}

/** Tên sản phẩm chuẩn hóa (display lowercase) tìm thấy trong text, theo thứ tự xuất hiện. */
export function findProductsInText(text: string): string[] {
  const norm = normalize(text);
  return findAllProductHits(norm).map((h) => h.product.produit.toLowerCase());
}

export type ParserDebugLog = {
  raw_text: string;
  normalized_text: string;
  segments: string[];
  extracted_admin: Record<string, string>;
  extracted_items: OrderItem[];
  ignored_segments: string[];
  skipped_segments: SkippedSegment[];
  reprompt: RepromptState;
};

/** Log debug deterministic (P3-TASK-005). Không inference ẩn: mỗi skip có reason. */
export function buildDebugLog(rawText: string, opts: ParseOptions = {}): ParserDebugLog {
  const { order, skipped } = parseOrder(rawText, opts);
  return {
    raw_text: rawText,
    normalized_text: normalize(rawText),
    segments: splitClauses(rawText),
    extracted_admin: {
      client: order.client,
      site: order.site,
      date_livraison: order.date_livraison,
      creneau_livraison: order.creneau_livraison,
    },
    extracted_items: order.items,
    ignored_segments: order.ignored_segments,
    skipped_segments: skipped,
    reprompt: order.reprompt,
  };
}

/** JSON contract compact theo đặc tả (loại bỏ field nội bộ). */
export function toJsonContract(order: ParsedOrder): Record<string, unknown> {
  return {
    order_id: order.order_id,
    timestamp: order.timestamp,
    source: order.source,
    user: order.user,
    status: order.status,
    client: order.client,
    site: order.site,
    date_livraison: order.date_livraison,
    creneau_livraison: order.creneau_livraison,
    commentaire_livraison: order.commentaire_livraison,
    items: order.items.map((i) => ({
      product: i.product,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
    })),
    ignored_segments: order.ignored_segments,
  };
}

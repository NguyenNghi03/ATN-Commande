import { triggers } from '../data/keywords';
import { matchesKeywordBoundary } from './splitKeyChunks';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let cachedPhrases: string[] | null = null;

function getValidatePhrases(): string[] {
  if (cachedPhrases) return cachedPhrases;

  const seen = new Set<string>();
  const list: string[] = [];

  for (const raw of triggers.validate ?? []) {
    const nk = normalize(raw);
    if (nk.length < 2 || seen.has(nk)) continue;
    seen.add(nk);
    list.push(nk);
  }

  cachedPhrases = list.sort((a, b) => b.length - a.length);
  return cachedPhrases;
}

/** Nhận lệnh valider / thanh toán / checkout (FR, EN, VI — có/không dấu). */
export function isValidateIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;

  for (const phrase of getValidatePhrases()) {
    if (n === phrase || matchesKeywordBoundary(n, phrase)) return true;
  }

  return false;
}

/** Anchor tách cụm progressive voice (vd. « … thanh toan don hang »). */
export function getValidateAnchorKeywords(): string[] {
  return getValidatePhrases();
}

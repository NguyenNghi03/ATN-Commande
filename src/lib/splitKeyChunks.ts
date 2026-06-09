import { allActionKeywords, triggers } from '../data/keywords';

function normalizeChunkText(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[«»""'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Khớp từ khóa đứng riêng (không dính trong từ khác: « bo » ≠ « bom »). */
export function matchesKeywordBoundary(normalized: string, keyword: string): boolean {
  if (!keyword) return false;
  const escaped = escapeRegex(keyword);
  return new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'i').test(normalized);
}

/** Khớp từ khóa ở đầu cụm (dùng khi kế thừa hành động cho lệnh tách). */
export function matchesKeywordAtStart(normalized: string, keyword: string): boolean {
  if (!keyword) return false;
  const escaped = escapeRegex(keyword);
  return new RegExp(`^${escaped}(?=\\s|$)`, 'i').test(normalized);
}

let cachedAnchorKeywords: string[] | null = null;

function getChunkAnchorKeywords(): string[] {
  if (cachedAnchorKeywords) return cachedAnchorKeywords;

  const seen = new Set<string>();
  const keywords: string[] = [];

  const push = (raw: string) => {
    const nk = normalizeChunkText(raw);
    if (nk.length < 2 || seen.has(nk)) return;
    seen.add(nk);
    keywords.push(nk);
  };

  for (const { keyword } of allActionKeywords()) {
    push(keyword);
  }

  for (const keyword of triggers.validate ?? []) {
    push(keyword);
  }

  cachedAnchorKeywords = keywords.sort((a, b) => b.length - a.length);
  return cachedAnchorKeywords;
}

function findAnchorPositions(normalized: string): number[] {
  const splitAt = new Set<number>([0]);

  for (const kw of getChunkAnchorKeywords()) {
    const escaped = escapeRegex(kw);
    const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'gi');
    let lastIndex = -1;

    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      if (match.index === lastIndex && match[0].length === 0) break;
      lastIndex = match.index;

      const start = match.index + (match[0].length > kw.length ? 1 : 0);
      if (start > 0) splitAt.add(start);

      if (re.lastIndex === match.index) {
        re.lastIndex += 1;
      }
    }
  }

  return [...splitAt].sort((a, b) => a - b);
}

/** Tách transcript theo từ khóa hành động / nối (mỗi key = một cụm độc lập). */
export function splitIntoKeyChunks(rawText: string): string[] {
  const text = rawText.trim();
  if (!text) return [];

  const normalized = normalizeChunkText(text);
  const points = findAnchorPositions(normalized);
  const chunks: string[] = [];

  for (let i = 0; i < points.length; i++) {
    const slice = normalized.slice(points[i], points[i + 1]).trim();
    if (slice.length > 2) chunks.push(slice);
  }

  return chunks.length > 0 ? chunks : [normalized];
}

export function chunkSignature(chunk: string): string {
  return normalizeChunkText(chunk);
}

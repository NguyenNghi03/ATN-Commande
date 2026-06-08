export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Tỉ lệ sai khác chuẩn hóa 0–1 (0 = giống hệt). */
export function normalizedDistance(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshtein(a, b) / maxLen;
}

/**
 * So khớp keyword trong text.
 * @param threshold 0 = chính xác, 1 = fuzzy rộng. Chấp nhận khi normalizedDistance <= threshold.
 */
export function matchKeywordInText(
  text: string,
  keyword: string,
  threshold: number,
): number | null {
  if (!keyword || !text) return null;

  if (text.includes(keyword)) return 1;
  if (threshold <= 0) return null;

  const kwWords = keyword.split(' ').filter(Boolean);
  const textWords = text.split(' ').filter(Boolean);
  if (kwWords.length === 0 || textWords.length === 0) return null;

  let best: number | null = null;

  for (let size = kwWords.length; size <= kwWords.length + 1; size++) {
    if (size > textWords.length) continue;
    for (let i = 0; i <= textWords.length - size; i++) {
      const chunk = textWords.slice(i, i + size).join(' ');
      if (chunk.length < 3) continue;
      const dist = normalizedDistance(chunk, keyword);
      if (dist <= threshold) {
        const score = 1 - dist;
        if (best === null || score > best) best = score;
      }
    }
  }

  return best;
}

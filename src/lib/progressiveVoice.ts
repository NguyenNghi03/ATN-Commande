import type { Lang } from '../data/keywords';
import { isChunkReady, shouldDeferImplicitVoiceChunk } from './parseOrderMessage';
import { chunkSignature, splitIntoKeyChunks } from './splitKeyChunks';

function normalizeClause(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tách cụm theo anchor hành động; nếu không có thì tách theo số lượng. */
export function splitLiveClauses(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byAction = splitIntoKeyChunks(trimmed);
  if (byAction.length > 1) return byAction;

  const n = normalizeClause(trimmed);
  if (!/\d/.test(n)) return byAction;

  const byQty = n
    .split(/(?<![\d.])(?=\d+\s*)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (byQty.length > 1 && byQty.every((part) => /\d/.test(part))) {
    return byQty;
  }

  return byAction;
}

export type ProgressiveVoiceState = {
  emitted: Set<string>;
};

export function createProgressiveVoiceState(): ProgressiveVoiceState {
  return { emitted: new Set() };
}

export function resetProgressiveVoiceState(state: ProgressiveVoiceState): void {
  state.emitted.clear();
}

/**
 * Quét transcript đang nói theo chiều tiến:
 * - Cụm đã đóng (anchor / số lượng kế tiếp xuất hiện) + đủ key → sẵn sàng.
 * - Cụm cuối + đủ key → sẵn sàng ngay (không chờ speechend).
 */
export function scanReadyVoiceChunks(
  liveText: string,
  lang: Lang | undefined,
  state: ProgressiveVoiceState,
): string[] {
  const clauses = splitLiveClauses(liveText);
  const ready: string[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const sig = chunkSignature(clause);
    if (state.emitted.has(sig)) continue;

    if (!isChunkReady(clause, lang)) continue;

    const closedByNext = i < clauses.length - 1;
    const isLast = i === clauses.length - 1;
    const deferImplicit = isLast && shouldDeferImplicitVoiceChunk(clause);
    if ((closedByNext || isLast) && !deferImplicit) {
      ready.push(clause);
      state.emitted.add(sig);
    }
  }

  return ready;
}

/** Phần còn lại chưa emit khi kết thúc lượt nói (reprompt / admin). */
export function getUnprocessedVoiceTail(
  liveText: string,
  state: ProgressiveVoiceState,
): string {
  const pending = splitLiveClauses(liveText).filter(
    (clause) => !state.emitted.has(chunkSignature(clause)),
  );
  return pending.join(' ').trim();
}

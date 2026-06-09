import { fuzzyConfig } from '../data/keywords';

/** Một lượt nói (speechstart → speechend) = một sự kiện; chỉ commit khi speechend. */
export function commitSpeechEvent(liveText: string): string | null {
  const trimmed = liveText.trim();
  if (trimmed.length < 2) return null;
  return trimmed;
}

export type FuzzyMatchCandidate<T> = {
  item: T;
  score: number;
  keywordLen: number;
};

/** Kiểm tra transcript quá ngắn, quá dài hoặc quá nhiều từ (nhiễu ASR). */
export function isNoisyInput(text: string): boolean {
  const cleaned = text.trim();

  if (cleaned.length < 2) return true;
  if (cleaned.length > fuzzyConfig.maxInputLength) return true;

  const words = cleaned.split(/\s+/);
  if (words.length > fuzzyConfig.maxWords) return true;

  return false;
}

/** Chấp nhận khớp tự động khi score đủ cao và cách biệt rõ với ứng viên thứ 2. */
export function validateBestMatch<T>(
  best: FuzzyMatchCandidate<T> | null | undefined,
  secondBest: FuzzyMatchCandidate<T> | null | undefined,
): boolean {
  if (!best) return false;
  if (best.score < fuzzyConfig.autoMatchThreshold) return false;

  if (
    secondBest &&
    best.score - secondBest.score < fuzzyConfig.minScoreGap
  ) {
    return false;
  }

  return true;
}

/** Trích chỉ các đoạn final từ SpeechRecognitionEvent (không gộp interim). */
export function extractFinalTranscript(event: {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0?: { transcript?: string };
    };
  };
}): string {
  let finalText = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) {
      finalText += `${(result[0]?.transcript ?? '').trim()} `;
    }
  }

  return finalText.trim();
}

type SpeechResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    0?: { transcript?: string };
  };
};

/** Ghép transcript từ startIndex → endIndex (final + interim). */
export function buildPhraseFromResultsUpTo(
  results: SpeechResultList,
  startIndex: number,
  endIndex: number,
): string {
  let text = '';
  const from = Math.max(0, startIndex);
  const to = Math.min(results.length - 1, endIndex);
  for (let i = from; i <= to; i++) {
    const part = (results[i][0]?.transcript ?? '').trim();
    if (part) text += `${part} `;
  }
  return text.trim();
}
/** Ghép transcript từ startIndex → cuối (final + interim của lượt nói hiện tại). */
export function buildPhraseFromResults(results: SpeechResultList, startIndex: number): string {
  return buildPhraseFromResultsUpTo(results, startIndex, results.length - 1);
}

export function normalizeEmitKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tránh emit trùng khi interim ổn định rồi isFinal xác nhận cùng nội dung. */
export function shouldEmitTranscript(text: string, lastEmitted: string): boolean {
  const key = normalizeEmitKey(text);
  if (key.length < 2) return false;
  return key !== normalizeEmitKey(lastEmitted);
}

export function shouldSuggestMatch<T>(
  best: FuzzyMatchCandidate<T> | null | undefined,
): boolean {
  if (!best) return false;
  return (
    best.score >= fuzzyConfig.suggestThreshold &&
    best.score < fuzzyConfig.autoMatchThreshold
  );
}

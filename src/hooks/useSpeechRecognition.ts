import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../data/keywords';
import {
  createProgressiveVoiceState,
  getUnprocessedVoiceTail,
  resetProgressiveVoiceState,
  scanReadyVoiceChunks,
} from '../lib/progressiveVoice';
import {
  buildPhraseFromResults,
  buildPhraseFromResultsUpTo,
  shouldEmitTranscript,
} from '../lib/voicePipeline';

type SpeechRecognitionCtor = new () => SpeechRecognition;

const RESTART_DELAY_MS = 320;
const CAPTURE_HOLD_MS = 500;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function tailText(text: string, maxChars = 64): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `…${trimmed.slice(-maxChars).trimStart()}`;
}

/** Reset buffer sự kiện nói hiện tại. */
export function clearSpeechVoiceState(refs: {
  eventTranscript: { current: string };
  phraseStartIndex: { current: number };
}) {
  refs.eventTranscript.current = '';
  refs.phraseStartIndex.current = -1;
}

export function useSpeechRecognition(
  onTranscript?: (text: string) => void,
  speechLang = 'fr-FR',
  onUtteranceEnd?: (fullText: string) => void,
  preferredLang: Lang = 'fr',
) {
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const activeRef = useRef(false);
  const listeningRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const eventTranscriptRef = useRef('');
  const phraseStartIndexRef = useRef(-1);
  const progressiveStateRef = useRef(createProgressiveVoiceState());
  const lastEmittedRef = useRef('');
  const lastFinalCountRef = useRef(0);
  const speechLangRef = useRef(speechLang);
  const preferredLangRef = useRef(preferredLang);
  const onTranscriptRef = useRef(onTranscript);
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const beginSessionRef = useRef<() => void>(() => {});
  speechLangRef.current = speechLang;
  preferredLangRef.current = preferredLang;
  onTranscriptRef.current = onTranscript;
  onUtteranceEndRef.current = onUtteranceEnd;

  const voiceStateRefs = {
    eventTranscript: eventTranscriptRef,
    phraseStartIndex: phraseStartIndexRef,
  };

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearCaptureTimer = useCallback(() => {
    if (captureTimerRef.current !== null) {
      window.clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }, []);

  const resetEventState = useCallback(() => {
    clearSpeechVoiceState(voiceStateRefs);
    resetProgressiveVoiceState(progressiveStateRef.current);
    lastEmittedRef.current = '';
    lastFinalCountRef.current = 0;
  }, []);

  const beginSpeechEvent = useCallback(() => {
    resetEventState();
  }, [resetEventState]);

  const emitReadyChunks = useCallback((liveText: string) => {
    const ready = scanReadyVoiceChunks(
      liveText,
      preferredLangRef.current,
      progressiveStateRef.current,
    );

    for (const chunk of ready) {
      if (!shouldEmitTranscript(chunk, lastEmittedRef.current)) continue;
      lastEmittedRef.current = chunk;
      onTranscriptRef.current?.(chunk);
    }
  }, []);

  const commitSpeechEventAndClear = useCallback(() => {
    const fullText = eventTranscriptRef.current.trim();
    const tail = getUnprocessedVoiceTail(
      eventTranscriptRef.current,
      progressiveStateRef.current,
    );
    resetEventState();

    if (tail.length >= 2) {
      onTranscriptRef.current?.(tail);
    }

    onUtteranceEndRef.current?.(fullText);
  }, [resetEventState]);

  const markCapturing = useCallback(() => {
    clearCaptureTimer();
    setIsCapturing(true);
  }, [clearCaptureTimer]);

  const releaseCapturingSoon = useCallback(() => {
    clearCaptureTimer();
    captureTimerRef.current = window.setTimeout(() => {
      captureTimerRef.current = null;
      setIsCapturing(false);
    }, CAPTURE_HOLD_MS);
  }, [clearCaptureTimer]);

  const disposeRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.onspeechstart = null;
    recognition.onsoundstart = null;
    recognition.onspeechend = null;
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    listeningRef.current = false;
  }, []);

  const stopSession = useCallback(() => {
    clearRestartTimer();
    clearCaptureTimer();
    disposeRecognition();
    resetEventState();
    setIsCapturing(false);
  }, [clearCaptureTimer, clearRestartTimer, disposeRecognition, resetEventState]);

  const scheduleRestart = useCallback(() => {
    if (!activeRef.current) return;
    clearRestartTimer();
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (activeRef.current) beginSessionRef.current();
    }, RESTART_DELAY_MS);
  }, [clearRestartTimer]);

  beginSessionRef.current = () => {
    if (!activeRef.current) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      activeRef.current = false;
      setIsReady(false);
      setIsCapturing(false);
      return;
    }

    clearRestartTimer();
    disposeRecognition();
    resetEventState();
    setIsCapturing(false);
    setIsReady(false);

    const recognition = new Ctor();
    recognition.lang = speechLangRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listeningRef.current = true;
      setIsReady(true);
      setNeedsGesture(false);
    };

    recognition.onspeechstart = () => {
      markCapturing();
      beginSpeechEvent();
    };

    recognition.onsoundstart = () => {
      markCapturing();
    };

    recognition.onspeechend = () => {
      commitSpeechEventAndClear();
      releaseCapturingSoon();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      markCapturing();

      if (phraseStartIndexRef.current < 0) {
        phraseStartIndexRef.current = event.resultIndex;
      }

      const start = phraseStartIndexRef.current;
      const livePhrase = buildPhraseFromResults(event.results, start);
      eventTranscriptRef.current = livePhrase;

      // Interim: quét và xử lý ngay khi đủ key (không chờ hết câu)
      emitReadyChunks(livePhrase);

      // Mỗi đoạn isFinal của trình duyệt → flush lại ngay (trước speechend)
      let finalCount = 0;
      for (let i = start; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalCount++;
      }

      if (finalCount > lastFinalCountRef.current) {
        lastFinalCountRef.current = finalCount;
        for (let i = start; i < event.results.length; i++) {
          if (!event.results[i].isFinal) continue;
          const finalizedPhrase = buildPhraseFromResultsUpTo(event.results, start, i);
          emitReadyChunks(finalizedPhrase);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      listeningRef.current = false;
      setIsReady(false);
      setIsCapturing(false);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        activeRef.current = false;
        setNeedsGesture(true);
        return;
      }

      if (activeRef.current) scheduleRestart();
    };

    recognition.onend = () => {
      listeningRef.current = false;
      recognitionRef.current = null;
      setIsCapturing(false);

      if (!activeRef.current) {
        setIsReady(false);
        return;
      }

      setIsReady(false);
      scheduleRestart();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      listeningRef.current = false;
      setIsReady(false);
      setNeedsGesture(true);
      scheduleRestart();
    }
  };

  const activate = useCallback(() => {
    if (!getSpeechRecognitionCtor()) return;
    activeRef.current = true;
    setNeedsGesture(false);
    beginSessionRef.current();
  }, []);

  const unlock = useCallback(() => {
    if (!getSpeechRecognitionCtor()) return;
    activeRef.current = true;
    setNeedsGesture(false);
    beginSessionRef.current();
  }, []);

  const deactivate = useCallback(() => {
    activeRef.current = false;
    stopSession();
    setIsReady(false);
  }, [stopSession]);

  useEffect(() => {
    activate();

    const onGesture = () => {
      if (!listeningRef.current && activeRef.current) {
        beginSessionRef.current();
      }
    };

    window.addEventListener('pointerdown', onGesture);

    return () => {
      window.removeEventListener('pointerdown', onGesture);
      deactivate();
    };
  }, [speechLang, preferredLang, activate, deactivate]);

  return { isReady, isCapturing, isSupported, needsGesture, unlock };
}

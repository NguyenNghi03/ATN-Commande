import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const SPEECH_LANG = 'vi-VN';

export function tailText(text: string, maxChars = 64): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `…${trimmed.slice(-maxChars).trimStart()}`;
}

export function useSpeechRecognition(onTranscript?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const accumulatedRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null;

  const fullText = [finalText, interimText].filter(Boolean).join(' ').trim();
  const displayText = fullText ? tailText(fullText) : '';

  const emitTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed) onTranscriptRef.current?.(trimmed);
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    setInterimText('');
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    stop();
    setFinalText('');
    setInterimText('');
    accumulatedRef.current = '';

    const recognition = new Ctor();
    recognition.lang = SPEECH_LANG;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      const finals: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result[0]?.transcript ?? '').trim();
        if (!text) continue;
        if (result.isFinal) finals.push(text);
        else interim = text;
      }

      if (finals.length > 0) {
        const phrase = finals.join(' ');
        accumulatedRef.current = accumulatedRef.current
          ? `${accumulatedRef.current} ${phrase}`
          : phrase;
        setFinalText(accumulatedRef.current);
        setInterimText('');
        emitTranscript(phrase);
        emitTranscript(accumulatedRef.current);
      } else if (interim) {
        setInterimText(interim);
        const live = accumulatedRef.current
          ? `${accumulatedRef.current} ${interim}`
          : interim;
        emitTranscript(live);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        listeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          listeningRef.current = false;
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      listeningRef.current = false;
      setIsListening(false);
    }
  }, [emitTranscript, stop]);

  const stopAndProcess = useCallback(() => {
    const pending = [accumulatedRef.current, interimText].filter(Boolean).join(' ').trim();
    stop();
    if (pending) emitTranscript(pending);
  }, [emitTranscript, interimText, stop]);

  useEffect(() => () => stop(), [stop]);

  return { isListening, displayText, fullText, start, stop: stopAndProcess, isSupported };
}

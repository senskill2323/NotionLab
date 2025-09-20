import { useCallback, useEffect, useRef, useState } from 'react';

export function useLiveTranscription({ lang = 'fr-FR', onText } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0].transcript;
        if (res.isFinal) {
          onText && onText(text + '\n', true);
        } else {
          interim += text;
        }
      }
      if (interim) onText && onText(interim, false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;
  }, [lang, onText]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (_) {}
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch (_) {}
    setListening(false);
  }, []);

  return { supported, listening, startListening, stopListening };
}

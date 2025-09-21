import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAssistantStore } from '@/hooks/useAssistantStore';
import { Mic, MicOff, Video, VideoOff, Camera, Upload, X, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ragSearch, getMemory, updateMemory } from '@/lib/assistantApi';
import { getAssistantSettings } from '@/lib/assistantAdminApi';
import { useWebRTCClient } from '@/hooks/useWebRTCClient';
import { useLiveTranscription } from '@/hooks/useLiveTranscription';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ConnectionBadge = ({ state }) => {
  const color = state === 'connected' ? 'bg-green-500' : state === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500';
  const text = state === 'connected' ? 'Connecté' : state === 'reconnecting' ? 'Reconnexion…' : 'Hors ligne';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-foreground/80">{text}</span>
    </div>
  );
};

const AssistantDrawer = ({ open, onClose }) => {
  const {
    micOn, camOn,
    setMic, setCam,
    localStream, setLocalStream,
    remoteStream, setRemoteStream,
    transcript, setTranscript, appendTranscript,
    messages, pushMessage,
    connectionState,
    error,
  } = useAssistantStore();
  const { user } = useAuth();
  const [lastImage, setLastImage] = useState(null);
  const [lastFile, setLastFile] = useState(null);
  const [adminSettings, setAdminSettings] = useState(null);
  const [interim, setInterim] = useState('');

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  // Phone-like call state & resources
  const [callActive, setCallActive] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const ringCtxRef = useRef(null);
  const ringIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  // WebRTC setup (live: mic always on during call)
  const { startConnection, stopConnection, snapshotFromVideo, reconnect, requestResponse } = useWebRTCClient();

  // Local transcription (FR) via Web Speech API (fallback only)
  const { listening, startListening, stopListening, supported: sttSupported } = useLiveTranscription({
    lang: 'fr-FR',
    onText: (chunk, isFinal) => {
      if (isFinal) {
        appendTranscript(chunk.endsWith('\n') ? chunk : chunk + '\n');
        setInterim('');
        // Trigger assistant to respond on final user speech
        const txt = (chunk || '').trim();
        if (txt.length > 0) {
          try { requestResponse(); } catch {}
        }
      } else {
        setInterim(chunk);
      }
    }
  });

  // Load admin settings (playbackRate mapping, etc.)
  useEffect(() => {
    (async () => {
      try {
        const s = await getAssistantSettings();
        setAdminSettings(s || null);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      const play = async () => {
        try { await audioRef.current.play(); } catch (_) {}
      };
      play();
      // Map speech_rate (1..10) -> playbackRate (~0.2..2)
      try {
        if (adminSettings && typeof adminSettings.speech_rate === 'number') {
          const rate = Math.max(0.2, Math.min(2, (adminSettings.speech_rate || 5) / 5));
          audioRef.current.playbackRate = rate;
        }
      } catch (_) {}
    }
  }, [remoteStream, adminSettings]);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      const play = async () => {
        try { await videoRef.current.play(); } catch (_) {}
      };
      play();
    }
  }, [localStream]);

  // Only stop connection when drawer closes. Start is user-driven via "Appeler".
  useEffect(() => {
    if (!open) {
      try { handleHangup(); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Update tracks when a call is active based on mic/cam toggles
  useEffect(() => {
    if (!open || !callActive) return;
    startConnection({ mic: micOn, cam: camOn, replaceTracks: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn, camOn, callActive]);

  // Ringback tone control based on connection state (only on initial connecting)
  useEffect(() => {
    if (!callActive) { stopRingback(); return; }
    if (connectionState === 'connected') {
      stopRingback();
    } else if (connectionState === 'connecting') {
      startRingback();
    } else {
      // failed, disconnected, idle → stop
      stopRingback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, callActive]);

  // Visibility/Wake lock continuity
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState === 'visible') {
        try { await ringCtxRef.current?.resume?.(); } catch {}
        try { await audioRef.current?.play?.(); } catch {}
        if (callActive && 'wakeLock' in navigator && !wakeLockRef.current) {
          try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [callActive]);

  // MediaSession metadata
  useEffect(() => {
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = callActive ? new window.MediaMetadata({ title: 'Assistant', artist: 'GPT‑Realtime' }) : null;
        navigator.mediaSession.playbackState = callActive ? 'playing' : 'none';
      }
    } catch {}
  }, [callActive]);

  const startRingback = () => {
    try {
      if (ringIntervalRef.current) return; // already ringing
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      ringCtxRef.current = ctx;
      const osc1 = ctx.createOscillator(); osc1.frequency.value = 440; // FR/US style
      const osc2 = ctx.createOscillator(); osc2.frequency.value = 480;
      const gain = ctx.createGain(); gain.gain.value = 0;
      osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
      osc1.start(); osc2.start();
      // cadence: ~1s on / 2s off
      ringIntervalRef.current = setInterval(() => {
        const now = ctx.currentTime;
        try {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(1, now);
          gain.gain.setValueAtTime(0, now + 1.0);
        } catch {}
      }, 2000);
      try { ctx.resume(); } catch {}
    } catch {}
  };

  const stopRingback = () => {
    try { if (ringIntervalRef.current) clearInterval(ringIntervalRef.current); } catch {}
    ringIntervalRef.current = null;
    try {
      const ctx = ringCtxRef.current;
      if (ctx) {
        try { ctx.close(); } catch {}
      }
    } catch {}
    ringCtxRef.current = null;
  };

  const handleCall = async () => {
    if (callActive) return;
    setCallActive(true);
    // Ask mic permission (without streaming)
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      try { tmp.getTracks().forEach(t => t.stop()); } catch {}
    } catch {}
    // Wake Lock
    try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
    startRingback();
    try {
      await startConnection({ mic: true, cam: camOn, stunOnly: true });
      try { await audioRef.current?.play?.(); } catch {}
    } catch (_) {
      // On échec, raccrocher proprement
      handleHangup();
      return;
    }
    // 5 minutes strict
    const endAt = Date.now() + 5 * 60 * 1000;
    setRemainingMs(5 * 60 * 1000);
    try { if (window.__callTimer) clearInterval(window.__callTimer); } catch {}
    window.__callTimer = setInterval(() => {
      const left = endAt - Date.now();
      setRemainingMs(left > 0 ? left : 0);
      if (left <= 0) handleHangup();
    }, 1000);
  };

  const handleHangup = () => {
    stopRingback();
    try { stopConnection(); } catch {}
    try { if (window.__callTimer) clearInterval(window.__callTimer); } catch {}
    setRemainingMs(0);
    setCallActive(false);
    try { wakeLockRef.current?.release?.(); } catch {}
    wakeLockRef.current = null;
  };

  // Live mode: start/stop local transcription based on micOn
  useEffect(() => {
    if (!sttSupported) return;
    if (callActive && micOn && !listening) {
      try { startListening(); } catch {}
    }
    if ((!callActive || !micOn) && listening) {
      try { stopListening(); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callActive, micOn, sttSupported]);

  const fmtRemaining = (ms) => {
    const m = Math.floor((ms || 0) / 60000);
    const s = Math.floor(((ms || 0) % 60000) / 1000);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleMic = async () => {
    const next = !micOn;
    setMic(next);
    if (sttSupported) {
      if (next && !listening) startListening();
      if (!next && listening) stopListening();
    }
  };

  const handleToggleCam = async () => {
    setCam(!camOn);
  };

  const handleSnapshot = async () => {
    const dataUrl = await snapshotFromVideo(videoRef.current);
    if (dataUrl) {
      setLastImage(dataUrl);
      pushMessage({ role: 'user', content: 'Snapshot envoyé.', image: dataUrl });
    }
  };

  const fileInputRef = useRef(null);
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const uploaded = { name: file.name, type: file.type, dataUrl: reader.result };
      setLastFile(uploaded);
      pushMessage({ role: 'user', content: `Fichier téléchargé: ${file.name}`, file: uploaded });
    };
    reader.readAsDataURL(file);
  };

  const [input, setInput] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [sending, setSending] = useState(false);

  const sendQuery = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    pushMessage({ role: 'user', content: text });
    setSending(true);
    try {
      const { answer, sources, unavailable, message } = await ragSearch({ query: text, includeSources: showSources, image: lastImage, file: lastFile });
      if (unavailable) {
        const fallbackMsg = adminSettings?.rag_error_message || "Je n’ai pas accès à tes documents pour le moment. Je tente un accès générique et je me reconnecte si possible.";
        pushMessage({ role: 'assistant', content: message || fallbackMsg, meta: { reason: 'no_access' } });
      }
      pushMessage({ role: 'assistant', content: answer || '…', sources: showSources ? sources : undefined });
      setLastImage(null);
      setLastFile(null);
    } catch (e) {
      pushMessage({ role: 'assistant', content: "Connexion instable, je tente de me reconnecter…" });
      try { await reconnect(); } catch (_) {}
    } finally {
      setSending(false);
    }
  };

  // Auto-reconnect loop when marked as reconnecting
  useEffect(() => {
    if (connectionState === 'reconnecting' && open) {
      const t = setTimeout(() => {
        reconnect().catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [connectionState, open, reconnect]);

  return (
    <div className={`fixed top-0 right-0 h-screen w-full sm:w-[440px] md:w-[480px] max-w-[90vw] bg-background shadow-2xl z-50 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">Assistant</h2>
          <ConnectionBadge state={connectionState} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => reconnect()} title="Reconnexion">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto h-[calc(100vh-56px)]">
        {/* Remote audio */}
        <div className="p-2 rounded-md border">
          <p className="text-sm text-foreground/80 mb-2">Voix de l’assistante</p>
          <audio ref={audioRef} autoPlay playsInline controls className="w-full" />
        </div>

        {/* Media controls */}
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={handleCall} disabled={!open || callActive}>
            Appeler
          </Button>
          <Button variant="destructive" onClick={handleHangup} disabled={!open || !callActive}>
            Raccrocher
          </Button>
          {callActive && (
            <span className="text-xs text-foreground/70 ml-1">{fmtRemaining(remainingMs)}</span>
          )}
          <Button variant={micOn ? 'default' : 'secondary'} onClick={handleToggleMic}>
            {micOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />} {micOn ? 'Micro ON' : 'Micro OFF'}
          </Button>
          <Button variant={camOn ? 'default' : 'secondary'} onClick={handleToggleCam}>
            {camOn ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />} {camOn ? 'Caméra ON' : 'Caméra OFF'}
          </Button>
          <Button variant="outline" onClick={handleSnapshot}>
            <Camera className="w-4 h-4 mr-2" /> Montre‑lui
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          {/* Upload déplacé près du bouton Envoyer */}
        </div>

        {/* Local preview */}
        {camOn && (
          <div className="rounded-md border overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full bg-black aspect-video" />
          </div>
        )}

        {/* Messages */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto border rounded-md p-2">
          {messages.length === 0 && (
            <div className="text-sm text-foreground/60">Commence à parler au micro ou tape un message ci‑dessous.</div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className="text-sm">
              <span className={`font-medium ${m.role === 'assistant' ? 'text-primary' : 'text-foreground'}`}>{m.role === 'assistant' ? 'Assistante' : 'Toi'}:</span>{' '}
              <span>{m.content}</span>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-1 pl-5 text-xs text-foreground/70 space-y-1">
                  {m.sources.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.title || s.url}</a>
                    </div>
                  ))}
                </div>
              )}
              {m.image && (
                <div className="mt-2"><img src={m.image} alt="snapshot" className="max-h-40 rounded-md border" /></div>
              )}
            </div>
          ))}
        </div>

        {/* Transcript */}
        <div>
          <div className="text-xs text-foreground/70 mb-1">Transcription (FR uniquement)</div>
          <div className="text-sm whitespace-pre-wrap p-2 rounded-md border min-h-[60px]">
            {transcript}
            {interim && <span className="opacity-60">{interim}</span>}
          </div>
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendQuery(); }}
            className="flex-1 px-3 py-2 border rounded-md bg-background"
            placeholder="Pose ta question…"
          />
          <Button variant="ghost" size="icon" onClick={handleUploadClick} title="Joindre un fichier">
            <Upload className="w-4 h-4" />
          </Button>
          <Button disabled={sending} onClick={sendQuery}>Envoyer</Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground/70">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showSources} onChange={(e) => setShowSources(e.target.checked)} />
            Montrer les sources (sur demande)
          </label>
        </div>

        {callActive && connectionState !== 'connected' && (
          <div className="text-xs text-foreground/70">
            {connectionState === 'connecting' && 'Appel en cours…'}
            {connectionState === 'reconnecting' && 'Reconnexion…'}
            {connectionState === 'failed' && 'Impossible d’établir la connexion. Vérifie le réseau puis réessaie.'}
            {(connectionState === 'disconnected' || connectionState === 'idle') && 'Hors ligne.'}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-500/80 border border-red-500/40 bg-red-500/5 rounded-md p-2">
            <div className="font-medium mb-1">Détail technique (debug)</div>
            <code className="whitespace-pre-wrap break-all">{String(error)}</code>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantDrawer;

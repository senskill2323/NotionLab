import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PerfectNegotiator } from '@/lib/webrtc/perfectNegotiation';

/**
 * Lightweight hook that wraps the Perfect Negotiation pattern around a RTCPeerConnection.
 * It exposes a minimal API { pc, start, stop } that higher level hooks/components can build upon.
 */
export function usePerfectNegotiation(options = {}) {
  const {
    polite = true,
    rtcConfig,
    log,
    handlers: initialHandlers = {},
    createPeerConnection = (config) => new RTCPeerConnection(config),
  } = options;

  const negotiatorRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamsRef = useRef([]);
  const handlersRef = useRef({ ...initialHandlers });
  const epochRef = useRef(0);

  const emitLog = useCallback((level, message, data) => {
    if (typeof log === 'function') {
      try { log(level, message, data); } catch {}
    }
  }, [log]);

  const ensureNegotiator = useCallback(() => {
    if (!negotiatorRef.current) {
      negotiatorRef.current = new PerfectNegotiator({
        polite,
        rtcConfig,
        log: emitLog,
        createPeerConnection,
        handlers: handlersRef.current,
      });
    }
    return negotiatorRef.current;
  }, [polite, rtcConfig, emitLog, createPeerConnection]);

  const setHandlers = useCallback((nextHandlers = {}) => {
    handlersRef.current = { ...handlersRef.current, ...nextHandlers };
    const negotiator = negotiatorRef.current;
    if (negotiator) {
      negotiator.setHandlers(handlersRef.current);
    }
  }, []);

  useEffect(() => {
    if (initialHandlers && Object.keys(initialHandlers).length) {
      setHandlers(initialHandlers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHandlers]);

  const ensurePeer = useCallback((configOverride) => {
    const negotiator = ensureNegotiator();
    const current = peerRef.current;
    if (current && (current.connectionState === 'failed' || current.connectionState === 'closed')) {
      try { current.close(); } catch {}
      peerRef.current = null;
    }
    const targetConfig = configOverride || rtcConfig;
    const { peer } = negotiator.ensurePeerConnection(targetConfig, handlersRef.current);
    peerRef.current = peer;
    return peer;
  }, [ensureNegotiator, rtcConfig]);

  const attachTracks = useCallback((peer, tracks = [], streams = []) => {
    tracks.forEach((track) => {
      if (!track) return;
      const senders = peer.getSenders?.() || [];
      const existing = senders.find((sender) => sender.track && sender.track.kind === track.kind);
      if (existing && typeof existing.replaceTrack === 'function') {
        try { existing.replaceTrack(track); return; } catch {}
      }
      const hintedStream = streams.find((stream) => stream?.getTracks?.().some((t) => t.id === track.id));
      if (hintedStream) {
        peer.addTrack(track, hintedStream);
      } else {
        const fallback = new MediaStream();
        fallback.addTrack(track);
        peer.addTrack(track, fallback);
      }
    });
  }, []);

  const stop = useCallback(async ({ reason = 'stop', resetHandlers = false } = {}) => {
    epochRef.current += 1;
    const peer = peerRef.current;
    const localStreams = localStreamsRef.current || [];

    localStreams.forEach((stream) => {
      try { stream.getTracks().forEach((track) => track.stop()); } catch {}
    });
    localStreamsRef.current = [];

    if (peer) {
      try {
        peer.getSenders?.().forEach((sender) => {
          try { sender.track?.stop(); } catch {}
        });
      } catch {}
      try { peer.close(); } catch {}
    }

    peerRef.current = null;

    const negotiator = negotiatorRef.current;
    if (negotiator) {
      negotiator.resetFlags();
      if (resetHandlers) {
        negotiatorRef.current = null;
      }
    }

    emitLog?.('debug', 'perfectNegotiation.stop', { reason, epoch: epochRef.current });
    return epochRef.current;
  }, [emitLog]);

  const start = useCallback(async ({
    configOverride,
    media = true,
    audio = true,
    video = false,
    constraints,
    tracks = [],
    onStream,
  } = {}) => {
    const peer = ensurePeer(configOverride);
    const acquiredStreams = [];
    const acquiredTracks = [...tracks];

    if (media) {
      const defaultConstraints = constraints || {
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        video: video ? { width: { ideal: 640 }, height: { ideal: 360 } } : false,
      };
      if (defaultConstraints.audio || defaultConstraints.video) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
          acquiredStreams.push(stream);
          if (typeof onStream === 'function') {
            try { onStream(stream); } catch {}
          }
          stream.getTracks().forEach((track) => acquiredTracks.push(track));
        } catch (error) {
          emitLog?.('warn', 'perfectNegotiation.start getUserMedia failed', {
            message: String(error?.message || error),
          });
          if (audio) {
            throw error;
          }
        }
      }
    }

    attachTracks(peer, acquiredTracks, acquiredStreams);

    localStreamsRef.current = acquiredStreams;
    emitLog?.('debug', 'perfectNegotiation.start', { tracks: acquiredTracks.length });

    return {
      peer,
      streams: acquiredStreams,
      tracks: acquiredTracks,
    };
  }, [attachTracks, emitLog, ensurePeer]);

  const value = useMemo(() => ({
    pc: peerRef.current,
    start,
    stop,
    ensurePeer,
    getPeer: () => peerRef.current,
    getNegotiator: () => ensureNegotiator(),
    setHandlers,
    attachTracks,
    bumpEpoch: (reason) => {
      epochRef.current += 1;
      emitLog?.('debug', 'perfectNegotiation.bumpEpoch', { reason, epoch: epochRef.current });
      return epochRef.current;
    },
    getEpoch: () => epochRef.current,
  }), [start, stop, ensurePeer, setHandlers, attachTracks, emitLog, ensureNegotiator]);

  return value;
}

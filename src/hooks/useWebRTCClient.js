import { useCallback } from 'react';
import { useAssistantStore } from '@/hooks/useAssistantStore';
import { supabase } from '@/lib/customSupabaseClient';

// Build ICE servers from env with sane defaults
const ICE_SERVERS = [];
const STUN_URLS = (import.meta.env?.VITE_STUN_URL || [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:global.stun.twilio.com:3478',
].join(','))
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);
if (STUN_URLS.length) ICE_SERVERS.push({ urls: STUN_URLS });

const TURN_URLS = (import.meta.env?.VITE_TURN_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);
const TURN_USERNAME = import.meta.env?.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env?.VITE_TURN_CREDENTIAL;
if (TURN_URLS.length && TURN_USERNAME && TURN_CREDENTIAL) {
  ICE_SERVERS.push({ urls: TURN_URLS, username: TURN_USERNAME, credential: TURN_CREDENTIAL });
}

function tuneOpusSdp(sdp, maxAvgBitrate = AUDIO_MAX_BITRATE_BPS) {
  try {
    // Find opus payload type
    const rtpmap = sdp.match(/a=rtpmap:(\d+) opus\/(\d+)/);
    if (!rtpmap) return sdp;
    const pt = rtpmap[1];
    const fmtpRegex = new RegExp(`a=fmtp:${pt} (.*)`);
    const hasFmtp = fmtpRegex.test(sdp);
    const params = [
      `stereo=0`,
      `sprop-stereo=0`,
      `maxaveragebitrate=${Math.max(12000, Math.min(128000, maxAvgBitrate))}`,
      `usedtx=0`,
      `useinbandfec=1`,
    ];
    if (hasFmtp) {
      sdp = sdp.replace(fmtpRegex, (m, p1) => {
        // Merge existing params with ours
        const existing = new Set(String(p1).split(';').map(s => s.trim()).filter(Boolean));
        params.forEach(kv => existing.add(kv));
        return `a=fmtp:${pt} ${Array.from(existing).join(';')}`;
      });
    } else {
      // Insert after rtpmap line
      sdp = sdp.replace(new RegExp(`a=rtpmap:${pt} opus\\/\\d+\\/\\d+`), (line) => {
        return `${line}\r\na=fmtp:${pt} ${params.join(';')}`;
      });
    }
    // Ensure ptime=20
    if (!/a=ptime:20/.test(sdp)) {
      sdp = sdp.replace(/(m=audio .*?\r\n)/, `$1a=ptime:20\r\n`);
    }
    return sdp;
  } catch (_) {
    return sdp;
  }
}

const FORCE_RELAY = String(import.meta.env?.VITE_FORCE_TURN || '').trim() === '1';
const RTC_CONFIG = {
  iceServers: ICE_SERVERS,
  // Small ICE candidate pool can help faster initial connectivity
  iceCandidatePoolSize: 2,
  ...(FORCE_RELAY ? { iceTransportPolicy: 'relay' } : {}),
};
// STUN-only configuration (ignores TURN servers)
const RTC_STUN_ONLY_CONFIG = {
  iceServers: STUN_URLS.length ? [{ urls: STUN_URLS }] : [],
  iceCandidatePoolSize: 2,
};

// Feature flags and telemetry (opt-in)
const FLAG_GUARD_CONNECTED = String(import.meta.env?.VITE_WEBRTC_GUARD_CONNECTIONSTATE || '1') === '1';
const FLAG_RESTART_ICE = String(import.meta.env?.VITE_WEBRTC_RESTART_ICE || '1') === '1';
// Host-only fallback (no STUN)
const FLAG_HOST_ONLY_FALLBACK = String(import.meta.env?.VITE_WEBRTC_HOST_ONLY_FALLBACK || '1') === '1';
const CONNECT_TIMEOUT_MS = Math.max(5000, Number(import.meta.env?.VITE_WEBRTC_TIMEOUT_MS || 15000));
const LOG_LEVEL = String(import.meta.env?.VITE_WEBRTC_LOG_LEVEL || 'none').toLowerCase();
const BREADCRUMBS = String(import.meta.env?.VITE_WEBRTC_BREADCRUMBS || '0') === '1';

// Network shaping: cap outgoing audio bitrate to reduce dropouts on flaky links
const AUDIO_MAX_BITRATE_BPS = Math.max(
  16000,
  Number(import.meta.env?.VITE_AUDIO_MAX_BITRATE || 32000)
);

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

// Logging helpers (no-op by default)
function canLog(level) {
  const order = { none: 0, error: 1, warn: 2, info: 3, debug: 4 };
  return (order[LOG_LEVEL] || 0) >= (order[level] || 0);
}
function log(level, msg, data) {
  if (!canLog(level)) return;
  try { console[level](`[webrtc] ${msg}`, data || ''); } catch {}
}
const crumbs = [];
function addCrumb(event, data) {
  if (!BREADCRUMBS) return;
  try {
    crumbs.push({ ts: Date.now(), event, data });
    if (crumbs.length > 200) crumbs.shift();
  } catch {}
}

function buildConstraints(mic, cam) {
  return {
    audio: mic ? AUDIO_CONSTRAINTS : false,
    video: cam ? { width: { ideal: 640 }, height: { ideal: 360 } } : false,
  };
}

async function applyAudioBitrate(peer) {
  try {
    const senders = peer?.getSenders?.() || [];
    for (const s of senders) {
      if (s.track && s.track.kind === 'audio') {
        const p = s.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        // maxBitrate in bps; browsers may clamp
        p.encodings[0].maxBitrate = AUDIO_MAX_BITRATE_BPS;
        try { await s.setParameters(p); } catch {}
      }
    }
  } catch {}
}

let pc = null;
let localStreamRef = null;
let remoteStreamRef = null;
let keepAliveDc = null;
let keepAliveTimer = null;
let iceRestartTimer = null;
let statsTimer = null;
let oaiDc = null;
let lastInboundAudioBytes = 0;
let lastInboundCheckAt = 0;
let connectTimeoutTimer = null;
let iceBackoffAttempt = 0;
let iceBackoffTimer = null;
let fallbackTimer = null;
let hostOnlyAttempted = false;

export function useWebRTCClient() {
  const {
    setLocalStream,
    setRemoteStream,
    setConnectionState,
    micOn,
    camOn,
    setError,
  } = useAssistantStore();

  const ensureStreams = useCallback(async ({ mic = true, cam = false } = {}) => {
    const constraints = buildConstraints(mic, cam);
    // Fresh acquire if no stream yet
    if (!localStreamRef) {
      localStreamRef = await navigator.mediaDevices.getUserMedia(constraints).catch(() => null);
      setLocalStream(localStreamRef);
      return;
    }
    // Remove any ended tracks
    try {
      localStreamRef.getTracks().forEach(t => {
        if (t.readyState === 'ended') {
          try { localStreamRef.removeTrack(t); } catch {}
        }
      });
    } catch {}
    // Determine which kinds we need to (re)acquire
    const hasAudio = !!localStreamRef.getAudioTracks().length;
    const hasVideo = !!localStreamRef.getVideoTracks().length;
    const needAudio = mic && !hasAudio;
    const needVideo = cam && !hasVideo;
    if (needAudio || needVideo) {
      const newStream = await navigator.mediaDevices.getUserMedia(buildConstraints(needAudio, needVideo)).catch(() => null);
      if (newStream) {
        newStream.getTracks().forEach(t => localStreamRef.addTrack(t));
        setLocalStream(localStreamRef);
      }
    }
    // Toggle enablement of existing tracks
    localStreamRef.getAudioTracks().forEach(t => (t.enabled = !!mic));
    localStreamRef.getVideoTracks().forEach(t => (t.enabled = !!cam));
  }, [setLocalStream]);

  const createPeer = useCallback((configOverride) => {
    // Recreate if previous peer is unusable
    if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) {
      try { pc.close(); } catch {}
      pc = null;
    }
    if (pc) return pc;
    pc = new RTCPeerConnection(configOverride || RTC_CONFIG);

    // Remote media
    remoteStreamRef = new MediaStream();
    pc.ontrack = (e) => {
      try {
        const addIfMissing = (track) => {
          if (!track) return;
          const exists = remoteStreamRef.getTracks().some(t => t.id === track.id);
          if (!exists) remoteStreamRef.addTrack(track);
        };
        if (e.streams && e.streams[0]) {
          e.streams[0].getTracks().forEach(addIfMissing);
        } else if (e.track) {
          addIfMissing(e.track);
        }
      } catch {}
      setRemoteStream(remoteStreamRef);
    };

    pc.onicecandidateerror = (e) => {
      // Surface ICE errors to UI for diagnostics
      const detail = `${e?.errorText || e?.type || 'unknown'}`;
      addCrumb('ice_error', { detail });
      log('warn', 'icecandidateerror', { detail });
      try { setError(`ICE error: ${detail}`); } catch {}
      // Trigger host-only fallback if DNS/lookup error on STUN and flag enabled
      if (FLAG_HOST_ONLY_FALLBACK && !hostOnlyAttempted && /lookup|dns/i.test(detail || '')) {
        try { if (fallbackTimer) clearTimeout(fallbackTimer); } catch {}
        fallbackTimer = setTimeout(() => {
          if (!pc || pc.connectionState === 'connected') return;
          fallbackToHostOnly().catch(() => {});
        }, 1000);
      }
    };

    // Keepalive DataChannel (helps some NATs / middleboxes)
    try {
      keepAliveDc = pc.createDataChannel('keepalive');
      keepAliveDc.onopen = () => {
        try { if (keepAliveTimer) clearInterval(keepAliveTimer); } catch {}
        keepAliveTimer = setInterval(() => {
          try { keepAliveDc?.send('ping'); } catch {}
        }, 15000);
      };
      const stopKA = () => { try { if (keepAliveTimer) clearInterval(keepAliveTimer); } catch {}; keepAliveTimer = null; };
      keepAliveDc.onclose = stopKA;
      keepAliveDc.onerror = stopKA;
    } catch {}

    // Capture OpenAI Realtime events channel created by the server
    try {
      pc.ondatachannel = (ev) => {
        const ch = ev?.channel;
        if (ch && ch.label === 'oai-events') {
          oaiDc = ch;
          oaiDc.onopen = () => { addCrumb('oai_dc_open'); };
          const clearOai = () => { addCrumb('oai_dc_closed'); };
          oaiDc.onclose = clearOai;
          oaiDc.onerror = clearOai;
          // optional onmessage: ignored to keep logs silent by default
        }
      };
    } catch {}

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      addCrumb('pc_state_change', { state });
      log('info', `pc.connectionState=${state}`);
      if (state === 'connected') {
        setConnectionState('connected');
        try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
        connectTimeoutTimer = null;
        iceBackoffAttempt = 0;
      } else if (state === 'connecting') {
        setConnectionState('connecting');
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionState('reconnecting');
        // Backoff restarts handled by ICE handler below as well
      } else if (state === 'closed') {
        setConnectionState('failed');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      addCrumb('ice_state_change', { state: s });
      log('debug', `pc.iceConnectionState=${s}`);
      if ((s === 'failed' || s === 'disconnected') && FLAG_RESTART_ICE) {
        setConnectionState('reconnecting');
        scheduleIceRestartBackoff(s);
      }
    };

    return pc;
  }, [setRemoteStream, setConnectionState]);

  const scheduleIceRestartBackoff = (reason) => {
    try { if (iceBackoffTimer) clearTimeout(iceBackoffTimer); } catch {}
    const delays = [1000, 2000, 4000, 10000];
    const attempt = Math.min(iceBackoffAttempt, delays.length - 1);
    const wait = delays[attempt];
    iceBackoffTimer = setTimeout(async () => {
      if (!pc || pc.connectionState === 'connected') return;
      addCrumb('ice_restart_attempt', { attempt: iceBackoffAttempt + 1, reason });
      log('info', 'ICE restart attempt', { attempt: iceBackoffAttempt + 1, reason });
      try {
        if (typeof pc.restartIce === 'function') {
          pc.restartIce();
        } else {
          await iceRestart();
        }
        iceBackoffAttempt += 1;
        if (iceBackoffAttempt >= delays.length) {
          // Maxed out; if still not connected, mark as failed under guard
          setTimeout(() => {
            if (pc && pc.connectionState !== 'connected') {
              addCrumb('ice_restart_exhausted');
              log('warn', 'ICE restart attempts exhausted');
              if (FLAG_HOST_ONLY_FALLBACK && !hostOnlyAttempted) {
                fallbackToHostOnly().catch(() => {});
              } else if (FLAG_GUARD_CONNECTED) {
                setConnectionState('failed');
              }
            }
          }, 1500);
        }
      } catch (e) {
        iceBackoffAttempt += 1;
        log('warn', 'ICE restart error', { message: String(e?.message || e) });
      }
    }, wait);
  };

  // Fallback to host-only connection (no STUN). Recreate PC, renegotiate, and keep PTT behavior (mic not attached until requested).
  const fallbackToHostOnly = async () => {
    if (hostOnlyAttempted) return;
    hostOnlyAttempted = true;
    addCrumb('fallback_host_only_start');
    log('info', 'Falling back to host-only (no STUN)');
    try {
      // Close current peer and timers
      try { pc?.close(); } catch {}
      try { keepAliveDc?.close(); } catch {}
      try { if (keepAliveTimer) clearInterval(keepAliveTimer); } catch {}
      try { if (iceRestartTimer) clearTimeout(iceRestartTimer); } catch {}
      try { if (iceBackoffTimer) clearTimeout(iceBackoffTimer); } catch {}
      try { if (statsTimer) clearInterval(statsTimer); } catch {}
      try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
      keepAliveDc = null; keepAliveTimer = null; iceRestartTimer = null; iceBackoffTimer = null; statsTimer = null; connectTimeoutTimer = null;
      pc = null;

      // Create host-only PC
      const hostOnlyConfig = { iceServers: [], iceCandidatePoolSize: 0 };
      const peer = createPeer(hostOnlyConfig);

      // Ensure audio transceiver present
      try {
        const hasAnyTransceiver = !!peer.getTransceivers()?.length;
        if (!hasAnyTransceiver) peer.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {}

      // Re-add local tracks: respect current toggles; mic only if already present/enabled (PTT will attach later if not)
      if (localStreamRef) {
        for (const track of localStreamRef.getTracks()) {
          const senders = peer.getSenders();
          const kind = track.kind;
          const existing = senders.find(s => s.track && s.track.kind === kind);
          if (!existing) {
            // Only add audio if track exists (PTT may not have created one)
            peer.addTrack(track, localStreamRef);
          }
        }
        await applyAudioBitrate(peer);
      }

      // Negotiate again
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      const tunedSdp = tuneOpusSdp(offer.sdp);
      await peer.setLocalDescription({ type: 'offer', sdp: tunedSdp });
      await waitForIceGatheringComplete(peer);
      const localSdp = (peer.localDescription && peer.localDescription.sdp) || tunedSdp || offer.sdp;
      const { data, error } = await supabase.functions.invoke('realtime-offer', { body: { sdp: localSdp } });
      if (error) throw error;
      const { sdp: answerSdp } = data || {};
      if (!answerSdp) throw new Error('No SDP answer (host-only)');
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      addCrumb('fallback_host_only_answer_applied');
      log('info', 'Host-only answer applied');

      // Start a new connection timeout guard for host-only path
      if (FLAG_GUARD_CONNECTED) {
        try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
        connectTimeoutTimer = setTimeout(() => {
          if (!pc) return;
          if (pc.connectionState !== 'connected') {
            addCrumb('connect_timeout_host_only');
            log('warn', 'Connection timeout (host-only)');
            setConnectionState('failed');
          }
        }, CONNECT_TIMEOUT_MS);
      }
    } catch (e) {
      addCrumb('fallback_host_only_failed', { message: String(e?.message || e) });
      log('error', 'Host-only fallback failed', { message: String(e?.message || e) });
      // Mark failed under guard if we cannot fallback
      if (FLAG_GUARD_CONNECTED) setConnectionState('failed');
    }
  };

  const waitForIceGatheringComplete = (peer) => new Promise((resolve) => {
    if (!peer) return resolve();
    if (peer.iceGatheringState === 'complete') return resolve();
    const check = () => {
      if (peer.iceGatheringState === 'complete') {
        peer.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    peer.addEventListener('icegatheringstatechange', check);
  });

  const startConnection = useCallback(async ({ mic = false, cam = false, replaceTracks = false, stunOnly = false } = {}) => {
    setConnectionState('connecting');
    try {
      await ensureStreams({ mic, cam });

      const peer = createPeer(stunOnly ? RTC_STUN_ONLY_CONFIG : undefined);

      // Ensure we offer to receive and send audio explicitly (Unified Plan)
      try {
        const hasAnyTransceiver = !!peer.getTransceivers()?.length;
        if (!hasAnyTransceiver) {
          peer.addTransceiver('audio', { direction: 'sendrecv' });
        }
      } catch {}

      // Add local tracks
      if (localStreamRef) {
        for (const track of localStreamRef.getTracks()) {
          const senders = peer.getSenders();
          const kind = track.kind;
          const existing = senders.find(s => s.track && s.track.kind === kind);
          if (existing && replaceTracks) {
            try { await existing.replaceTrack(track); } catch (_) {}
          } else if (!existing) {
            peer.addTrack(track, localStreamRef);
          } else {
            existing.track.enabled = track.enabled;
          }
        }
        await applyAudioBitrate(peer);
      }

      // Create offer
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      const tunedSdp = tuneOpusSdp(offer.sdp);
      await peer.setLocalDescription({ type: 'offer', sdp: tunedSdp });
      // Wait for ICE gathering to include candidates in SDP (non-trickle)
      await waitForIceGatheringComplete(peer);

      // Call the Supabase Edge Function proxy to OpenAI Realtime
      const localSdp = (peer.localDescription && peer.localDescription.sdp) || tunedSdp || offer.sdp;
      const { data, error } = await supabase.functions.invoke('realtime-offer', {
        body: { sdp: localSdp },
      });
      if (error) throw error;

      const { sdp: answerSdp } = data || {};
      if (!answerSdp) throw new Error('No SDP answer from realtime proxy');

      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      addCrumb('answer_applied');
      log('info', 'Remote answer applied');

      // Start stats watcher to detect stalled audio
      try { if (statsTimer) clearInterval(statsTimer); } catch {}
      lastInboundAudioBytes = 0;
      lastInboundCheckAt = Date.now();
      statsTimer = setInterval(async () => {
        try {
          if (!pc || pc.connectionState !== 'connected') return;
          const stats = await pc.getStats();
          let inbound = 0;
          stats.forEach((r) => {
            if (r.type === 'inbound-rtp' && r.kind === 'audio') {
              inbound += r.bytesReceived || 0;
            }
          });
          const now = Date.now();
          if (lastInboundAudioBytes > 0) {
            const deltaBytes = inbound - lastInboundAudioBytes;
            const deltaMs = now - lastInboundCheckAt;
            // If no bytes in ~7s while connected, try ICE restart
            if (deltaBytes <= 20 && deltaMs >= 7000) {
              addCrumb('no_inbound_audio');
              log('warn', 'No inbound audio detected, attempting ICE restart');
              try {
                if (FLAG_RESTART_ICE && typeof pc.restartIce === 'function') pc.restartIce();
                else if (FLAG_RESTART_ICE) await iceRestart();
              } catch { try { await reconnect(); } catch {} }
              lastInboundAudioBytes = 0; // reset baseline after restart
              lastInboundCheckAt = now;
              return;
            }
          }
          lastInboundAudioBytes = inbound;
          lastInboundCheckAt = now;
        } catch {}
      }, 5000);

      // Connection timeout guard
      if (FLAG_GUARD_CONNECTED) {
        try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
        connectTimeoutTimer = setTimeout(() => {
          if (!pc) return;
          if (pc.connectionState !== 'connected') {
            addCrumb('connect_timeout');
            log('warn', 'Connection timeout');
            if (FLAG_HOST_ONLY_FALLBACK && !hostOnlyAttempted) {
              fallbackToHostOnly().catch(() => {});
            } else {
              setConnectionState('failed');
            }
          }
        }, CONNECT_TIMEOUT_MS);
      }
    } catch (e) {
      setConnectionState('disconnected');
      setError(String(e?.message || e));
      throw e;
    }
  }, [ensureStreams, createPeer, setConnectionState, setError]);

  const iceRestart = useCallback(async () => {
    if (!pc) throw new Error('No peer to ICE-restart');
    try {
      const offer = await pc.createOffer({ iceRestart: true, offerToReceiveAudio: true, offerToReceiveVideo: false });
      const tunedSdp = tuneOpusSdp(offer.sdp);
      await pc.setLocalDescription({ type: 'offer', sdp: tunedSdp });
      await waitForIceGatheringComplete(pc);
      const localSdp = (pc.localDescription && pc.localDescription.sdp) || tunedSdp || offer.sdp;
      const { data, error } = await supabase.functions.invoke('realtime-offer', {
        body: { sdp: localSdp },
      });
      if (error) throw error;
      const { sdp: answerSdp } = data || {};
      if (!answerSdp) throw new Error('No SDP answer (ICE restart)');
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      addCrumb('ice_restart_answer_applied');
      log('info', 'ICE restart answer applied');
    } catch (e) {
      setError(String(e?.message || e));
      throw e;
    }
  }, [setConnectionState, setError]);

  const snapshotFromVideo = useCallback(async (videoEl) => {
    if (!videoEl) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }, []);

  // Press-to-Talk controls: attach/detach the microphone track to the audio sender
  const beginPtt = useCallback(async () => {
    if (!pc) return;
    // Ensure we have an audio track
    if (!localStreamRef || !localStreamRef.getAudioTracks().length) {
      try {
        await ensureStreams({ mic: true, cam: false });
      } catch {}
    }
    const track = localStreamRef?.getAudioTracks?.()[0];
    if (!track) return;
    try { track.enabled = true; } catch {}
    try {
      const senders = pc.getSenders() || [];
      let audioSender = senders.find(s => (s.track && s.track.kind === 'audio'));
      if (!audioSender) {
        // Try to find an audio sender via transceivers
        try {
          const tx = pc.getTransceivers?.().find(t => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio' || t.mid === 'audio');
          if (tx && tx.sender) audioSender = tx.sender;
        } catch {}
      }
      if (audioSender) {
        await audioSender.replaceTrack(track);
      } else {
        pc.addTrack(track, localStreamRef);
      }
    } catch {}
  }, [ensureStreams]);

  const endPtt = useCallback(() => {
    if (!pc) return;
    try {
      const senders = pc.getSenders() || [];
      const audioSender = senders.find(s => (s.track && s.track.kind === 'audio'));
      if (audioSender && audioSender.replaceTrack) {
        audioSender.replaceTrack(null).catch(() => {});
      }
    } catch {}
    // Stop and remove local mic tracks to avoid capturing when not pressed
    try {
      if (localStreamRef) {
        localStreamRef.getAudioTracks().forEach(t => { try { t.stop(); } catch {}; try { localStreamRef.removeTrack(t); } catch {}; });
        setLocalStream(localStreamRef);
      }
    } catch {}
  }, [setLocalStream]);

  const stopConnection = useCallback(() => {
    if (pc) {
      try { pc.getSenders().forEach(s => s.track && s.track.stop()); } catch (_) {}
      try { pc.close(); } catch (_) {}
    }
    try { keepAliveDc?.close(); } catch {}
    try { oaiDc?.close(); } catch {}
    try { if (keepAliveTimer) clearInterval(keepAliveTimer); } catch {}
    try { if (iceRestartTimer) clearTimeout(iceRestartTimer); } catch {}
    try { if (iceBackoffTimer) clearTimeout(iceBackoffTimer); } catch {}
    try { if (statsTimer) clearInterval(statsTimer); } catch {}
    try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
    try { if (fallbackTimer) clearTimeout(fallbackTimer); } catch {}
    keepAliveDc = null;
    oaiDc = null;
    keepAliveTimer = null;
    iceRestartTimer = null;
    iceBackoffTimer = null;
    statsTimer = null;
    connectTimeoutTimer = null;
    fallbackTimer = null;
    hostOnlyAttempted = false;
    pc = null;
    setConnectionState('disconnected');
  }, [setConnectionState]);

  const reconnect = useCallback(async () => {
    setConnectionState('reconnecting');
    try {
      // Force a fresh peer connection on reconnect to recover from failures
      try { pc?.close(); } catch {}
      pc = null;
      // Do not auto-enable mic on reconnect; PTT controls mic attachment
      await startConnection({ mic: false, cam: camOn, replaceTracks: true, stunOnly: false });
    } catch (e) {
      setConnectionState('disconnected');
      throw e;
    }
  }, [startConnection, micOn, camOn, setConnectionState]);

  const requestResponse = useCallback(() => {
    try {
      if (oaiDc && oaiDc.readyState === 'open') {
        oaiDc.send(JSON.stringify({ type: 'response.create' }));
        addCrumb('response_create_sent');
      }
    } catch {}
  }, []);

  return { startConnection, stopConnection, snapshotFromVideo, reconnect, beginPtt, endPtt, requestResponse };
}

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
  // Slightly larger pool can help faster re-use of candidates
  iceCandidatePoolSize: 4,
  ...(FORCE_RELAY ? { iceTransportPolicy: 'relay' } : {}),
};
// STUN-only configuration (ignores TURN servers)
const RTC_STUN_ONLY_CONFIG = {
  iceServers: STUN_URLS.length ? [{ urls: STUN_URLS }] : [],
  iceCandidatePoolSize: 4,
};

// Feature flags and telemetry (opt-in)
const FLAG_GUARD_CONNECTED = String(import.meta.env?.VITE_WEBRTC_GUARD_CONNECTIONSTATE || '1') === '1';
const FLAG_RESTART_ICE = String(import.meta.env?.VITE_WEBRTC_RESTART_ICE || '1') === '1';
// Host-only fallback (no STUN)
const FLAG_HOST_ONLY_FALLBACK = String(import.meta.env?.VITE_WEBRTC_HOST_ONLY_FALLBACK || '1') === '1';
const CONNECT_TIMEOUT_MS = Math.max(5000, Number(import.meta.env?.VITE_WEBRTC_TIMEOUT_MS || 15000));
const LOG_LEVEL = String(import.meta.env?.VITE_WEBRTC_LOG_LEVEL || 'none').toLowerCase();
const BREADCRUMBS = String(import.meta.env?.VITE_WEBRTC_BREADCRUMBS || '0') === '1';
const FLAG_AUTO_GREETING = String(import.meta.env?.VITE_WEBRTC_AUTO_GREETING || '1') === '1';
const ICE_DISCONNECT_DEBOUNCE_MS = Math.max(5000, Number(import.meta.env?.VITE_WEBRTC_ICE_DISCONNECT_DEBOUNCE_MS || 12000));
const FLAG_AUTO_VAD_RESPONSE = String(import.meta.env?.VITE_WEBRTC_AUTO_VAD_RESPONSE || '1') === '1';
const INBOUND_IDLE_RESTART_MS = Math.max(10000, Number(import.meta.env?.VITE_WEBRTC_INBOUND_IDLE_RESTART_MS || 25000));
const INBOUND_IDLE_RECONNECT_MS = Math.max(20000, Number(import.meta.env?.VITE_WEBRTC_INBOUND_IDLE_RECONNECT_MS || 45000));
const FLAG_OAI_PING = String(import.meta.env?.VITE_WEBRTC_OAI_PING || '1') === '1';
const OAI_PING_MS = Math.max(8000, Number(import.meta.env?.VITE_WEBRTC_OAI_PING_MS || 20000));

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

// Accessor for server-provided oai-events channel (do not create proactively)
function getOaiChannel() {
  try {
    if (oaiDc && (oaiDc.readyState === 'open' || oaiDc.readyState === 'connecting')) return oaiDc;
  } catch {}
  return null;
}

function sendResponseCreate() {
  try {
    // Mark awaiting immediately so stall monitor can kick in even if channel opens late
    awaitingResponse = true;
    awaitingResponseSince = Date.now();
    const trySend = (attempt = 0) => {
      try {
        const ch = getOaiChannel();
        if (ch && ch.readyState === 'open') {
          oaiDc.send(JSON.stringify({ type: 'response.create' }));
          addCrumb('response_create_sent');
          responseRetryCount = 0;
          return;
        }
      } catch {}
      if (attempt < 10) {
        setTimeout(() => trySend(attempt + 1), 300);
      }
    };
    trySend(0);
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
let awaitingResponse = false;
let everConnected = false;
let sentInitialResponse = false;
let iceDisconnectTimer = null;
let responseRetryCount = 0;
let awaitingResponseSince = 0;
let lastOutboundAudioBytes = 0;
let lastOutboundCheckAt = 0;
let userVoiceActive = false;
let voiceSilentSince = 0;
let lastInboundHeardAt = 0;
let everHeardInbound = false;
let longIdleRestartAttempt = 0;
let oaiRestartTimer = null;
let forceReconnectOnIceExhaust = false;
let oaiPingTimer = null;

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

    // Ensure an audio transceiver exists (stable sender for PTT replaceTrack)
    try {
      const hasAudioTx = pc.getTransceivers?.().some(t => (t.sender?.track?.kind === 'audio') || (t.receiver?.track?.kind === 'audio'));
      if (!hasAudioTx) pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch {}

    // Remote media
    remoteStreamRef = new MediaStream();
    pc.ontrack = (e) => {
      try {
        const addIfMissing = (track) => {
          if (!track) return;
          const exists = remoteStreamRef.getTracks().some(t => t.id === track.id);
          if (!exists) remoteStreamRef.addTrack(track);
          try {
            track.onmute = () => {
              try {
                remoteStreamRef = new MediaStream(remoteStreamRef.getTracks());
                setRemoteStream(remoteStreamRef);
              } catch {}
            };
            track.onunmute = () => {
              try {
                remoteStreamRef = new MediaStream(remoteStreamRef.getTracks());
                setRemoteStream(remoteStreamRef);
              } catch {}
            };
            track.onended = () => {
              try {
                // Remove ended track and re-emit stream
                const current = remoteStreamRef.getTracks();
                current.forEach(t => { if (t.id === track.id) { try { remoteStreamRef.removeTrack(t); } catch {} } });
                remoteStreamRef = new MediaStream(remoteStreamRef.getTracks());
                setRemoteStream(remoteStreamRef);
              } catch {}
            };
          } catch {}
        };
        if (e.streams && e.streams[0]) {
          e.streams[0].getTracks().forEach(addIfMissing);
        } else if (e.track) {
          addIfMissing(e.track);
        }
      } catch {}
      try {
        remoteStreamRef = new MediaStream(remoteStreamRef.getTracks());
        setRemoteStream(remoteStreamRef);
      } catch { setRemoteStream(remoteStreamRef); }
    };

    pc.onicecandidateerror = (e) => {
      // Surface ICE errors to UI for diagnostics
      const detail = `${e?.errorText || e?.type || 'unknown'}`;
      addCrumb('ice_error', { detail });
      log('warn', 'icecandidateerror', { detail });
      // Don't surface ICE candidate errors directly in UI; keep in breadcrumbs/logs only
      // Trigger host-only fallback if DNS/lookup error on STUN and flag enabled
      if (FLAG_HOST_ONLY_FALLBACK && !hostOnlyAttempted && !everConnected && /lookup|dns/i.test(detail || '')) {
        try { if (fallbackTimer) clearTimeout(fallbackTimer); } catch {}
        fallbackTimer = setTimeout(() => {
          if (!pc || pc.connectionState === 'connected') return;
          fallbackToHostOnly().catch(() => {});
        }, 1000);
      }
    };

    // No custom keepalive DataChannel; rely on ICE checks and continuous opus frames (usedtx=0)

    // Capture OpenAI Realtime events channel created by the server (no custom pings)
    try {
      pc.ondatachannel = (ev) => {
        const ch = ev?.channel;
        if (ch && ch.label === 'oai-events') {
          oaiDc = ch;
          oaiDc.onopen = () => {
            addCrumb('oai_dc_open');
            // Start lightweight heartbeat to keep channel/session active
            try { if (oaiPingTimer) clearInterval(oaiPingTimer); } catch {}
            if (FLAG_OAI_PING) {
              oaiPingTimer = setInterval(() => {
                try {
                  if (oaiDc && oaiDc.readyState === 'open') {
                    oaiDc.send(JSON.stringify({ type: 'ping' }));
                  }
                } catch {}
              }, OAI_PING_MS);
            }
          };
          const clearOai = () => {
            addCrumb('oai_dc_closed');
            // If PC stays connected but channel closes, try an ICE restart to re-establish channels
            try { if (oaiRestartTimer) clearTimeout(oaiRestartTimer); } catch {}
            try { if (oaiPingTimer) clearInterval(oaiPingTimer); } catch {}
            oaiPingTimer = null;
            oaiRestartTimer = setTimeout(() => {
              if (pc && pc.connectionState === 'connected') {
                setConnectionState('reconnecting');
                scheduleIceRestartBackoff('oai_dc_closed');
              }
            }, 1200);
          };
          oaiDc.onclose = clearOai;
          oaiDc.onerror = clearOai;
          oaiDc.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev?.data || '{}');
              const t = String(msg?.type || msg?.event || '');
              if (/response\.(completed|error|refused)/i.test(t)) {
                awaitingResponse = false;
                responseRetryCount = 0;
                addCrumb('response_done', { t });
              }
            } catch {}
          };
          // optional onmessage: ignored to keep logs silent by default
        }
      };
    } catch {}
    // Do not proactively create here to avoid duplicate channels; server provides it.

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      addCrumb('pc_state_change', { state });
      log('info', `pc.connectionState=${state}`);
      if (state === 'connected') {
        setConnectionState('connected');
        try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
        connectTimeoutTimer = null;
        iceBackoffAttempt = 0;
        everConnected = true;
        // Auto-greet once to keep session/media active even if user is silent
        if (FLAG_AUTO_GREETING && !sentInitialResponse) {
          sentInitialResponse = true;
          setTimeout(() => { sendResponseCreate(); }, 200);
        }
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
      if (s === 'connected') {
        try { if (iceDisconnectTimer) clearTimeout(iceDisconnectTimer); } catch {}
        iceDisconnectTimer = null;
        return;
      }
      if (s === 'disconnected' && FLAG_RESTART_ICE) {
        try { if (iceDisconnectTimer) clearTimeout(iceDisconnectTimer); } catch {}
        iceDisconnectTimer = setTimeout(() => {
          if (!pc || pc.iceConnectionState !== 'disconnected') return;
          setConnectionState('reconnecting');
          scheduleIceRestartBackoff('disconnected');
        }, ICE_DISCONNECT_DEBOUNCE_MS);
        return;
      }
      if (s === 'failed' && FLAG_RESTART_ICE) {
        setConnectionState('reconnecting');
        scheduleIceRestartBackoff('failed');
      }
    };

    return pc;
  }, [setRemoteStream, setConnectionState]);

  const scheduleIceRestartBackoff = (reason) => {
    if (reason === 'inbound_idle' || reason === 'oai_dc_closed' || reason === 'no_inbound_audio') {
      forceReconnectOnIceExhaust = true;
    }
    const allowWhileConnected = (reason === 'inbound_idle' || reason === 'oai_dc_closed' || reason === 'no_inbound_audio');
    try { if (iceBackoffTimer) clearTimeout(iceBackoffTimer); } catch {}
    const delays = [1000, 2000, 4000, 10000];
    const attempt = Math.min(iceBackoffAttempt, delays.length - 1);
    const wait = delays[attempt];
    iceBackoffTimer = setTimeout(async () => {
      if (!pc) return;
      if (pc.connectionState === 'connected' && !allowWhileConnected) return;
      addCrumb('ice_restart_attempt', { attempt: iceBackoffAttempt + 1, reason });
      log('info', 'ICE restart attempt', { attempt: iceBackoffAttempt + 1, reason });
      try {
        if (allowWhileConnected) {
          try { setConnectionState('reconnecting'); } catch {}
        }
        if (typeof pc.restartIce === 'function') {
          pc.restartIce();
        } else {
          await iceRestart();
        }
        iceBackoffAttempt += 1;
        if (iceBackoffAttempt >= delays.length) {
          // Maxed out; reconnect or fallback even if state still shows connected
          setTimeout(() => {
            addCrumb('ice_restart_exhausted');
            log('warn', 'ICE restart attempts exhausted');
            if (!everConnected && FLAG_HOST_ONLY_FALLBACK && !hostOnlyAttempted) {
              fallbackToHostOnly().catch(() => {});
            } else if (forceReconnectOnIceExhaust || (pc && pc.connectionState !== 'connected')) {
              try { reconnect(); } catch {}
            }
            forceReconnectOnIceExhaust = false;
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
      try { oaiDc?.close(); } catch {}
      try { if (iceRestartTimer) clearTimeout(iceRestartTimer); } catch {}
      try { if (iceBackoffTimer) clearTimeout(iceBackoffTimer); } catch {}
      try { if (statsTimer) clearInterval(statsTimer); } catch {}
      try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
      iceRestartTimer = null; iceBackoffTimer = null; statsTimer = null; connectTimeoutTimer = null;
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
      // Reset per-call flags
      sentInitialResponse = false;
      awaitingResponse = false;
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

      // Start stats watcher: detect stalled inbound audio (assistant speech)
      // and simple local VAD (user end-of-speech) to auto-trigger responses.
      try { if (statsTimer) clearInterval(statsTimer); } catch {}
      lastInboundAudioBytes = 0;
      lastInboundCheckAt = Date.now();
      lastOutboundAudioBytes = 0;
      lastOutboundCheckAt = Date.now();
      userVoiceActive = false;
      voiceSilentSince = 0;
      statsTimer = setInterval(async () => {
        try {
          if (!pc || pc.connectionState !== 'connected') return;
          const stats = await pc.getStats();
          let inbound = 0;
          let outbound = 0;
          stats.forEach((r) => {
            const isAudio = (r.kind || r.mediaType) === 'audio';
            if (r.type === 'inbound-rtp' && isAudio) {
              inbound += r.bytesReceived || 0;
            } else if (r.type === 'outbound-rtp' && isAudio) {
              outbound += r.bytesSent || 0;
            }
          });
          const now = Date.now();
          const deltaBytes = inbound - lastInboundAudioBytes;
          const deltaMs = now - lastInboundCheckAt;
          const deltaOutBytes = outbound - lastOutboundAudioBytes;
          const deltaOutMs = now - lastOutboundCheckAt;

          // Simple VAD: detect end-of-speech and trigger response if enabled
          if (FLAG_AUTO_VAD_RESPONSE) {
            // thresholds tuned for 2s interval; adapt if deltaOutMs differs
            const talking = deltaOutBytes > 1800; // ~7.2 kbps over 2s
            if (talking) {
              userVoiceActive = true;
              voiceSilentSince = 0;
            } else {
              if (userVoiceActive && voiceSilentSince === 0) voiceSilentSince = now;
              const silentLongEnough = userVoiceActive && voiceSilentSince && (now - voiceSilentSince >= 1400);
              if (silentLongEnough && !awaitingResponse) {
                addCrumb('vad_silence_commit');
                sendResponseCreate();
                // Reset VAD state to avoid repeated triggers
                userVoiceActive = false;
                voiceSilentSince = 0;
              }
            }
          }

          // Only monitor stalls while we are actually awaiting a response
          if (awaitingResponse) {
            // If oai-events channel is not open for a while, escalate to reconnect
            if ((!oaiDc || oaiDc.readyState !== 'open') && (now - (awaitingResponseSince || now)) >= 8000) {
              addCrumb('oai_dc_missing_reconnect');
              try { reconnect(); } catch {}
              // avoid immediate repeat; give it time
              awaitingResponseSince = now;
            }
            // If nothing after 6s, try one resend of response.create
            if (deltaBytes <= 10 && deltaMs >= 6000 && responseRetryCount < 1) {
              addCrumb('response_resend');
              sendResponseCreate();
              responseRetryCount += 1;
              // don't early return; still update baselines to avoid rapid repeats
            }
            // If no bytes in >=15s after asking for a response, consider nudging ICE
            if (deltaBytes <= 50 && deltaMs >= 15000) {
              addCrumb('no_inbound_audio');
              log('warn', 'No inbound audio detected while awaiting response');
              forceReconnectOnIceExhaust = true;
              scheduleIceRestartBackoff('no_inbound_audio');
              // reset baseline after attempt
              lastInboundAudioBytes = inbound;
              lastInboundCheckAt = now;
              return;
            }
            // If we started receiving audio, stop awaiting
            if (deltaBytes > 200) {
              awaitingResponse = false;
              responseRetryCount = 0;
            }
          }
          // Track general inbound activity to detect long mute while "connected"
          if (deltaBytes > 10) {
            everHeardInbound = true;
            lastInboundHeardAt = now;
            // reset idle attempts once traffic flows again
            longIdleRestartAttempt = 0;
          }
          if (!awaitingResponse && everHeardInbound) {
            const idleFor = now - (lastInboundHeardAt || lastInboundCheckAt);
            if (idleFor >= INBOUND_IDLE_RECONNECT_MS && longIdleRestartAttempt >= 2) {
              addCrumb('inbound_idle_reconnect', { idle_ms: idleFor });
              try { reconnect(); } catch {}
              longIdleRestartAttempt = 0;
            } else if (idleFor >= INBOUND_IDLE_RESTART_MS && longIdleRestartAttempt < 2) {
              addCrumb('inbound_idle_restart', { idle_ms: idleFor });
              scheduleIceRestartBackoff('inbound_idle');
              longIdleRestartAttempt += 1;
            }
          }
          lastInboundAudioBytes = inbound;
          lastInboundCheckAt = now;
          lastOutboundAudioBytes = outbound;
          lastOutboundCheckAt = now;
        } catch {}
      }, 2000);

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

  // Live mode: PTT removed. Mic is attached according to micOn toggle via ensureStreams/startConnection.

  const stopConnection = useCallback(() => {
    try {
      if (pc) {
        try { pc.getSenders().forEach(s => s.track && s.track.stop()); } catch {}
        try { pc.close(); } catch {}
      }
    } catch {}
    try { oaiDc?.close(); } catch {}
    try { if (iceRestartTimer) clearTimeout(iceRestartTimer); } catch {}
    try { if (iceBackoffTimer) clearTimeout(iceBackoffTimer); } catch {}
    try { if (statsTimer) clearInterval(statsTimer); } catch {}
    try { if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer); } catch {}
    try { if (fallbackTimer) clearTimeout(fallbackTimer); } catch {}
    try { if (iceDisconnectTimer) clearTimeout(iceDisconnectTimer); } catch {}
    try { if (oaiRestartTimer) clearTimeout(oaiRestartTimer); } catch {}
    try { if (oaiPingTimer) clearInterval(oaiPingTimer); } catch {}
    oaiDc = null;
    iceRestartTimer = null;
    iceBackoffTimer = null;
    iceDisconnectTimer = null;
    oaiRestartTimer = null;
    oaiPingTimer = null;
    statsTimer = null;
    connectTimeoutTimer = null;
    fallbackTimer = null;
    hostOnlyAttempted = false;
    awaitingResponse = false;
    everConnected = false;
    sentInitialResponse = false;
    everHeardInbound = false;
    lastInboundHeardAt = 0;
    longIdleRestartAttempt = 0;
    pc = null;
    setConnectionState('disconnected');
  }, [setConnectionState]);

  const reconnect = useCallback(async () => {
    setConnectionState('reconnecting');
    try {
      // Force a fresh peer connection on reconnect to recover from failures
      try { pc?.close(); } catch {}
      pc = null;
      // Preserve current toggles in live mode
      await startConnection({ mic: micOn, cam: camOn, replaceTracks: true, stunOnly: false });
    } catch (e) {
      setConnectionState('disconnected');
      throw e;
    }
  }, [startConnection, micOn, camOn, setConnectionState]);

  const requestResponse = useCallback(() => {
    try { sendResponseCreate(); } catch {}
  }, []);

  return { startConnection, stopConnection, snapshotFromVideo, reconnect, requestResponse };
}

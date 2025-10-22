import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  fetchAssistantSettings,
  ensureAssistantLimits,
  updateAssistantLimits,
  insertAssistantMetric,
  updateAssistantMetric,
} from '@/lib/assistantApi';
import { usePerfectNegotiation } from '@/hooks/usePerfectNegotiation';

const AssistantContext = createContext(null);

const INITIAL_CALL_STATE = 'idle';

function waitForIceGatheringComplete(peer) {
  if (peer.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const checkState = () => {
      if (peer.iceGatheringState === 'complete') {
        peer.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    peer.addEventListener('icegatheringstatechange', checkState);
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      } else {
        reject(new Error('Unsupported file reader result'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const AssistantProvider = ({ children }) => {
  const { user, authReady, sessionReady } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [callState, setCallState] = useState(INITIAL_CALL_STATE);
  const [lastError, setLastError] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [limits, setLimits] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [dataChannelReady, setDataChannelReady] = useState(false);
  const [imagesSent, setImagesSent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mintResponseRef = useRef(null);
  const sessionIdRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const desiredVideoRef = useRef(false);
  const imagesSentRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const metricsRef = useRef({ bytesUp: 0, bytesDown: 0 });
  const timerRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const dataChannelRef = useRef(null);
  const callStartRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const connectPeerRef = useRef(null);
  const stopCallRef = useRef(null);
  const configRetryTimeoutRef = useRef(null);
  const configRetryCountRef = useRef(0);

  const {
    start: startNegotiation,
    stop: stopNegotiation,
    getNegotiator,
  } = usePerfectNegotiation({ polite: true });

  const resetSessionState = useCallback(() => {
    mintResponseRef.current = null;
    sessionIdRef.current = null;
    reconnectAttemptsRef.current = 0;
    desiredVideoRef.current = false;
    dataChannelRef.current = null;
    remoteStreamRef.current = null;
    metricsRef.current = { bytesUp: 0, bytesDown: 0 };
    imagesSentRef.current = 0;
    elapsedSecondsRef.current = 0;
    setImagesSent(0);
    setElapsedSeconds(0);
    setVideoEnabled(false);
    setDataChannelReady(false);
    setLocalStream(null);
    setRemoteStream(null);
    setLastError(null);
    setQuotaError(null);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  const refreshConfig = useCallback(async () => {
    if (!authReady || !sessionReady || !user) {
      setSettings(null);
      setLimits(null);
      setConfigError(null);
      setConfigLoading(false);
      configRetryCountRef.current = 0;
      if (configRetryTimeoutRef.current) {
        clearTimeout(configRetryTimeoutRef.current);
        configRetryTimeoutRef.current = null;
      }
      return;
    }

    setConfigLoading(true);
    setConfigError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('assistant_session_unavailable');
      }

      const [settingsData, limitsData] = await Promise.all([
        fetchAssistantSettings(),
        ensureAssistantLimits(user.id),
      ]);
      setSettings(settingsData);
      setLimits(limitsData);
      configRetryCountRef.current = 0;
      if (configRetryTimeoutRef.current) {
        clearTimeout(configRetryTimeoutRef.current);
        configRetryTimeoutRef.current = null;
      }
    } catch (error) {
      if (error?.code === '42501' || error?.message === 'assistant_session_unavailable') {
        console.warn('assistant config deferred; session not ready yet.', error);
        const attempts = configRetryCountRef.current + 1;
        configRetryCountRef.current = attempts;
        if (attempts <= 6) {
          if (configRetryTimeoutRef.current) {
            clearTimeout(configRetryTimeoutRef.current);
          }
          configRetryTimeoutRef.current = setTimeout(() => {
            configRetryTimeoutRef.current = null;
            refreshConfig();
          }, 500 * attempts);
          return;
        }
        console.error('assistant config permanently denied after retries', error);
        return;
      }
      console.error('assistant config load failed', error);
      setConfigError(error);
    } finally {
      setConfigLoading(false);
    }
  }, [authReady, sessionReady, user]);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  const evaluateTimeQuota = useCallback((extraSeconds = 0) => {
    if (!limits) return Infinity;
    const perDaySeconds = (limits.minutes_per_day ?? 0) * 60;
    if (perDaySeconds === 0) return 0;
    const alreadyUsed = limits.seconds_used_today ?? 0;
    return Math.max(0, perDaySeconds - alreadyUsed - extraSeconds);
  }, [limits]);

  const scheduleStatsCollection = useCallback((peer) => {
    if (!peer) return;
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    statsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await peer.getStats();
        let bytesUp = 0;
        let bytesDown = 0;
        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && typeof report.bytesSent === 'number') {
            bytesUp += report.bytesSent;
          }
          if (report.type === 'inbound-rtp' && typeof report.bytesReceived === 'number') {
            bytesDown += report.bytesReceived;
          }
        });
        metricsRef.current = {
          bytesUp,
          bytesDown,
        };
      } catch (error) {
        console.debug('assistant stats loop failed', error);
      }
    }, 4000);
  }, []);

  const startElapsedTimer = useCallback(() => {
    clearTimers();
    callStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!callStartRef.current) return;
      const elapsed = Math.floor((Date.now() - callStartRef.current) / 1000);
      elapsedSecondsRef.current = elapsed;
      setElapsedSeconds(elapsed);
      const remaining = evaluateTimeQuota(elapsed);
      if (remaining <= 0) {
        setQuotaError('minutes');
        stopCall({ reason: 'quota_exceeded' });
      }
    }, 1000);
  }, [clearTimers, evaluateTimeQuota]);

  const teardownConnection = useCallback(async ({ reason = 'hangup', skipMetrics = false } = {}) => {
    clearTimers();
    await stopNegotiation({ reason, resetHandlers: false });
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (_) {
        // ignore
      }
      dataChannelRef.current = null;
    }
    resetSessionState();
    if (!skipMetrics) {
      setCallState(INITIAL_CALL_STATE);
    }
  }, [clearTimers, resetSessionState, stopNegotiation]);

  const sendOfferToOpenAI = useCallback(async (peer, secret, model) => {
    const negotiator = getNegotiator();
    negotiator.updateFlags({ makingOffer: true });
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGatheringComplete(peer);
      const localDescription = peer.localDescription;
      if (!localDescription) {
        throw new Error('Missing local description');
      }
      const answerResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/sdp',
        },
        body: localDescription.sdp,
      });
      if (!answerResponse.ok) {
        const text = await answerResponse.text();
        throw new Error(`OpenAI answer failed: ${answerResponse.status} ${text}`);
      }
      const answerSdp = await answerResponse.text();
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } finally {
      negotiator.updateFlags({ makingOffer: false });
    }
  }, [getNegotiator]);

  const configureDataChannel = useCallback((peer, flags) => {
    const channel = peer.createDataChannel('oai-events');
    dataChannelRef.current = channel;
    channel.onopen = () => {
      setDataChannelReady(true);
      if (flags && typeof flags === 'object') {
        const sessionUpdate = {};
        if (typeof flags.instructions === 'string' && flags.instructions.length > 0) {
          sessionUpdate.instructions = flags.instructions;
        }
        if (typeof flags.temperature === 'number') {
          sessionUpdate.temperature = flags.temperature;
        }
        if (typeof flags.response_modalities === 'object') {
          sessionUpdate.modalities = flags.response_modalities;
        }
        if (Object.keys(sessionUpdate).length > 0) {
          try {
            channel.send(JSON.stringify({ type: 'session.update', session: sessionUpdate }));
          } catch (error) {
            console.warn('assistant failed to send session.update', error);
          }
        }
      }
    };
    channel.onclose = () => {
      setDataChannelReady(false);
    };
    channel.onerror = (event) => {
      console.error('assistant datachannel error', event);
      setDataChannelReady(false);
    };
    channel.onmessage = () => {
      // No-op for now; UI handles display in module if needed.
    };
  }, []);

  const connectPeer = useCallback(async ({ withVideo = false, isReconnect = false } = {}) => {
    if (!settings) {
      throw new Error('Assistant settings unavailable');
    }

    const sessionId = sessionIdRef.current || uuidv4();
    sessionIdRef.current = sessionId;

    const { data: minted, error } = await supabase.functions.invoke('assistant-mint-key', {
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (error) {
      console.error('assistant mint key failed', error);
      throw error;
    }
    if (!minted || !minted.secret) {
      throw new Error('Ephemeral token missing');
    }

    mintResponseRef.current = minted;
    desiredVideoRef.current = withVideo;

    const mintedIceServers = Array.isArray(minted.iceServers) ? minted.iceServers : [];
    const settingsIceServers = Array.isArray(settings?.ice_servers) ? settings.ice_servers : [];
    const rtcServers = mintedIceServers.length ? mintedIceServers : settingsIceServers;
    const rtcConfig = { iceServers: rtcServers };

    const { peer, streams } = await startNegotiation({
      configOverride: rtcConfig,
      audio: true,
      video: withVideo,
      onStream: (stream) => {
        setLocalStream(stream);
      },
    });

    if (streams && streams.length > 0) {
      setLocalStream(streams[0]);
    }

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setCallState('connected');
        reconnectAttemptsRef.current = 0;
        return;
      }
      if (state === 'failed' || state === 'disconnected') {
        const mint = mintResponseRef.current;
        if (!mint) {
          setCallState('error');
          setLastError({ code: 'connection', message: state });
          return;
        }
        const maxAttempts = mint.reconnect?.maxAttempts ?? 0;
        if (reconnectAttemptsRef.current >= maxAttempts) {
          setCallState('error');
          setLastError({ code: 'reconnect_failed', message: state });
          stopCallRef.current?.({ reason: 'reconnect_failed' });
          return;
        }
        reconnectAttemptsRef.current += 1;
        setCallState('reconnecting');
        const delay = (mint.reconnect?.backoffMs ?? 2000) * reconnectAttemptsRef.current;
        setTimeout(() => {
          const retryConnect = connectPeerRef.current;
          if (!retryConnect) return;
          retryConnect({ withVideo: desiredVideoRef.current, isReconnect: true })
            .catch((err) => {
              console.error('assistant reconnect failed', err);
              setLastError({ code: 'reconnect_failed', message: err.message });
              stopCallRef.current?.({ reason: 'reconnect_failed' });
            });
        }, delay);
      }
    };

    configureDataChannel(peer, minted.flags ?? settings.flags);

    await sendOfferToOpenAI(peer, minted.secret, minted.model ?? settings.model);

    if (!isReconnect && user?.id) {
      try {
        await insertAssistantMetric({
          user_id: user.id,
          session_id: sessionId,
          started_at: new Date().toISOString(),
        });
      } catch (metricError) {
        console.error('assistant metric insert failed', metricError);
      }
    }

    setCallState('connected');
    setLastError(null);
    startElapsedTimer();
    scheduleStatsCollection(peer);
  }, [configureDataChannel, insertAssistantMetric, scheduleStatsCollection, sendOfferToOpenAI, settings, startElapsedTimer, startNegotiation, user?.id]);

  useEffect(() => {
    connectPeerRef.current = connectPeer;
  }, [connectPeer]);

  const startCall = useCallback(async ({ withVideo = false } = {}) => {
    if (!user) {
      setLastError({ code: 'auth', message: 'Connexion requise' });
      return { ok: false, reason: 'auth' };
    }
    if (callState === 'connecting' || callState === 'connected') {
      return { ok: false, reason: 'already_connected' };
    }
    const remaining = evaluateTimeQuota();
    if (remaining <= 0) {
      setQuotaError('minutes');
      return { ok: false, reason: 'quota_minutes' };
    }
    if ((limits?.concurrent_sessions ?? 1) < 1) {
      setQuotaError('sessions');
      return { ok: false, reason: 'quota_sessions' };
    }

    setCallState('connecting');
    setLastError(null);
    setQuotaError(null);
    imagesSentRef.current = 0;
    setImagesSent(0);

    try {
      await connectPeer({ withVideo, isReconnect: false });
      return { ok: true };
    } catch (error) {
      console.error('assistant startCall error', error);
      setLastError({ code: 'start_failed', message: error.message });
      setCallState('error');
      await teardownConnection({ reason: 'start_failed', skipMetrics: true });
      return { ok: false, reason: 'start_failed' };
    }
  }, [callState, connectPeer, evaluateTimeQuota, limits?.concurrent_sessions, teardownConnection, user]);

  const finalizeMetrics = useCallback(async ({ reason = 'hangup' } = {}) => {
    if (!user?.id || !sessionIdRef.current) return;
    const duration = elapsedSecondsRef.current;
    try {
      await updateAssistantMetric(user.id, sessionIdRef.current, {
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        images_sent: imagesSentRef.current,
        bytes_up: metricsRef.current.bytesUp,
        bytes_down: metricsRef.current.bytesDown,
        error_code: reason === 'hangup' ? null : reason,
      });
    } catch (error) {
      console.error('assistant metric update failed', error);
    }
    if (limits) {
      try {
        const updated = await updateAssistantLimits(user.id, {
          seconds_used_today: Math.min((limits.seconds_used_today ?? 0) + duration, (limits.minutes_per_day ?? 0) * 60),
          images_sent_today: (limits.images_sent_today ?? 0) + imagesSentRef.current,
          sessions_started_today: (limits.sessions_started_today ?? 0) + 1,
        });
        setLimits(updated);
      } catch (error) {
        console.error('assistant limits update failed', error);
      }
    }
  }, [limits, updateAssistantLimits, updateAssistantMetric, user?.id]);

  const stopCall = useCallback(async ({ reason = 'hangup' } = {}) => {
    await finalizeMetrics({ reason });
    await teardownConnection({ reason });
  }, [finalizeMetrics, teardownConnection]);

  useEffect(() => {
    stopCallRef.current = stopCall;
  }, [stopCall]);

  useEffect(() => {
    if (user && sessionReady) {
      return;
    }

    configRetryCountRef.current = 0;
    if (configRetryTimeoutRef.current) {
      clearTimeout(configRetryTimeoutRef.current);
      configRetryTimeoutRef.current = null;
    }

    if (callState !== INITIAL_CALL_STATE) {
      const handler = stopCallRef.current;
      if (handler) {
        Promise.resolve(handler({ reason: 'signout' })).catch(() => {});
      }
    }

    resetSessionState();
    setSettings(null);
    setLimits(null);
    setConfigError(null);
    setQuotaError(null);
    setConfigLoading(false);
  }, [user, sessionReady, callState, resetSessionState]);

  const toggleVideo = useCallback(async () => {
    const mint = mintResponseRef.current;
    if (!mint || !mint.session) {
      console.warn('assistant toggleVideo ignored: no active session');
      return;
    }
    const enabling = !videoEnabled;
    desiredVideoRef.current = enabling;
    setVideoEnabled(enabling);
    const currentPeer = getNegotiator().getPeer?.();
    if (!currentPeer) {
      return;
    }
    if (enabling) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 } } });
        const [track] = stream.getVideoTracks();
        if (track) {
          const sender = currentPeer.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(track);
          } else {
            currentPeer.addTrack(track, stream);
          }
        }
      } catch (error) {
        console.error('assistant enable video failed', error);
        setVideoEnabled(false);
        desiredVideoRef.current = false;
      }
    } else {
      currentPeer.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.stop();
          sender.replaceTrack(null);
        }
      });
    }
  }, [getNegotiator, videoEnabled]);

  const sendImage = useCallback(async (file) => {
    if (!file) return { ok: false, reason: 'no_file' };
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return { ok: false, reason: 'channel_closed' };
    }
    const limit = limits?.images_per_session ?? Infinity;
    if (imagesSentRef.current >= limit) {
      setQuotaError('images');
      return { ok: false, reason: 'quota_images' };
    }
    try {
      const base64 = await readFileAsBase64(file);
      const payload = {
        type: 'input_image_buffer.append',
        data: base64,
        mime_type: file.type || 'image/png',
        name: file.name,
      };
      dataChannelRef.current.send(JSON.stringify(payload));
      dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
      metricsRef.current.bytesUp += Math.floor(base64.length * 0.75);
      const nextCount = imagesSentRef.current + 1;
      imagesSentRef.current = nextCount;
      setImagesSent(nextCount);
      return { ok: true };
    } catch (error) {
      console.error('assistant sendImage failed', error);
      setLastError({ code: 'image_send_failed', message: error.message });
      return { ok: false, reason: 'send_failed' };
    }
  }, [limits?.images_per_session]);

  useEffect(() => () => {
    clearTimers();
    if (configRetryTimeoutRef.current) {
      clearTimeout(configRetryTimeoutRef.current);
      configRetryTimeoutRef.current = null;
    }
  }, [clearTimers]);

  const value = useMemo(() => ({
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    callState,
    startCall,
    stopCall,
    toggleVideo,
    sendImage,
    lastError,
    quotaError,
    settings,
    limits,
    configLoading,
    configError,
    dataChannelReady,
    videoEnabled,
    localStream,
    remoteStream,
    imagesSent,
    elapsedSeconds,
    refreshConfig,
  }), [
    callState,
    closeDrawer,
    configError,
    configLoading,
    dataChannelReady,
    drawerOpen,
    elapsedSeconds,
    imagesSent,
    lastError,
    limits,
    localStream,
    openDrawer,
    quotaError,
    refreshConfig,
    remoteStream,
    sendImage,
    settings,
    startCall,
    stopCall,
    toggleDrawer,
    toggleVideo,
    videoEnabled,
  ]);

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
};



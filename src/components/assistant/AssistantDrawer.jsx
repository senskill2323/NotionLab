import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhoneCall, PhoneOff, Video, VideoOff, Image as ImageIcon, X, Loader2, ShieldAlert } from 'lucide-react';
import { useAssistant } from '@/contexts/AssistantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusLabels = {
  idle: 'Disponible',
  connecting: 'Connexion en cours…',
  connected: 'En session',
  reconnecting: 'Reconnexion…',
  ending: 'Fin de session…',
  error: 'Erreur',
};

const quotaMessages = {
  minutes: 'Temps quotidien épuisé',
  sessions: 'Accès simultané non autorisé',
  images: "Limite d'images atteinte",
};

const CallBadge = ({ state }) => {
  const label = statusLabels[state] || state;
  const variant = state === 'connected' ? 'default' : state === 'error' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{label}</Badge>;
};

const AssistantDrawer = () => {
  const {
    drawerOpen,
    closeDrawer,
    callState,
    startCall,
    stopCall,
    toggleVideo,
    sendImage,
    videoEnabled,
    dataChannelReady,
    localStream,
    remoteStream,
    quotaError,
    lastError,
    settings,
    limits,
    imagesSent,
    elapsedSeconds,
    configLoading,
    configError,
    refreshConfig,
  } = useAssistant();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sendingImage, setSendingImage] = useState(false);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream ?? null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream ?? null;
    }
  }, [localStream]);

  const connected = callState === 'connected';
  const connecting = callState === 'connecting' || callState === 'reconnecting';
  const idle = callState === 'idle';
  const settingsReady = Boolean(settings);

  const remainingInfo = useMemo(() => {
    if (!limits) {
      return { seconds: Infinity, images: Infinity, limit: Infinity };
    }
    const perDaySeconds = (limits.minutes_per_day ?? 0) * 60;
    const usedSeconds = (limits.seconds_used_today ?? 0) + (connected ? elapsedSeconds : 0);
    const remainingSeconds = Math.max(perDaySeconds - usedSeconds, 0);
    const imagesPerSession = limits.images_per_session ?? Infinity;
    const remainingImages = Math.max(imagesPerSession - imagesSent, 0);
    return { seconds: remainingSeconds, images: remainingImages, limit: imagesPerSession };
  }, [connected, elapsedSeconds, imagesSent, limits]);

  const minutesRemaining = useMemo(() => {
    if (!Number.isFinite(remainingInfo.seconds)) return '—';
    const minutes = Math.floor(remainingInfo.seconds / 60);
    const seconds = remainingInfo.seconds % 60;
    return `${minutes}m ${seconds}s`;
  }, [remainingInfo.seconds]);

  const imagesLimitLabel = useMemo(() => {
    if (!Number.isFinite(remainingInfo.limit)) {
      return `${imagesSent}`;
    }
    return `${imagesSent} / ${remainingInfo.limit}`;
  }, [imagesSent, remainingInfo.limit]);

  const handleCall = async () => {
    if (connected || connecting || !settingsReady) return;
    await startCall({ withVideo: videoEnabled });
  };

  const handleHangup = async () => {
    if (idle && !connecting) return;
    await stopCall({ reason: 'hangup' });
  };

  const handleToggleVideo = async () => {
    if (!connected) return;
    await toggleVideo();
  };

  const handleSendImage = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    setSendingImage(true);
    try {
      await sendImage(file);
    } finally {
      setSendingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const callDisabled = connecting || connected || !settingsReady || configLoading;
  const hangupDisabled = idle && !connecting;
  const videoToggleDisabled = !connected || !settingsReady;
  const imageDisabled = !connected || !dataChannelReady || sendingImage || !settingsReady;

  return (
    <div
      className={cn(
        'fixed top-16 right-0 z-50 h-[calc(100vh-4rem)] w-full max-w-md transform transition-transform duration-300 ease-in-out',
        drawerOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex h-full flex-col border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Assistant IA</h2>
            <p className="text-xs text-muted-foreground">OpenAI Realtime - {settings?.model || 'gpt-4o'}</p>
          </div>
          <div className="flex items-center gap-2">
            {configLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Button variant="ghost" size="icon" onClick={closeDrawer} aria-label="Fermer le panneau">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3">
          {configError && (
            <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>Configuration indisponible</span>
              <Button size="sm" variant="outline" onClick={refreshConfig}>Réessayer</Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <CallBadge state={callState} />
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Temps restant : <span className="font-medium text-foreground">{minutesRemaining}</span></span>
              {Number.isFinite(remainingInfo.images) && (
                <span>Images restantes : <span className="font-medium text-foreground">{remainingInfo.images}</span></span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-lg border bg-black/70">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-48 w-full bg-black object-cover" />
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Aucun flux distant pour le moment
                </div>
              )}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute bottom-2 right-2 h-24 w-32 rounded border border-border bg-black object-cover"
              />
            </div>
          </div>

          {quotaError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <span>{quotaMessages[quotaError] || 'Quota atteint'}</span>
            </div>
          )}

          {lastError && lastError.message && callState === 'error' && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {lastError.message}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={handleCall} disabled={callDisabled}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-2 h-4 w-4" />}
              Appeler
            </Button>
            <Button onClick={handleHangup} disabled={hangupDisabled} variant="destructive">
              <PhoneOff className="mr-2 h-4 w-4" />
              Raccrocher
            </Button>
            <Button
              onClick={handleToggleVideo}
              disabled={videoToggleDisabled}
              variant={videoEnabled ? 'default' : 'outline'}
            >
              {videoEnabled ? <Video className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4" />}
              Webcam
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs text-muted-foreground">
            <span>Images envoyées</span>
            <span className="font-medium text-foreground">{imagesLimitLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleSendImage}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={imageDisabled} variant="secondary" className="flex-1">
              {sendingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              Montrez-lui
            </Button>
            {connected && !dataChannelReady && (
              <Badge variant="outline">Canal en attente…</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantDrawer;

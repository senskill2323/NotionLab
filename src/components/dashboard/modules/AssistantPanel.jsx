import React, { useMemo } from 'react';
import { PhoneCall, PhoneOff, LayoutGrid, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ModuleHeader from '@/components/dashboard/ModuleHeader';
import { useAssistant } from '@/contexts/AssistantContext';

const callLabels = {
  idle: 'Disponible',
  connecting: 'Connexion…',
  connected: 'En session',
  reconnecting: 'Reconnexion…',
  ending: 'Fin de session…',
  error: 'Erreur',
};

const statusBadgeVariant = (state) => {
  if (state === 'connected') return 'default';
  if (state === 'error') return 'destructive';
  return 'secondary';
};

const AssistantPanel = ({ editMode = false }) => {
  const {
    callState,
    startCall,
    stopCall,
    toggleDrawer,
    settings,
    limits,
    imagesSent,
    elapsedSeconds,
  } = useAssistant();

  const connected = callState === 'connected';
  const connecting = callState === 'connecting' || callState === 'reconnecting';
  const idle = callState === 'idle';

  const remaining = useMemo(() => {
    if (!limits) {
      return { minutes: '—', images: '—' };
    }
    const perDaySeconds = (limits.minutes_per_day ?? 0) * 60;
    const usedSeconds = (limits.seconds_used_today ?? 0) + (connected ? elapsedSeconds : 0);
    const remainingSeconds = Math.max(perDaySeconds - usedSeconds, 0);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formattedMinutes = perDaySeconds === 0 ? '—' : `${minutes}m ${seconds}s`;

    const imagesLimit = limits.images_per_session ?? Infinity;
    const formattedImages = Number.isFinite(imagesLimit) ? `${imagesSent} / ${imagesLimit}` : `${imagesSent}`;

    return {
      minutes: formattedMinutes,
      images: formattedImages,
    };
  }, [connected, elapsedSeconds, imagesSent, limits]);

  const handleCall = async () => {
    if (connected || connecting) return;
    await startCall();
  };

  const handleHangup = async () => {
    if (idle && !connecting) return;
    await stopCall({ reason: 'panel' });
  };

  return (
    <Card className="h-full">
      <ModuleHeader
        title="Assistant IA"
        icon={LayoutGrid}
        description={settings?.voice ? `Voix ${settings.voice}` : 'Support audio/vidéo OpenAI Realtime'}
      />
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={statusBadgeVariant(callState)}>{callLabels[callState] || callState}</Badge>
          <Button size="sm" variant="ghost" onClick={toggleDrawer}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Ouvrir
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border px-3 py-2">
            <dt className="text-muted-foreground">Temps restant</dt>
            <dd className="text-base font-semibold text-foreground">{remaining.minutes}</dd>
          </div>
          <div className="rounded-md border px-3 py-2">
            <dt className="text-muted-foreground">Images envoyées</dt>
            <dd className="text-base font-semibold text-foreground">{remaining.images}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleCall} disabled={connecting || connected || editMode}>
            <PhoneCall className="mr-2 h-4 w-4" />
            Appeler
          </Button>
          <Button onClick={handleHangup} disabled={idle || editMode} variant="destructive">
            <PhoneOff className="mr-2 h-4 w-4" />
            Stopper
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssistantPanel;

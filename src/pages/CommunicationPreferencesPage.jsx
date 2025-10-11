import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, BellRing, AlertCircle } from 'lucide-react';

import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const USER_AVAILABLE_FIELD = 'user-available';

const CommunicationPreferencesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState(null);
  const userId = user?.id;

  const notificationsQuery = useQuery({
    queryKey: ['communicationNotifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_notifications')
        .select(
          'id, notification_key, title, description, subject, preview_text, default_enabled, force_send, metadata, "user-available"'
        )
        .eq('is_active', true)
        .eq(USER_AVAILABLE_FIELD, true)
        .order('title', { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const preferencesQuery = useQuery({
    queryKey: ['userNotificationPreferences', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_email_notification_preferences')
        .select('notification_id, is_enabled')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return data ?? [];
    },
    enabled: Boolean(userId),
  });

  const preferencesMap = useMemo(() => {
    const entries = new Map();
    (preferencesQuery.data ?? []).forEach((item) => {
      entries.set(item.notification_id, item.is_enabled);
    });
    return entries;
  }, [preferencesQuery.data]);

  const computeCurrentValue = (notification) => {
    if (preferencesMap.has(notification.id)) {
      return preferencesMap.get(notification.id);
    }

    return Boolean(notification.default_enabled);
  };

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ notificationId, nextValue }) => {
      if (!userId) {
        throw new Error('Utilisateur non authentifié.');
      }

      const { error } = await supabase
        .from('user_email_notification_preferences')
        .upsert(
          {
            user_id: userId,
            notification_id: notificationId,
            is_enabled: nextValue,
          },
          { onConflict: 'user_id,notification_id' }
        );

      if (error) {
        throw error;
      }
    },
    onMutate: ({ notificationId }) => {
      setPendingId(notificationId);
    },
    onSuccess: (_, { notificationId, nextValue, notificationTitle }) => {
      queryClient.setQueryData(['userNotificationPreferences', userId], (prev = []) => {
        const items = Array.isArray(prev) ? [...prev] : [];
        const existingIndex = items.findIndex((entry) => entry.notification_id === notificationId);

        if (existingIndex === -1) {
          items.push({ notification_id: notificationId, is_enabled: nextValue });
        } else {
          items[existingIndex] = { ...items[existingIndex], is_enabled: nextValue };
        }

        return items;
      });

      toast({
        title: nextValue ? 'Notification activée' : 'Notification désactivée',
        description: nextValue
          ? `“${notificationTitle}” sera maintenant envoyée.`
          : `“${notificationTitle}” ne sera plus envoyée.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error?.message || "Impossible de mettre à jour la notification.",
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const handleToggle = (notification) => {
    if (!userId || notification.force_send || updatePreferenceMutation.isPending) {
      return;
    }

    const currentValue = computeCurrentValue(notification);
    const nextValue = !currentValue;

    updatePreferenceMutation.mutate({
      notificationId: notification.id,
      notificationTitle: notification.title,
      nextValue,
    });
  };

  const isLoading = notificationsQuery.isLoading || preferencesQuery.isLoading;
  const hasError = notificationsQuery.isError || preferencesQuery.isError;
  const notifications = notificationsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Préférences de communication | NotionLab</title>
        <meta
          name="description"
          content="Choisis les communications e-mail que tu souhaites recevoir de NotionLab."
        />
      </Helmet>

      <div className="container max-w-4xl space-y-10 pb-16 pt-28">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Préférences de communication</h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Active ou désactive les e-mails qui peuvent être personnalisés. Les notifications indispensables restent
            envoyées automatiquement par l&apos;équipe NotionLab.
          </p>
        </header>

        {isLoading && (
          <div className="grid min-h-[40vh] place-items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Impossible de charger les préférences</AlertTitle>
            <AlertDescription>
              Nous n&apos;avons pas réussi à récupérer tes notifications personnalisables. Réessaie dans quelques
              instants.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && notifications.length === 0 && (
          <Alert>
            <BellRing className="h-4 w-4" />
            <AlertTitle>Aucune notification disponible</AlertTitle>
            <AlertDescription>
              Aucun e-mail personnalisable n&apos;est encore proposé. Reviens plus tard pour ajuster tes préférences.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && notifications.length > 0 && (
          <div className="space-y-6">
            {notifications.map((notification) => {
              const currentValue = computeCurrentValue(notification);
              const disabled = Boolean(notification.force_send);
              const isPending = pendingId === notification.id && updatePreferenceMutation.isPending;

              return (
                <Card key={notification.id} className="border-border/60 bg-card/80 shadow-sm">
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl">{notification.title}</CardTitle>
                        <Badge variant={currentValue ? 'default' : 'secondary'}>
                          {currentValue ? 'Activée' : 'Désactivée'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {notification.description ||
                          'Notification transactionnelle liée à ton espace NotionLab.'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Recevoir cet e-mail</span>
                      <Switch
                        checked={currentValue}
                        disabled={disabled || isPending}
                        onCheckedChange={() => handleToggle(notification)}
                        aria-label={`Activer ou désactiver la notification ${notification.title}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Objet : </span>
                      {notification.subject}
                    </div>
                    {notification.preview_text && (
                      <div>
                        <span className="font-medium text-foreground">Préheader : </span>
                        {notification.preview_text}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <Badge variant="outline">Clé : {notification.notification_key}</Badge>
                      <Badge variant="outline">
                        {notification.default_enabled
                          ? 'Activée par défaut'
                          : 'Désactivée par défaut'}
                      </Badge>
                    </div>
                    {disabled && (
                      <div className="rounded-md border border-dashed border-yellow-400/40 bg-yellow-500/5 p-3 text-xs text-yellow-700">
                        Cette notification est envoyée automatiquement à tous les utilisateurs. Elle ne peut pas être
                        personnalisée.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationPreferencesPage;

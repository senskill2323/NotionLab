import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, Link as LinkIcon, Loader2, RefreshCw, Lock, Calendar } from 'lucide-react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const EVENT_DEFAULTS = {
  label: '',
  event_key: '',
  description: '',
  is_active: true,
};

const EVENT_KEY_PATTERN = /^[a-z0-9]+[a-z0-9._-]*$/;

const normalizeEventKey = (value = '') =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.');

const NotificationEventsManager = ({ notifications }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingById, setPendingById] = useState({});
  const [searchTerm] = useState('');
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [assignmentTarget, setAssignmentTarget] = useState(null);
  const [assignmentState, setAssignmentState] = useState({ selected: [], primaryId: null });
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: EVENT_DEFAULTS });

  const isActiveValue = watch('is_active');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data: eventRows, error: eventError } = await supabase
      .from('notification_events')
      .select('*')
      .order('event_key', { ascending: true });

    if (eventError) {
      toast({
        title: 'Erreur',
        description: "Impossible de charger les evenements de notification.",
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { data: mappingRows, error: mappingError } = await supabase
      .from('notification_event_templates')
      .select('event_id, notification_id, is_primary, priority, email_notifications(id, notification_key, title, is_active)')
      .order('priority', { ascending: true });

    if (mappingError) {
      toast({
        title: 'Erreur',
        description: "Impossible de charger l'association evenements <-> notifications.",
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const enhancedEvents = (eventRows || []).map((event) => {
      const templates = (mappingRows || [])
        .filter((row) => row.event_id === event.id)
        .map((row) => {
          const notification =
            row.email_notifications ||
            notifications.find((item) => item.id === row.notification_id) ||
            null;
          return {
            notification_id: row.notification_id,
            is_primary: row.is_primary,
            priority: row.priority,
            notification,
          };
        })
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));
      return {
        ...event,
        templates,
      };
    });

    setEvents(enhancedEvents);
    setLoading(false);
  }, [toast, notifications]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => {
      const haystack = [event.label, event.event_key, event.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [events, searchTerm]);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    reset(EVENT_DEFAULTS);
    setEventFormOpen(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    reset({
      label: event.label || '',
      event_key: event.event_key || '',
      description: event.description || '',
      is_active: event.is_active ?? true,
    });
    setEventFormOpen(true);
  };

  const handleCloseForm = () => {
    setEventFormOpen(false);
    setEditingEvent(null);
    reset(EVENT_DEFAULTS);
  };

  const onSubmit = async (values) => {
    const payload = {
      label: values.label.trim(),
      event_key: normalizeEventKey(values.event_key),
      description: values.description?.trim() || null,
      is_active: values.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (!EVENT_KEY_PATTERN.test(payload.event_key)) {
      toast({
        title: 'Cle invalide',
        description: 'Utilise uniquement des lettres, chiffres, points, tirets ou underscores.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('notification_events')
          .update(payload)
          .eq('id', editingEvent.id);

        if (error) {
          throw error;
        }

        toast({ title: 'Evenement mis a jour', description: `"${payload.label}" a ete mis a jour.` });
      } else {
        const { error } = await supabase.from('notification_events').insert(payload);
        if (error) {
          throw error;
        }
        toast({
          title: 'Evenement cree',
          description: `"${payload.label}" est pret a etre relie a des notifications.`,
        });
      }
      handleCloseForm();
      fetchEvents();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer l'evenement.",
        variant: 'destructive',
      });
    }
  };

  const updateEventField = async (event, updates) => {
    setPendingById((prev) => ({ ...prev, [event.id]: true }));
    const { error } = await supabase.from('notification_events').update(updates).eq('id', event.id);
    setPendingById((prev) => ({ ...prev, [event.id]: false }));

    if (error) {
      toast({
        title: 'Erreur',
        description: "La mise a jour de l'evenement a echoue.",
        variant: 'destructive',
      });
      return;
    }

    setEvents((prev) =>
      prev.map((item) => (item.id === event.id ? { ...item, ...updates } : item)),
    );
    toast({
      title: 'Statut mis a jour',
      description: updates.is_active === false ? 'Evenement desactive.' : 'Evenement active.',
    });
  };

  const handleDeleteEvent = async (event) => {
    if (event.templates?.length) {
      toast({
        title: 'Suppression bloquee',
        description: 'Detache les notifications avant de supprimer cet evenement.',
        variant: 'destructive',
      });
      return;
    }
    setPendingById((prev) => ({ ...prev, [event.id]: true }));
    const { error } = await supabase.from('notification_events').delete().eq('id', event.id);
    setPendingById((prev) => ({ ...prev, [event.id]: false }));

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer l'evenement.",
        variant: 'destructive',
      });
      return;
    }

    setEvents((prev) => prev.filter((item) => item.id !== event.id));
    toast({
      title: 'Evenement supprime',
      description: `"${event.label}" a ete supprime.`,
    });
  };

  const handleOpenAssignment = (event) => {
    const selected = event.templates?.map((t) => t.notification_id) || [];
    const primary = event.templates?.find((t) => t.is_primary)?.notification_id || null;
    setAssignmentTarget(event);
    setAssignmentState({
      selected,
      primaryId: primary && selected.includes(primary) ? primary : selected[0] || null,
    });
    setAssignmentSearch('');
  };

  const toggleAssignment = (notificationId) => {
    setAssignmentState((prev) => {
      if (prev.selected.includes(notificationId)) {
        const nextSelected = prev.selected.filter((id) => id !== notificationId);
        const nextPrimary =
          prev.primaryId === notificationId ? nextSelected[0] || null : prev.primaryId;
        return { selected: nextSelected, primaryId: nextPrimary };
      }
      return {
        selected: [...prev.selected, notificationId],
        primaryId: prev.primaryId || notificationId,
      };
    });
  };

  const handlePrimaryChange = (value) => {
    setAssignmentState((prev) => ({
      ...prev,
      primaryId: prev.selected.includes(value) ? value : prev.primaryId,
    }));
  };

  const filteredNotificationsForAssignment = useMemo(() => {
    const term = assignmentSearch.trim().toLowerCase();
    const base = notifications || [];
    if (!term) return base;
    return base.filter((notification) => {
      const haystack = [
        notification.title,
        notification.notification_key,
        notification.description,
        notification.subject,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [notifications, assignmentSearch]);

  const handleSaveAssignments = async () => {
    if (!assignmentTarget) return;
    const selected = assignmentState.selected;
    const hasSelection = selected.length > 0;
    const primaryId = hasSelection
      ? assignmentState.primaryId && selected.includes(assignmentState.primaryId)
        ? assignmentState.primaryId
        : selected[0]
      : null;

    const existingIds = assignmentTarget.templates?.map((t) => t.notification_id) || [];
    const toDelete = existingIds.filter((id) => !selected.includes(id));

    const upsertPayload = selected.map((notificationId, index) => ({
      event_id: assignmentTarget.id,
      notification_id: notificationId,
      is_primary: primaryId === notificationId,
      priority: index,
    }));

    setAssignmentSaving(true);
    try {
      if (toDelete.length) {
        const { error: deleteError } = await supabase
          .from('notification_event_templates')
          .delete()
          .eq('event_id', assignmentTarget.id)
          .in('notification_id', toDelete);

        if (deleteError) throw deleteError;
      }

      if (upsertPayload.length) {
        const { error: upsertError } = await supabase
          .from('notification_event_templates')
          .upsert(upsertPayload, { onConflict: 'event_id,notification_id' });
        if (upsertError) throw upsertError;
      } else if (!hasSelection) {
        // nothing selected and no remaining rows - nothing to upsert
      }

      toast({
        title: 'Association mise a jour',
        description: 'Les notifications liees a cet evenement ont ete enregistrees.',
      });
      setAssignmentTarget(null);
      setAssignmentSaving(false);
      fetchEvents();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer l'association.",
        variant: 'destructive',
      });
      setAssignmentSaving(false);
    }
  };

  const renderAssignmentDialog = () => {
    if (!assignmentTarget) return null;
    const primaryValue = assignmentState.primaryId || '';

    return (
      <Dialog open onOpenChange={(open) => (!open ? setAssignmentTarget(null) : null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Associer des notifications</DialogTitle>
            <DialogDescription>
              Configure les templates envoyes pour{' '}
              <span className="font-semibold">{assignmentTarget.label}</span>. Marque une notification
              principale pour les envois par defaut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Rechercher une notification..."
              value={assignmentSearch}
              onChange={(event) => setAssignmentSearch(event.target.value)}
            />
            <ScrollArea className="max-h-[320px] pr-2">
              <RadioGroup value={primaryValue} onValueChange={handlePrimaryChange} className="space-y-2">
                {filteredNotificationsForAssignment.map((notification) => {
                  const selected = assignmentState.selected.includes(notification.id);
                  const isPrimary = primaryValue === notification.id;
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
                    >
                      <Checkbox
                        id={`notification-${notification.id}`}
                        checked={selected}
                        onCheckedChange={() => toggleAssignment(notification.id)}
                        aria-label="Associer cette notification"
                        className="mt-1"
                      />
                      <Label htmlFor={`notification-${notification.id}`} className="flex-1 cursor-pointer space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{notification.title}</span>
                          {!notification.is_active && (
                            <Badge variant="secondary" className="uppercase">
                              Inactive
                            </Badge>
                          )}
                          {notification.force_send && (
                            <Badge variant="destructive" className="uppercase">
                              Forcee
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cle : {notification.notification_key}
                        </div>
                        {notification.subject && (
                          <div className="text-xs text-muted-foreground truncate">{notification.subject}</div>
                        )}
                      </Label>
                      <div className="flex flex-col items-center gap-2">
                        <RadioGroupItem
                          value={notification.id}
                          disabled={!selected}
                          className="border-primary text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          aria-label="Definir comme notification principale"
                        />
                        {isPrimary && <Badge variant="outline">Principale</Badge>}
                      </div>
                    </div>
                  );
                })}
                {filteredNotificationsForAssignment.length === 0 && (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucune notification ne correspond a cette recherche.
                  </div>
                )}
              </RadioGroup>
            </ScrollArea>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignmentTarget(null)} disabled={assignmentSaving}>
              Annuler
            </Button>
            <Button onClick={handleSaveAssignments} disabled={assignmentSaving}>
              {assignmentSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const eventKeyLocked = useMemo(() => {
    if (!editingEvent) return false;
    return (editingEvent.templates?.length || 0) > 0;
  }, [editingEvent]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Registre d'evenements
          </h3>
          <p className="text-sm text-muted-foreground">
            Mappe les cles d'evenements declencheurs avec les templates e-mail existants.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchEvents}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraichir
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel evenement
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom de l'évenement</TableHead>
              <TableHead className="hidden md:table-cell">Clé Event</TableHead>
              <TableHead>Lien notification</TableHead>
              <TableHead className="hidden md:table-cell text-center">Statut</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  <div className="mt-2">Chargement des evenements...</div>
                </TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Aucun evenement ne correspond a cette recherche.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => {
                const templates = event.templates || [];
                const hasAssignments = templates.length > 0;
                const primaryTemplate = templates.find((t) => t.is_primary);
                return (
                  <TableRow key={event.id} className={!event.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="font-medium">{event.label}</div>
                      <div className="text-xs text-muted-foreground md:hidden">Cle : {event.event_key}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="rounded bg-muted px-2 py-1 text-xs">{event.event_key}</code>
                    </TableCell>
                    <TableCell>
                      {hasAssignments ? (
                        <div className="flex flex-wrap gap-2">
                          {templates.map((template) => {
                            const notification = template.notification;
                            const label = notification?.title || notification?.notification_key || 'Notification inconnue';
                            return (
                              <Badge
                                key={template.notification_id}
                                variant={template.is_primary ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucune notification associee</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex justify-center">
                        <Switch
                          checked={event.is_active}
                          onCheckedChange={(value) => updateEventField(event, { is_active: value })}
                          disabled={pendingById[event.id]}
                          aria-label="Activer ou desactiver l'evenement"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            {pendingById[event.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LinkIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenAssignment(event)}>
                            Associer des notifications
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(event)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateEventField(event, { is_active: !event.is_active })}
                          >
                            {event.is_active ? 'Desactiver' : 'Activer'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteEvent(event)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={eventFormOpen} onOpenChange={(open) => (!open ? handleCloseForm() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Modifier l'evenement" : 'Nouvel evenement'}</DialogTitle>
            <DialogDescription>
              Definis un libelle clair et une cle stable pour referencer cet evenement dans le code.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event_label">Libelle</Label>
              <Input
                id="event_label"
                placeholder="Ex : Activation compte utilisateur"
                {...register('label', { required: 'Le libelle est obligatoire.' })}
              />
              {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_key">
                Cle d'evenement
                {eventKeyLocked && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    <Lock className="h-3 w-3" /> utilisee
                  </span>
                )}
              </Label>
              <Input
                id="event_key"
                placeholder="ex : user.account.created"
                disabled={eventKeyLocked}
                {...register('event_key', {
                  required: 'La cle est obligatoire.',
                  pattern: {
                    value: EVENT_KEY_PATTERN,
                    message: 'Utilise uniquement lettres, chiffres, points, tirets ou underscores.',
                  },
                  onChange: (event) => {
                    if (eventKeyLocked) return;
                    const normalized = normalizeEventKey(event.target.value);
                    setValue('event_key', normalized, { shouldDirty: true, shouldTouch: true });
                  },
                })}
              />
              <p className="text-xs text-muted-foreground">
                Cle perenne utilisee dans le code. Exemple : <code>user.account.created</code>.
              </p>
              {errors.event_key && <p className="text-xs text-destructive">{errors.event_key.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_description">Description</Label>
              <Textarea
                id="event_description"
                placeholder="Contexte et declencheur fonctionnel."
                rows={3}
                {...register('description')}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Evenement actif</p>
                <p className="text-xs text-muted-foreground">
                  Desactive pour empecher tout envoi base sur cette cle.
                </p>
              </div>
              <Switch
                checked={isActiveValue}
                onCheckedChange={(value) => setValue('is_active', value, { shouldDirty: true })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
                  </>
                ) : editingEvent ? (
                  'Enregistrer'
                ) : (
                  'Creer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {renderAssignmentDialog()}
    </div>
  );
};

export default NotificationEventsManager;

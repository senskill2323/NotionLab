import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import TiptapEditor from '@/components/admin/TiptapEditor';
import NotificationEventsManager from '@/components/admin/NotificationEventsManager';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Bell,
  Copy,
  Edit,
  Eye,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';

const USER_AVAILABLE_FIELD = 'user-available';

const DEFAULT_FORM_VALUES = {
  title: '',
  notification_key: '',
  subject: '',
  body_html: '',
  sender_name: '',
  sender_email: '',
  force_send: false,
  is_active: true,
  default_enabled: true,
  [USER_AVAILABLE_FIELD]: false,
};

const TEST_EMAIL_RECIPIENT = 'yann@notionlab.ch';

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const EmailPreviewDialog = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <Dialog open={!!notification} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apercu de l&apos;email</DialogTitle>
          <DialogDescription>
            {notification.title} - {notification.notification_key}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="rounded border p-3 bg-muted/40 space-y-2 text-sm">
            <p>
              <span className="font-semibold">Expediteur :</span> {notification.sender_name}{' '}
              {'<'}
              {notification.sender_email}
              {'>'}
            </p>
            <p>
              <span className="font-semibold">Sujet :</span> {notification.subject}
            </p>
            {notification.preview_text && (
              <p>
                <span className="font-semibold">Preheader :</span> {notification.preview_text}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Badge variant={notification.is_active ? 'default' : 'secondary'}>
                {notification.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={notification.force_send ? 'destructive' : 'outline'}>
                {notification.force_send ? 'Forcee' : 'Preferences clients'}
              </Badge>
              <Badge variant={notification[USER_AVAILABLE_FIELD] ? 'outline' : 'secondary'}>
                {notification[USER_AVAILABLE_FIELD] ? 'Preference disponible' : 'Fixee par l&apos;equipe'}
              </Badge>
            </div>
          </div>
          <div className="rounded border bg-background px-4 py-6 shadow-inner">
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: notification.body_html || '<p>(Corps vide)</p>' }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmailNotificationsPanel = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [previewingNotification, setPreviewingNotification] = useState(null);
  const [pendingById, setPendingById] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [testingById, setTestingById] = useState({});
  const [linkedEvents, setLinkedEvents] = useState([]);
  const [linkedEventsLoading, setLinkedEventsLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULT_FORM_VALUES });

  const forceSendValue = watch('force_send');
  const userAvailableValue = watch(USER_AVAILABLE_FIELD);

  useEffect(() => {
    if (forceSendValue && userAvailableValue) {
      setValue(USER_AVAILABLE_FIELD, false, { shouldDirty: true });
    }
  }, [forceSendValue, userAvailableValue, setValue]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_notifications')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de charger les notifications e-mail.",
        variant: 'destructive',
      });
    } else {
      setNotifications(data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenCreate = () => {
    setEditingNotification(null);
    reset(DEFAULT_FORM_VALUES);
    setLinkedEvents([]);
    setLinkedEventsLoading(false);
    setFormOpen(true);
  };

  const handleOpenEdit = async (notification) => {
    setEditingNotification(notification);
    reset({
      title: notification.title || '',
      notification_key: notification.notification_key || '',
      subject: notification.subject || '',
      body_html: notification.body_html || '',
      sender_name: notification.sender_name || '',
      sender_email: notification.sender_email || '',
      force_send: notification.force_send ?? false,
      is_active: notification.is_active ?? true,
      default_enabled: notification.default_enabled ?? true,
      [USER_AVAILABLE_FIELD]: notification?.[USER_AVAILABLE_FIELD] ?? false,
    });
    setLinkedEvents([]);
    setLinkedEventsLoading(true);
    setFormOpen(true);
    try {
      const { data, error } = await supabase
        .from('notification_event_templates')
        .select('is_primary, priority, notification_events(event_key, label)')
        .eq('notification_id', notification.id)
        .order('is_primary', { ascending: false })
        .order('priority', { ascending: true });

      if (error) {
        throw error;
      }

      const mapped = (data || [])
        .map((row) => {
          const event = row.notification_events;
          if (!event?.event_key) return null;
          return {
            eventKey: event.event_key,
            label: event.label || event.event_key,
            isPrimary: Boolean(row.is_primary),
          };
        })
        .filter(Boolean);
      setLinkedEvents(mapped);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Evenements indisponibles',
        description: "Impossible de recuperer les evenements lies a ce template.",
        variant: 'destructive',
      });
    } finally {
      setLinkedEventsLoading(false);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingNotification(null);
    setLinkedEvents([]);
    setLinkedEventsLoading(false);
    reset(DEFAULT_FORM_VALUES);
  };

  const upsertNotification = async (values) => {
    const normalizedValues = {
      ...values,
      ...(values.force_send ? { [USER_AVAILABLE_FIELD]: false } : {}),
    };
    if (editingNotification) {
      const { error } = await supabase
        .from('email_notifications')
        .update({
          ...normalizedValues,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNotification.id);

      if (error) throw error;
      toast({
        title: 'Notification mise a jour',
        description: 'Les modifications ont ete enregistrees.',
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === editingNotification.id ? { ...item, ...normalizedValues } : item)),
      );
    } else {
      const payload = {
        ...normalizedValues,
        notification_key: normalizedValues.notification_key || slugify(normalizedValues.title || uuidv4()),
      };
      const { error, data } = await supabase
        .from('email_notifications')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      toast({
        title: 'Notification creee',
        description: 'La notification est prete a etre utilisee.',
        className: 'bg-green-500 text-white',
      });
      setNotifications((prev) => [data, ...prev]);
    }
  };

  const onSubmit = async (formValues) => {
    try {
      const nextValues = {
        ...formValues,
        notification_key: slugify(formValues.notification_key || formValues.title || uuidv4()),
      };
      await upsertNotification(nextValues);
      handleCloseForm();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        variant: 'destructive',
      });
    }
  };

  const filteredNotifications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return notifications;
    return notifications.filter((notification) => {
      const haystack = [
        notification.title,
        notification.notification_key,
        notification.subject,
        notification.sender_name,
        notification.sender_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [notifications, searchTerm]);

  const toggleField = async (notification, field) => {
  const nextValue = !notification[field];
  const updates = { [field]: nextValue };
  if (field === "force_send" && nextValue) {
    updates[USER_AVAILABLE_FIELD] = false;
  }
  setPendingById((prev) => ({ ...prev, [notification.id]: true }));
  const { error } = await supabase
    .from("email_notifications")
    .update(updates)
    .eq("id", notification.id);

  setPendingById((prev) => ({ ...prev, [notification.id]: false }));

  if (error) {
    toast({
      title: "Erreur",
      description: "La mise a jour du statut a echoue.",
      variant: "destructive",
    });
    return;
  }

  setNotifications((prev) =>
    prev.map((item) => (item.id === notification.id ? { ...item, ...updates } : item)),
  );

  let description = "";
  if (field === "is_active") {
    description = nextValue ? "La notification est active." : "La notification est desactivee.";
  } else if (field === "force_send") {
    description = nextValue
      ? "La notification sera envoyee a tous les utilisateurs. Les preferences clients sont desactivees."
      : "Les utilisateurs pourront gerer cette notification dans leurs preferences.";
  } else if (field === "default_enabled") {
    description = nextValue
      ? "Les nouveaux utilisateurs recevront cette notification par defaut."
      : "Les nouveaux utilisateurs devront activer cette notification manuellement.";
  } else if (field === USER_AVAILABLE_FIELD) {
    description = nextValue
      ? "Les utilisateurs pourront gerer cette notification dans leurs preferences."
      : "Cette notification n'est plus modifiable par les utilisateurs.";
  }

  if (!description) {
    description = "Statut mis a jour.";
  }

  toast({
    title: "Statut mis a jour",
    description,
  });
};
const handleDuplicate = async (notification) => {
    const suffix = uuidv4().slice(0, 6);
    const duplicateKey = slugify(`${notification.notification_key || 'notification'}-${suffix}`);
    const payload = {
      ...notification,
      id: undefined,
      notification_key: duplicateKey,
      title: `${notification.title || 'Notification'} (copie)`,
      is_active: false,
      created_at: undefined,
      updated_at: undefined,
    };

    const { error, data } = await supabase
      .from('email_notifications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer la notification.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Notification dupliquee',
      description: `"${notification.title}" a ete dupliquee en brouillon.`,
      className: 'bg-green-500 text-white',
    });
    setNotifications((prev) => [data, ...prev]);
  };

  const handleSendTest = async (notification) => {
    if (!notification?.notification_key) {
      toast({
        title: 'Cle manquante',
        description: 'Impossible de tester cette notification sans cle unique.',
        variant: 'destructive',
      });
      return;
    }

    setTestingById((prev) => ({ ...prev, [notification.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        headers: { 'x-send-email-test': '1' },
        body: {
          notification_key: notification.notification_key,
          preview_email: TEST_EMAIL_RECIPIENT,
        },
      });

      if (error) throw error;

      toast({
        title: 'Test envoye',
        description: `Notification envoyee a ${TEST_EMAIL_RECIPIENT}.`,
        className: 'bg-green-500 text-white',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Echec de l'envoi",
        description: error.message ?? "Impossible d'envoyer le test.",
        variant: 'destructive',
      });
    } finally {
      setTestingById((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    const { error } = await supabase.from('email_notifications').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer la notification.",
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Notification supprimee',
        description: `"${title}" a ete supprimee.`,
      });
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }
    setDeleteTarget(null);
  };

  const renderForm = () => (
    <Dialog open={formOpen} onOpenChange={(open) => (!open ? handleCloseForm() : null)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editingNotification ? 'Modifier la notification' : 'Nouvelle notification e-mail'}</DialogTitle>
          <DialogDescription>
            Configurez l&apos;expediteur, le contenu et les statuts pour cette notification transactionnelle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre interne</Label>
              <Input
                id="title"
                placeholder="Ex: Confirmation d'inscription"
                {...register('title', { required: 'Le titre est obligatoire.' })}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notification_key">Identifiant du template</Label>
              <div className="flex gap-2">
                <Input
                  id="notification_key"
                  placeholder="ex: signup-confirmation"
                  {...register('notification_key', {
                    required: "L'identifiant est obligatoire.",
                    pattern: {
                      value: /^[a-z0-9][a-z0-9-_.]+[a-z0-9]$/i,
                      message: 'Utilisez des lettres, chiffres, tirets ou underscores.',
                    },
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const title = watch('title');
                    const nextKey = slugify(title || `notification-${uuidv4().slice(0, 6)}`);
                    setValue('notification_key', nextKey, { shouldDirty: true, shouldTouch: true });
                  }}
                >
                  Generer
                </Button>
              </div>
              {errors.notification_key && <p className="text-xs text-destructive">{errors.notification_key.message}</p>}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Cles d'evenement associees</Label>
              {linkedEventsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des evenements...
                </div>
              ) : linkedEvents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {linkedEvents.map((event) => (
                    <Badge key={event.eventKey} variant={event.isPrimary ? 'default' : 'outline'}>
                      <span>{event.label}</span>
                      {event.isPrimary && <span className="ml-1 text-[10px] uppercase">principal</span>}
                      <span className="ml-2 text-[10px] uppercase text-muted-foreground">{event.eventKey}</span>
                    </Badge>
                  ))}
                </div>
              ) : editingNotification ? (
                <p className="text-xs text-muted-foreground">
                  Aucun evenement ne reference actuellement ce template.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Cette notification n'est liee a aucun evenement pour le moment.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sender_name">Nom de l&apos;expediteur</Label>
              <Input
                id="sender_name"
                placeholder="Equipe NotionLab"
                {...register('sender_name', { required: "Le nom de l'expediteur est obligatoire." })}
              />
              {errors.sender_name && <p className="text-xs text-destructive">{errors.sender_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sender_email">Email de l&apos;expediteur</Label>
              <Input
                id="sender_email"
                type="email"
                placeholder="notifications@notionlab.co"
                {...register('sender_email', {
                  required: "L'email est obligatoire.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email invalide.',
                  },
                })}
              />
              {errors.sender_email && <p className="text-xs text-destructive">{errors.sender_email.message}</p>}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="subject">Sujet</Label>
              <Input
                id="subject"
                placeholder="Ex: Bienvenue sur NotionLab"
                {...register('subject', { required: 'Le sujet est obligatoire.' })}
              />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contenu de l&apos;email</Label>
            <Controller
              name="body_html"
              control={control}
              rules={{ required: 'Le corps du message est obligatoire.' }}
              render={({ field: { value, onChange } }) => (
                <TiptapEditor content={value} onChange={onChange} placeholder="Redigez le contenu HTML de l'email..." />
              )}
            />
            {errors.body_html && <p className="text-xs text-destructive">{errors.body_html.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">Notification active</p>
                <p className="text-xs text-muted-foreground">Controle la diffusion generale.</p>
              </div>
              <Controller
                name="is_active"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch checked={value} onCheckedChange={onChange} aria-label="Activer la notification" />
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium flex items-center gap-2">
                  Forcer l&apos;envoi
                  <Zap className="h-4 w-4 text-amber-500" />
                </p>
                <p className="text-xs text-muted-foreground">
                  Si active, tous les utilisateurs recoivent l&apos;email.
                </p>
              </div>
              <Controller
                name="force_send"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch checked={value} onCheckedChange={onChange} aria-label="Forcer l'envoi" />
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">Activee par defaut</p>
                <p className="text-xs text-muted-foreground">
                  Preference initiale cote client (hors notifications forcees).
                </p>
              </div>
              <Controller
                name="default_enabled"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    checked={value}
                    onCheckedChange={onChange}
                    aria-label="Activer par defaut"
                    disabled={forceSendValue}
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">Preference utilisateur</p>
                <p className="text-xs text-muted-foreground">
                  Permettre aux clients de desactiver cette notification.
                </p>
              </div>
              <Controller
                name={USER_AVAILABLE_FIELD}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    checked={value}
                    onCheckedChange={onChange}
                    aria-label="Permettre la gestion cote client"
                    disabled={forceSendValue}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCloseForm}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingNotification ? 'Enregistrer' : 'Creer la notification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Notifications e-mail
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerez les modeles transactionnels, l&apos;expediteur et les statuts d&apos;envoi.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="self-start sm:self-auto notion-gradient text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle notification
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, sujet ou cle..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchNotifications} disabled={loading}>
          <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraichir
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%]">Notification</TableHead>
              <TableHead className="w-[18%]">Expediteur</TableHead>
              <TableHead className="w-[32%]">Sujet</TableHead>
              <TableHead className="w-[14%]">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredNotifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucune notification trouvee. Creez-en une nouvelle pour demarrer.
                </TableCell>
              </TableRow>
            ) : (
              filteredNotifications.map((notification) => {
                const pending = pendingById[notification.id];
                return (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <div className="font-medium">{notification.title}</div>
                      <p className="text-xs text-muted-foreground">{notification.notification_key}</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{notification.sender_name}</div>
                      <p className="text-xs text-muted-foreground">{notification.sender_email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{notification.subject}</div>
                      {notification.preview_text && (
                        <p className="text-xs text-muted-foreground truncate">{notification.preview_text}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Active</span>
                        <Switch
                          checked={notification.is_active}
                          onCheckedChange={() => toggleField(notification, 'is_active')}
                          disabled={pending}
                          aria-label="Activer ou desactiver"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewingNotification(notification)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Previsualiser
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendTest(notification)}
                            disabled={!!testingById[notification.id]}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {testingById[notification.id] ? 'Envoi en cours...' : 'Envoyer un test'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleField(notification, USER_AVAILABLE_FIELD)}
                            disabled={pending || notification.force_send}
                          >
                            <Bell className="mr-2 h-4 w-4" />
                            {notification[USER_AVAILABLE_FIELD]
                              ? 'Retirer des preferences client'
                              : 'Autoriser les preferences client'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(notification)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(notification)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setDeleteTarget(notification)}
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

      {renderForm()}

      <div className="pt-10">
        <NotificationEventsManager notifications={notifications} />
      </div>

      <EmailPreviewDialog notification={previewingNotification} onClose={() => setPreviewingNotification(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la notification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est definitive. La notification " {deleteTarget?.title} " sera supprimee pour tous.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailNotificationsPanel;





















































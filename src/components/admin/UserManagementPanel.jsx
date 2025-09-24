import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/customSupabaseClient';

import { useSessionRefresh } from '@/lib/sessionRefreshBus';

import { useAuth } from '@/contexts/SupabaseAuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { useToast } from '@/components/ui/use-toast';

import { motion, AnimatePresence } from 'framer-motion';

import { Loader2, Pencil, Trash2, PlusCircle, MailPlus, X, ChevronDown, ChevronUp, ArrowUpDown, FilterX } from 'lucide-react';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Label } from '@/components/ui/label';

import { useDebounce } from 'use-debounce';

import countries from '@/data/countries.json';

const initialFilters = {

  first_name: '',

  last_name: '',

  email: '',

  user_type_id: '',

  city: '',

  country_code: '',

  formation_id: '',

};

const initialSort = { field: 'created_at', dir: 'desc' };

const createInviteState = () => ({

  email: '',

  firstName: '',

  lastName: '',

});

const UserManagementPanel = () => {

  const [users, setUsers] = useState([]);

  const [userTypes, setUserTypes] = useState([]);

  const [formations, setFormations] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });

  const [filters, setFilters] = useState(initialFilters);

  const [sort, setSort] = useState(initialSort);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [debouncedFilters] = useDebounce(filters, 300);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const [inviteForm, setInviteForm] = useState(createInviteState);

  const [inviteLoading, setInviteLoading] = useState(false);

  const { user: currentUser } = useAuth();

  const { toast } = useToast();

  const navigate = useNavigate();

  const fetchUsers = useCallback(async (controller) => {

    const abortController = controller ?? new AbortController();

    const { signal } = abortController;

    setLoading(true);

    try {

      const { data, error } = await supabase.functions.invoke('users-search', {

        body: {

          filters: debouncedFilters,

          sort,

          page: pagination.page,

          perPage: pagination.perPage,

        },

        signal,

      });

      if (error) throw error;

      if (!(signal?.aborted && signal?.reason === 'component-unmount')) {

        setUsers(data.items || []);

        setPagination(prev => ({ ...prev, total: data.total }));

      }

    } catch (err) {

      if (err.name !== 'AbortError') {

        setError(err.message);

        toast({ title: "Erreur", description: "Impossible de charger les utilisateurs.", variant: "destructive" });

      }

    } finally {

      if (!(signal?.aborted && signal?.reason === 'component-unmount')) {

        setLoading(false);

      }

    }

  }, [debouncedFilters, sort, pagination.page, pagination.perPage, toast]);

  useEffect(() => {

    const abortController = new AbortController();

    fetchUsers(abortController);

    return () => abortController.abort('component-unmount');

  }, [fetchUsers]);

  useSessionRefresh(() => {

    fetchUsers();

  }, [fetchUsers]);

  

  useEffect(() => {

    const fetchFilterData = async () => {

      const { data: userTypesData, error: userTypesError } = await supabase.from('user_types').select('*');

      if (userTypesError) console.error("Could not fetch user types", userTypesError);

      else setUserTypes(userTypesData);

      const { data: formationsData, error: formationsError } = await supabase.from('courses').select('id, title').eq('course_type', 'standard');

      if (formationsError) console.error("Could not fetch formations", formationsError);

      else setFormations(formationsData);

    };

    fetchFilterData();

  }, []);

  const resetInviteForm = useCallback(() => {

    setInviteForm(createInviteState());

  }, []);

  const mapInviteError = (fnError) => {

    if (!fnError) return "Impossible d'inviter cet utilisateur.";

    const context = fnError?.context ?? null;

    const bodyError = context?.body?.error;

    if (bodyError) return bodyError;

    const status = context?.response?.status;

    if (status === 404) {

      return "La fonction invite-user est indisponible. Verifie son deploiement.";

    }

    const message = typeof fnError?.message === 'string' ? fnError.message : '';

    if (message) {

      const lower = message.toLowerCase();

      if (lower.includes('failed to fetch')) {

        return "Echec de communication avec l'Edge Function (CORS ou fonction invite-user non deployee).";

      }

      if (lower.includes('non-2xx status code')) {

        return "La fonction invite-user a renvoye une erreur. Verifie son deployement et les logs Supabase.";

      }

    }

    return message || "Impossible d'envoyer l'invitation.";

  };

  const handleInviteSubmit = async (event) => {

    event.preventDefault();

    if (!inviteForm.email) {

      toast({ title: "Erreur", description: "Merci de renseigner une adresse e-mail valide.", variant: "destructive" });

      return;

    }

    setInviteLoading(true);

    try {

      const { data, error } = await supabase.functions.invoke('invite-user', {

        body: {

          email: inviteForm.email,

          firstName: inviteForm.firstName,

          lastName: inviteForm.lastName,

          redirectTo: `${window.location.origin}/activation-invitation`,

        },

      });

      if (error) {

        console.error('[invite-user] edge invocation failed', error);

        throw new Error(mapInviteError(error));

      }

      if (data?.error) {

        throw new Error(data.error);

      }

      toast({ title: "Invitation envoyee", description: `Un e-mail d'activation a ete envoye a ${inviteForm.email}.` });

      resetInviteForm();

      setInviteDialogOpen(false);

      fetchUsers(new AbortController());

    } catch (err) {

      console.error('[invite-user] invitation failed', err);

      const message = err instanceof Error ? err.message : mapInviteError(err);

      toast({ title: "Erreur", description: message || "Impossible d'inviter cet utilisateur.", variant: "destructive" });

    } finally {

      setInviteLoading(false);

    }

  };

  const handleFilterChange = (key, value) => {

    setPagination(prev => ({...prev, page: 1}));

    const actualValue = value === 'all' ? '' : value;

    setFilters(prev => ({ ...prev, [key]: actualValue }));

  };

  

  const handleSort = (field) => {

    setPagination(prev => ({...prev, page: 1}));

    const newDir = sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc';

    setSort({ field, dir: newDir });

  };

  

  const resetFilters = () => {

    setFilters(initialFilters);

    setSort(initialSort);

    setPagination(prev => ({...prev, page: 1}));

  };

  

  const activeFilters = useMemo(() => {

    return Object.entries(filters)

      .map(([key, value]) => {

        if (!value) return null;

        let displayValue = value;

        let label = key;

        switch(key) {

          case 'user_type_id':

            const type = userTypes.find(t => t.id === parseInt(value));

            displayValue = type ? type.display_name : 'Inconnu';

            label = 'Type';

            break;

          case 'country_code':

            const country = countries.find(c => c.code === value);

            displayValue = country ? country.name : 'Inconnu';

            label = 'Pays';

            break;

          case 'formation_id':

            const formation = formations.find(f => f.id === value);

            displayValue = formation ? formation.title : 'Inconnu';

            label = 'Formation';

            break;

          case 'city':

            label = 'Ville';

            break;

          default:

            return null; // Hide basic filters from chips

        }

        return { key, value, displayValue, label };

      })

      .filter(Boolean);

  }, [filters, userTypes, formations]);

  const handleUserTypeChange = async (userId, newTypeId) => {

    setIsProcessing(true);

    const { error } = await supabase.from('profiles').update({ user_type_id: newTypeId }).eq('id', userId);

    if (error) {

      toast({ title: "Erreur", description: `Impossible de changer le type d'utilisateur: ${error.message}`, variant: "destructive"});

    } else {

      toast({ title: "SuccÃ¨s", description: "Type d'utilisateur mis Ã  jour."});

      fetchUsers(new AbortController()); // Refetch

    }

    setIsProcessing(false);

  };

  

  const handleDeleteUser = async (userId) => {

    setIsProcessing(true);

    try {

      // Use Edge Function (service role) that performs full cleanup and deletes the auth user

      const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-user-full', { body: { userId } });

      if (fnError) {
        throw new Error(fnError.message || 'Echec de la suppression');
      }
      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      toast({ title: "Utilisateur supprimÃ©", description: "Compte d'authentification, profil et donnÃ©es liÃ©es ont Ã©tÃ© supprimÃ©s."});

      fetchUsers(new AbortController()); // Refetch

    } catch (err) {

      toast({ title: "Erreur", description: `Impossible de supprimer l'utilisateur: ${err.message}`, variant: "destructive"});

    } finally {

      setIsProcessing(false);

    }

  };

  return (

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      <Card className="glass-effect">

        <CardHeader>

          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">

            <div>

              <CardTitle>Gestion des Utilisateurs</CardTitle>

              <CardDescription>Rechercher, filtrer et gÃ©rer tous les utilisateurs.</CardDescription>

            </div>

            <div className="flex flex-col sm:flex-row gap-2">

              <Dialog open={inviteDialogOpen} onOpenChange={(open) => {

                setInviteDialogOpen(open);

                if (!open) {

                  resetInviteForm();

                }

              }}>

                <DialogTrigger asChild>

                  <Button variant="outline" disabled={isProcessing}>

                    <MailPlus className="mr-2 h-4 w-4" />

                    Inviter un utilisateur

                  </Button>

                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">

                  <DialogHeader>

                    <DialogTitle>Inviter un client</DialogTitle>

                    <DialogDescription>Envoie un e-mail d'activation qui lui permettra de créer son mot de passe et d'accéder directement à l'espace client.</DialogDescription>

                  </DialogHeader>

                  <form className="space-y-4" onSubmit={handleInviteSubmit}>

                    <div className="grid gap-4 sm:grid-cols-2">

                      <div className="sm:col-span-2">

                        <Label htmlFor="invite-email">Email</Label>

                        <Input id="invite-email" type="email" required value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} />

                      </div>

                      <div>

                        <Label htmlFor="invite-first-name">Prénom (optionnel)</Label>

                        <Input id="invite-first-name" value={inviteForm.firstName} onChange={(event) => setInviteForm((prev) => ({ ...prev, firstName: event.target.value }))} />

                      </div>

                      <div>

                        <Label htmlFor="invite-last-name">Nom (optionnel)</Label>

                        <Input id="invite-last-name" value={inviteForm.lastName} onChange={(event) => setInviteForm((prev) => ({ ...prev, lastName: event.target.value }))} />

                      </div>

                    </div>

                    <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">

                      <Button type="button" variant="ghost" disabled={inviteLoading} onClick={() => {

                        setInviteDialogOpen(false);

                        resetInviteForm();

                      }}>Annuler</Button>

                      <Button type="submit" className="notion-gradient text-white" disabled={inviteLoading || !inviteForm.email}>

                        {inviteLoading ? (

                          <>

                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                            Envoi...

                          </>

                        ) : (

                          <>

                            <MailPlus className="mr-2 h-4 w-4" />

                            Envoyer l'invitation

                          </>

                        )}

                      </Button>

                    </DialogFooter>

                  </form>

                </DialogContent>

              </Dialog>

              <Button onClick={() => navigate('/admin/user/new')} disabled={isProcessing}>

                <PlusCircle className="mr-2 h-4 w-4" />

                Créer un utilisateur

              </Button>

            </div>

          </div>

          <div className="mt-6 space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <Input placeholder="PrÃ©nom..." value={filters.first_name} onChange={(e) => handleFilterChange('first_name', e.target.value)} />

              <Input placeholder="Nom..." value={filters.last_name} onChange={(e) => handleFilterChange('last_name', e.target.value)} />

              <Input placeholder="Email..." value={filters.email} onChange={(e) => handleFilterChange('email', e.target.value)} />

            </div>

            <Button variant="link" onClick={() => setShowAdvanced(!showAdvanced)} className="p-0 h-auto">

              {showAdvanced ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}

              Filtres avancÃ©s

            </Button>

            <AnimatePresence>

              {showAdvanced && (

                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">

                    <Input placeholder="Ville..." value={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)} />

                    <Select value={filters.country_code} onValueChange={(v) => handleFilterChange('country_code', v)}>

                      <SelectTrigger><SelectValue placeholder="Filtrer par pays" /></SelectTrigger>

                      <SelectContent>

                        <SelectItem value="all">Tous les pays</SelectItem>

                        {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}

                      </SelectContent>

                    </Select>

                    <Select value={filters.user_type_id} onValueChange={(v) => handleFilterChange('user_type_id', v)}>

                      <SelectTrigger><SelectValue placeholder="Filtrer par type" /></SelectTrigger>

                      <SelectContent>

                        <SelectItem value="all">Tous les types</SelectItem>

                        {userTypes.map(ut => <SelectItem key={ut.id} value={ut.id.toString()}>{ut.display_name}</SelectItem>)}

                      </SelectContent>

                    </Select>

                    <Select value={filters.formation_id} onValueChange={(v) => handleFilterChange('formation_id', v)}>

                      <SelectTrigger><SelectValue placeholder="Filtrer par formation" /></SelectTrigger>

                      <SelectContent>

                        <SelectItem value="all">Toutes les formations</SelectItem>

                        {formations.map(f => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}

                      </SelectContent>

                    </Select>

                  </div>

                </motion.div>

              )}

            </AnimatePresence>

             {activeFilters.length > 0 && (

                <div className="flex items-center gap-2 flex-wrap pt-4">

                  <span className="text-sm font-medium">Filtres actifs:</span>

                  {activeFilters.map(f => (

                    <Badge key={f.key} variant="secondary" className="flex items-center gap-1">

                      <span className="font-normal text-muted-foreground">{f.label}:</span> {f.displayValue}

                      <button onClick={() => handleFilterChange(f.key, '')} className="rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3"/></button>

                    </Badge>

                  ))}

                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-destructive hover:text-destructive">

                    <FilterX className="mr-2 h-4 w-4" />

                    RÃ©initialiser

                  </Button>

                </div>

            )}

          </div>

        </CardHeader>

        <CardContent>

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead><Button variant="ghost" onClick={() => handleSort('first_name')}>PrÃ©nom <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>

                <TableHead><Button variant="ghost" onClick={() => handleSort('last_name')}>Nom <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>

                <TableHead><Button variant="ghost" onClick={() => handleSort('email')}>Email <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>

                <TableHead>Type</TableHead>

                <TableHead><Button variant="ghost" onClick={() => handleSort('last_sign_in_at')}>DerniÃ¨re connexion <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>

                <TableHead className="text-right">Actions</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></TableCell></TableRow>

              ) : error ? (

                <TableRow><TableCell colSpan={6} className="text-center text-destructive">Erreur: {error}</TableCell></TableRow>

              ) : users.length === 0 ? (

                <TableRow><TableCell colSpan={6} className="text-center">Aucun utilisateur trouvÃ©.</TableCell></TableRow>

              ) : (

                users.map((user) => (

                  <TableRow key={user.id}>

                    <TableCell className="font-medium text-xs">{user.first_name}</TableCell>

                    <TableCell className="text-xs">{user.last_name}</TableCell>

                    <TableCell className="text-xs">{user.email}</TableCell>

                    <TableCell>

                      <Select

                        value={user.user_type_id?.toString() || ''}

                        onValueChange={(newTypeId) => handleUserTypeChange(user.id, parseInt(newTypeId))}

                        disabled={isProcessing || user.id === currentUser.id}

                      >

                        <SelectTrigger className="w-[100px] h-6 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>

                        <SelectContent>

                          {userTypes.map((ut) => (

                            <SelectItem key={ut.id} value={ut.id.toString()}>

                              {ut.display_name}

                            </SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </TableCell>

                    <TableCell className="text-xs">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Jamais'}</TableCell>

                    <TableCell className="text-right">

                      <div className="flex justify-end items-center gap-1">

                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/user/${user.id}`)} title="Modifier"><Pencil className="h-4 w-4" /></Button>

                        <AlertDialog>

                          <AlertDialogTrigger asChild>

                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Supprimer" disabled={isProcessing || currentUser?.profile?.user_type !== 'owner' || user.user_types?.type_name === 'owner'}>

                              <Trash2 className="h-4 w-4" />

                            </Button>

                          </AlertDialogTrigger>

                          <AlertDialogContent>

                            <AlertDialogHeader>

                              <AlertDialogTitle>ÃŠtes-vous sÃ»r ?</AlertDialogTitle>

                              <AlertDialogDescription>

                                Cette action supprimera entiÃ¨rement le compte de "{user.email}" (authentification et profil). Cette opÃ©ration est irrÃ©versible.

                              </AlertDialogDescription>

                            </AlertDialogHeader>

                            <AlertDialogFooter>

                              <AlertDialogCancel>Annuler</AlertDialogCancel>

                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Supprimer l'utilisateur</AlertDialogAction>

                            </AlertDialogFooter>

                          </AlertDialogContent>

                        </AlertDialog>

                      </div>

                    </TableCell>

                  </TableRow>

                ))

              )}

            </TableBody>

          </Table>

          <div className="flex justify-between items-center mt-4">

            <p className="text-sm text-muted-foreground">Total: {pagination.total} utilisateurs</p>

            <div className="flex items-center gap-2">

              <Button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page <= 1}>PrÃ©cÃ©dent</Button>

              <span>Page {pagination.page}</span>

              <Button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page * pagination.perPage >= pagination.total}>Suivant</Button>

            </div>

          </div>

        </CardContent>

      </Card>

    </motion.div>

  );

};

export default UserManagementPanel;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import { useDebounce } from 'use-debounce';
    import { format } from 'date-fns';
    import { fr } from 'date-fns/locale';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Loader2, Search, Eye, FilterX, AlertTriangle, Info, User, Bot, Cog } from 'lucide-react';
    import { motion } from 'framer-motion';

    const SeverityBadge = ({ level }) => {
      const variants = {
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      };
      return <Badge className={`border-transparent capitalize ${variants[level] || 'bg-gray-100 text-gray-800'}`}>{level || 'N/A'}</Badge>;
    };

    const ActorIcon = ({ type }) => {
      switch (type) {
        case 'user': return <User className="w-4 h-4" />;
        case 'ai': return <Bot className="w-4 h-4" />;
        case 'system': return <Cog className="w-4 h-4" />;
        default: return <Info className="w-4 h-4" />;
      }
    };
    
    const JsonViewer = ({ data, title }) => (
      <div className="w-full">
        <h4 className="font-semibold text-lg mb-2">{title}</h4>
        {data ? (
          <pre className="bg-muted/50 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-muted-foreground text-sm">Aucune donnée</p>
        )}
      </div>
    );

    const ActionLogsPanel = () => {
      const [logs, setLogs] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [filters, setFilters] = useState({ query: '', category: 'all', severity_level: 'all' });
      const [pagination, setPagination] = useState({ page: 1, perPage: 20, total: 0 });
      const { toast } = useToast();
      const [debouncedFilters] = useDebounce(filters, 300);

      const [uniqueCategories, setUniqueCategories] = useState([]);
      const [uniqueSeverities, setUniqueSeverities] = useState([]);

      useEffect(() => {
        const fetchUniqueValues = async () => {
            const { data: categoriesData, error: catError } = await supabase.from('action_logs').select('category').distinct();
            if(!catError) setUniqueCategories(categoriesData.map(c => c.category).filter(Boolean));

            const { data: severitiesData, error: sevError } = await supabase.from('action_logs').select('severity_level').distinct();
            if(!sevError) setUniqueSeverities(severitiesData.map(s => s.severity_level).filter(Boolean));
        };
        fetchUniqueValues();
      }, []);

      const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
          let query = supabase
            .from('action_logs')
            .select('*, profile:profiles(email)', { count: 'exact' })
            .order('created_at', { ascending: false });
          
          if (debouncedFilters.query) {
            query = query.or(`action_type.ilike.%${debouncedFilters.query}%,target_table.ilike.%${debouncedFilters.query}%,page_context.ilike.%${debouncedFilters.query}%`);
          }
          if (debouncedFilters.category !== 'all') {
            query = query.eq('category', debouncedFilters.category);
          }
          if (debouncedFilters.severity_level !== 'all') {
            query = query.eq('severity_level', debouncedFilters.severity_level);
          }

          const from = (pagination.page - 1) * pagination.perPage;
          const to = from + pagination.perPage - 1;
          query = query.range(from, to);

          const { data, error, count } = await query;
          if (error) throw error;

          setLogs(data || []);
          setPagination(p => ({ ...p, total: count || 0 }));
        } catch (err) {
          setError(err.message);
          toast({ title: 'Erreur', description: 'Impossible de charger les logs.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      }, [debouncedFilters, pagination.page, pagination.perPage, toast]);
      
      useEffect(() => {
        fetchLogs();
      }, [fetchLogs]);

      const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(p => ({...p, page: 1}));
      };

      const resetFilters = () => {
        setFilters({ query: '', category: 'all', severity_level: 'all' });
        setPagination(p => ({...p, page: 1}));
      };

      const totalPages = Math.ceil(pagination.total / pagination.perPage);

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Journal des Actions</CardTitle>
              <CardDescription>Historique complet de toutes les actions effectuées sur le site.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher une action, une page..."
                    value={filters.query}
                    onChange={(e) => handleFilterChange('query', e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
                  <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {uniqueCategories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.severity_level} onValueChange={(v) => handleFilterChange('severity_level', v)}>
                  <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Sévérité" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sévérités</SelectItem>
                     {uniqueSeverities.map(sev => <SelectItem key={sev} value={sev} className="capitalize">{sev}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" onClick={resetFilters}><FilterX className="h-4 w-4 mr-2"/>Réinitialiser</Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Date</TableHead>
                      <TableHead className="w-[180px]">Acteur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="w-[120px]">Catégorie</TableHead>
                      <TableHead className="w-[120px]">Sévérité</TableHead>
                      <TableHead className="w-[120px]">Cible</TableHead>
                      <TableHead className="w-[100px] text-right">Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                       <TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                    ) : error ? (
                      <TableRow><TableCell colSpan={7} className="h-48 text-center text-red-500"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />{error}</TableCell></TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-48 text-center">Aucun log trouvé pour ces filtres.</TableCell></TableRow>
                    ) : logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.created_at), 'd MMM yyyy, HH:mm:ss', { locale: fr })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ActorIcon type={log.actor_type} />
                            <span className="capitalize">{log.actor_type}</span>
                            {log.actor_type === 'user' && <span className="text-muted-foreground truncate text-xs">{log.profile?.email || 'ID:'+ log.actor_id.substring(0,8)}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.action_type}</TableCell>
                        <TableCell className="capitalize">{log.category || '-'}</TableCell>
                        <TableCell><SeverityBadge level={log.severity_level} /></TableCell>
                        <TableCell className="text-muted-foreground">{log.target_table || '-'}</TableCell>
                        <TableCell className="text-right">
                           <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Détails du Log</DialogTitle>
                                <DialogDescription>
                                  Examen détaillé de l'action du {format(new Date(log.created_at), 'd MMMM yyyy à HH:mm:ss', { locale: fr })}.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <p><strong>Action:</strong> {log.action_type}</p>
                                <p><strong>Page:</strong> {log.page_context || 'N/A'}</p>
                                <p><strong>IP:</strong> {log.ip_address || 'N/A'}</p>
                                <p><strong>Cible:</strong> {log.target_table ? `${log.target_table} (ID: ${log.target_record_id})` : 'N/A'}</p>
                              </div>
                              <hr className="my-4"/>
                              <div className="space-y-4 md:space-y-0 md:flex md:gap-4">
                                <JsonViewer data={log.previous_state} title="État Avant" />
                                <JsonViewer data={log.current_state} title="État Après" />
                              </div>
                              {log.metadata && (
                                <>
                                 <hr className="my-4"/>
                                 <JsonViewer data={log.metadata} title="Métadonnées" />
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                <p>Total: {pagination.total} logs</p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>Précédent</Button>
                    <span>Page {pagination.page} sur {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= totalPages}>Suivant</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    export default ActionLogsPanel;
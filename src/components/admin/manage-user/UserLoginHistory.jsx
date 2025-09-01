import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History } from 'lucide-react';

const UserLoginHistory = ({ userId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const PAGE_SIZE = 5;

  const fetchHistory = useCallback(async (currentPage) => {
    setLoading(true);
    try {
      const countPromise = supabase.rpc('get_user_login_history_count', { user_id_param: userId });
      const historyPromise = supabase.rpc('get_user_login_history', { user_id_param: userId, page_param: currentPage, page_size_param: PAGE_SIZE });

      const [{ data: countData, error: countError }, { data: historyData, error: historyError }] = await Promise.all([countPromise, historyPromise]);

      if (countError) throw countError;
      if (historyError) throw historyError;

      setTotalCount(countData);
      setHistory(historyData || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger l\'historique de connexion.' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchHistory(page);
  }, [fetchHistory, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card className="glass-effect h-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History /> Historique de connexion</CardTitle>
        <CardDescription>Liste des dernières connexions de l'utilisateur.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : history.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date et Heure</TableHead>
                  <TableHead>Adresse IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(entry.created_at).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{entry.ip_address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <span className="text-sm">Page {page} sur {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun historique de connexion trouvé.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default UserLoginHistory;
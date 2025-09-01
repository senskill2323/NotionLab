import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from 'use-debounce';

export const useSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ searchTerm: '', userId: '' });
  const [debouncedFilters] = useDebounce(filters, 500);
  const [users, setUsers] = useState([]);
  const { toast } = useToast();

  const fetchSubmissionsAndUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_user_formation_submissions', {
        p_filters: { searchTerm: debouncedFilters.searchTerm, status: '', userId: debouncedFilters.userId },
        p_sort_field: 'submitted_at',
        p_sort_dir: 'desc',
        p_page: 1,
        p_per_page: 500,
      });
      if (error) throw error;
      setSubmissions(data.items || []);

      const uniqueUsers = [...new Map((data.items || []).map(item => [item.user_email, { id: item.user_id, name: item.user_full_name }])).values()];
      setUsers(uniqueUsers);

    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de charger les soumissions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, toast]);

  useEffect(() => {
    fetchSubmissionsAndUsers();
  }, [fetchSubmissionsAndUsers]);

  const handleStatusUpdate = async (submissionId, newStatus) => {
    const originalSubmissions = [...submissions];
    const submission = originalSubmissions.find(s => s.id === submissionId);
    if (!submission) return;

    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, submission_status: newStatus } : s));

    let rpcName = '';
    let params = { p_submission_id: submissionId };
    let successMsg = '';
    
    if (newStatus === 'approved') {
        rpcName = 'approve_user_parcours_submission';
        successMsg = 'Parcours validé et mis en LIVE.';
    } else if (newStatus === 'pending') {
        rpcName = 'revert_submission_to_pending';
        successMsg = 'Parcours remis en attente de validation.';
    } else {
        return;
    }
    
    const { error } = await supabase.rpc(rpcName, params);

    if (error) {
        setSubmissions(originalSubmissions);
        toast({ title: "Erreur", description: `Impossible de changer le statut: ${error.message}`, variant: "destructive" });
    } else {
        toast({ title: "Succès", description: successMsg });
        fetchSubmissionsAndUsers();
    }
  };

  const handleRejection = async (submissionId, rejectionNotes) => {
    const originalSubmissions = [...submissions];
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, submission_status: 'rejected' } : s));
    
    const { error } = await supabase.rpc('reject_user_parcours_submission', { p_submission_id: submissionId, p_admin_notes: rejectionNotes });

    if (error) {
        setSubmissions(originalSubmissions);
        toast({ title: "Erreur", description: `Impossible de rejeter: ${error.message}`, variant: "destructive" });
    } else {
        toast({ title: "Succès", description: "Le parcours a été rejeté." });
        fetchSubmissionsAndUsers();
    }
  };

  return {
    submissions,
    loading,
    filters,
    setFilters,
    users,
    handleStatusUpdate,
    handleRejection,
    refreshSubmissions: fetchSubmissionsAndUsers,
  };
};
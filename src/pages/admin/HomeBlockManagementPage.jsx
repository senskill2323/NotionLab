import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebounce } from 'use-debounce';

import BlocksToolbar from '@/components/admin/home-blocks/BlocksToolbar';
import BlocksTable from '@/components/admin/home-blocks/BlocksTable';
import Pagination from '@/components/admin/Pagination';
import EditHomeBlockPage from '@/pages/admin/EditHomeBlockPage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const HomeBlockManagementPage = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [editingBlockId, setEditingBlockId] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
  });
  
  const [filters, setFilters] = useState({ title: '', status: '' });
  const [debouncedFilters] = useDebounce(filters, 500);
  
  const [sort, setSort] = useState({ field: 'order_index', dir: 'asc' });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('search_content_blocks', {
        p_filters: debouncedFilters,
        p_sort_field: sort.field,
        p_sort_dir: sort.dir,
        p_page: pagination.page,
        p_per_page: pagination.perPage
      });

      if (rpcError) throw rpcError;
      
      setBlocks(data.items || []);
      setPagination(prev => ({ ...prev, total: data.total }));
      setError(null);
    } catch (err) {
      setError('Erreur lors de la récupération des blocs.');
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, debouncedFilters, sort.field, sort.dir, toast]);

  useEffect(() => {
    if (view === 'list') {
      fetchBlocks();
    }
  }, [fetchBlocks, view]);

  const handleAddBlock = () => {
    setEditingBlockId(null);
    setView('edit');
  };

  const handleEditBlock = (id) => {
    setEditingBlockId(id);
    setView('edit');
  };

  const handleBackToList = () => {
    setView('list');
    setEditingBlockId(null);
  };

  const handleSave = () => {
    setView('list');
    setEditingBlockId(null);
    fetchBlocks();
  };

  const confirmDelete = (id) => {
    setBlockToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!blockToDelete) return;
    try {
      const { error } = await supabase
        .from('content_blocks')
        .delete()
        .eq('id', blockToDelete);

      if (error) throw error;
      
      toast({ title: 'Succès', description: 'Le bloc a été supprimé.' });
      fetchBlocks();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer le bloc : ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setBlockToDelete(null);
    }
  };


  if (view === 'edit') {
    return <EditHomeBlockPage blockId={editingBlockId} onBack={handleBackToList} onSave={handleSave} />;
  }

  return (
    <div className="container mx-auto py-8">
      <Helmet>
        <title>Gestion des Blocs de Contenu | Admin</title>
      </Helmet>
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Blocs de Contenu</h1>
      </header>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      <BlocksToolbar 
        onAddBlock={handleAddBlock} 
        filters={filters} 
        setFilters={setFilters} 
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <BlocksTable
            blocks={blocks}
            onEdit={handleEditBlock}
            onDelete={confirmDelete}
          />
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.perPage)}
            onPageChange={(page) => setPagination(p => ({ ...p, page }))}
          />
        </>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce bloc ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bloc sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HomeBlockManagementPage;
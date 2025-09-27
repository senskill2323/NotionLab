import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Plus, Search, Loader2, ExternalLink, Edit, Trash2, EyeOff, Eye, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const StaticPageManagementPanel = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('static_pages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erreur', description: "Impossible de charger les pages statiques.", variant: 'destructive' });
    } else {
      setPages(data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const filteredPages = useMemo(
    () =>
      pages.filter((page) =>
        (page.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [pages, searchTerm],
  );

  const handleStatusToggle = async (page) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('static_pages')
      .update({ status: newStatus })
      .eq('id', page.id);

    if (error) {
      toast({ title: 'Erreur', description: `Impossible de changer le statut. ${error.message}`, variant: 'destructive' });
    } else {
      toast({
        title: 'Succes',
        description: `La page a ete ${newStatus === 'published' ? 'publiee' : 'depubliee'}.`,
        className: 'bg-green-500 text-white',
      });
      fetchPages();
    }
  };

  const handleDelete = async (pageId) => {
    const { error } = await supabase
      .from('static_pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      toast({ title: 'Erreur', description: `Impossible de supprimer la page. ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Succes', description: 'La page a ete supprimee.', className: 'bg-green-500 text-white' });
      fetchPages();
    }
  };

  const handleAddNew = () => {
    navigate('/admin/pages/new');
  };

  const handleEdit = (pageId) => {
    navigate(`/admin/pages/${pageId}`);
  };

  const handleDuplicate = async (page) => {
    if (!page) return;
    const baseTitle = page.title || 'Page statique';
    const duplicatedTitle = `${baseTitle} (copie)`;
    const baseSlug = page.slug ? `${page.slug}-copie` : `page-${uuidv4().slice(0, 6)}`;
    const newSlug = `${baseSlug}-${uuidv4().slice(0, 6)}`;

    try {
      const { data, error } = await supabase
        .from('static_pages')
        .insert({
          title: duplicatedTitle.slice(0, 255),
          slug: newSlug,
          content: page.content || '',
          seo_description: page.seo_description || null,
          status: 'draft',
          options: page.options || {},
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Page dupliquee',
        description: `"${baseTitle}" a ete dupliquee en brouillon.`,
        className: 'bg-green-500 text-white',
      });

      fetchPages();
      if (data?.id) {
        navigate(`/admin/pages/${data.id}`);
      }
    } catch (dupError) {
      console.error('Error duplicating static page:', dupError);
      const details = dupError?.message ? ` ${dupError.message}` : '';
      toast({
        title: 'Erreur',
        description: `Impossible de dupliquer la page.${details}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-8 w-full md:w-80"
          />
        </div>
        <Button onClick={handleAddNew} className="notion-gradient text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle page
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Lien direct</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filteredPages.length > 0 ? (
              filteredPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status === 'published' ? 'Publiee' : 'Brouillon'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/page/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-blue-500 hover:underline"
                    >
                      /page/{page.slug} <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
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
                        <DropdownMenuItem onClick={() => handleEdit(page.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Modifier</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                          <Copy className="mr-2 h-4 w-4" />
                          <span>Dupliquer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusToggle(page)}>
                          {page.status === 'published' ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              <span>Depublier</span>
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Publier</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(event) => event.preventDefault()}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Etes-vous sur ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est definitive. La page "{page.title}" sera supprimee.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(page.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Aucune page trouvee.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StaticPageManagementPanel;

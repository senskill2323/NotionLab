import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import {
  Search, Plus, Eye, MoreVertical, Loader2, AlertCircle, Code, Layers, Edit, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BlockSamplesPanel = () => {
  const { toast } = useToast();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('block_samples')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSamples(data);
    } catch (err) {
      console.error("Error fetching block samples:", err);
      setError("Erreur lors de la récupération des modèles de blocs.");
      toast({ title: "Erreur", description: "Impossible de charger les modèles de blocs.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleAction = (actionName) => {
    toast({
      title: '🚧 Bientôt disponible!',
      description: `La fonctionnalité "${actionName}" est en cours de développement.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">Bibliothèque de modèles de Blocs</h2>
        <Button className="rounded-full bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" onClick={() => handleAction('Ajouter un modèle')}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un modèle
        </Button>
      </div>

      <div className="bg-muted/50 dark:bg-card/30 p-4 rounded-lg space-y-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un modèle..."
            className="pl-10"
            onChange={() => handleAction('Recherche')}
          />
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Titre</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-red-500"><AlertCircle className="mx-auto h-6 w-6 mb-2" />{error}</TableCell></TableRow>
            ) : samples.length > 0 ? (
              samples.map(sample => (
                <TableRow key={sample.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{sample.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sample.description || '-'}</TableCell>
                  <TableCell>
                     <Badge variant={sample.block_type === 'dynamic' ? 'outline' : 'default'} className="flex items-center gap-1 w-fit">
                      {sample.block_type === 'dynamic' ? <Layers className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                      {sample.block_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{sample.layout}</TableCell>
                  <TableCell>{format(new Date(sample.created_at), 'dd MMM yyyy', { locale: fr })}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction('Utiliser ce modèle')}>
                          <span>Utiliser ce modèle</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAction('Éditer')}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Éditer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('Prévisualiser')}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Prévisualiser</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleAction('Supprimer')}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Supprimer</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun modèle de bloc trouvé. Créez-en un pour commencer !</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BlockSamplesPanel;
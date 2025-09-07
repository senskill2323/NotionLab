import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2, Code, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BlockPreview from './BlockPreview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const BlocksTable = ({ blocks, onEdit, onDelete, onPreview }) => {
  const [previewingBlock, setPreviewingBlock] = useState(null);
  const { toast } = useToast();

  const getStatusVariant = (status) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handlePreview = (block) => {
    setPreviewingBlock(block);
  };

  const handleMove = async (block, direction) => {
    try {
      // Tri local par ordre
      const sorted = [...blocks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const idx = sorted.findIndex(b => b.id === block.id);
      if (idx === -1) return;

      const isUp = direction === 'up';
      const neighborIndex = isUp ? idx - 1 : idx + 1;
      if (neighborIndex < 0 || neighborIndex >= sorted.length) {
        toast({ title: 'Info', description: `Impossible de déplacer ${isUp ? 'vers le haut' : 'vers le bas'}.` });
        return;
      }

      const neighbor = sorted[neighborIndex];
      const currentOrder = block.order_index ?? 0;
      const neighborOrder = neighbor.order_index ?? 0;
      const tmp = -Date.now();

      // Swap en 3 étapes pour éviter collisions d'unicité potentielle
      let r1 = await supabase.from('content_blocks').update({ order_index: tmp }).eq('id', block.id);
      if (r1.error) throw r1.error;
      let r2 = await supabase.from('content_blocks').update({ order_index: currentOrder }).eq('id', neighbor.id);
      if (r2.error) throw r2.error;
      let r3 = await supabase.from('content_blocks').update({ order_index: neighborOrder }).eq('id', block.id);
      if (r3.error) throw r3.error;

      toast({ title: 'Succès', description: 'Ordre mis à jour.' });
    } catch (err) {
      console.error('Reorder error', err);
      toast({ title: 'Erreur', description: `Impossible de réordonner: ${err.message}`, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (block, newStatus) => {
    try {
      const { error } = await supabase.from('content_blocks').update({ status: newStatus }).eq('id', block.id);
      if (error) throw error;
      toast({ title: 'Succès', description: 'Statut mis à jour.' });
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible de changer le statut: ${err.message}`, variant: 'destructive' });
    }
  };

  const handleArchive = async (block) => {
    try {
      const { error } = await supabase.from('content_blocks').update({ status: 'archived' }).eq('id', block.id);
      if (error) throw error;
      toast({ title: 'Succès', description: 'Bloc archivé (masqué).' });
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible d'archiver: ${err.message}`, variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordre</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Type de contenu</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Dernière modification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((block, index) => {
              const canEdit = block.block_type === 'html';
              const canPreview = block.block_type === 'dynamic';
              
              return (
              <TableRow key={block.id}>
                <TableCell className="w-28">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => handleMove(block, 'up')} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleMove(block, 'down')} disabled={index === blocks.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{block.title}</TableCell>
                <TableCell>
                  <Select value={block.status} onValueChange={(v) => handleStatusChange(block, v)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="published">Publié</SelectItem>
                      <SelectItem value="archived">Masqué</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={block.block_type === 'dynamic' ? 'outline' : 'default'} className="flex items-center gap-1 w-fit">
                    {block.block_type === 'dynamic' ? <Layers className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                    {block.block_type}
                  </Badge>
                </TableCell>
                <TableCell>{block.layout}</TableCell>
                <TableCell>
                  {block.publication_date ? format(new Date(block.publication_date), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handlePreview(block)} disabled={!canPreview}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Prévisualiser</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(block.id)} disabled={!canEdit}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Modifier</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleArchive(block)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Archiver</span>
                  </Button>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>
      <BlockPreview
        block={previewingBlock}
        isOpen={!!previewingBlock}
        onOpenChange={(isOpen) => !isOpen && setPreviewingBlock(null)}
      />
    </>
  );
};

export default BlocksTable;
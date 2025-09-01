import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2, Code, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BlockPreview from './BlockPreview';

const BlocksTable = ({ blocks, onEdit, onDelete, onPreview }) => {
  const [previewingBlock, setPreviewingBlock] = useState(null);

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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Type de contenu</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Dernière modification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((block) => {
              const canEdit = block.block_type === 'html';
              const canPreview = block.block_type === 'dynamic';
              
              return (
              <TableRow key={block.id}>
                <TableCell className="font-medium">{block.title}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(block.status)}>{block.status}</Badge>
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
                  <Button variant="ghost" size="icon" onClick={() => onDelete(block.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Supprimer</span>
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
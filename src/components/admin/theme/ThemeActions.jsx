import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThemeActions = ({ theme, onDuplicate, onDelete, compact = false }) => (
  <AlertDialog>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-muted-foreground hover:text-foreground', compact ? 'h-7 w-7' : 'h-8 w-8')}
          onClick={e => e.stopPropagation()}>
          <span className="sr-only">Ouvrir le menu</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onDuplicate(theme)}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Dupliquer</span>
        </DropdownMenuItem>
        {!theme.is_default && (
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Supprimer</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce thème ?</AlertDialogTitle>
        <AlertDialogDescription>
          Cette action est irréversible. Le thème "{theme.name}" sera définitivement supprimé.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Annuler</AlertDialogCancel>
        <AlertDialogAction onClick={() => onDelete(theme.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Supprimer
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

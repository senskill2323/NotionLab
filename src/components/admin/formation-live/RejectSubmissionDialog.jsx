import React from 'react';
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
import { Textarea } from '@/components/ui/textarea';

const RejectSubmissionDialog = ({ isOpen, onOpenChange, onConfirm, notes, setNotes }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeter la soumission</AlertDialogTitle>
          <AlertDialogDescription>
            Veuillez fournir une note pour expliquer pourquoi ce parcours est rejeté. Cette note sera visible par l'utilisateur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Ex: Le module X n'est pas pertinent, veuillez le remplacer par..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[100px]"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmer le rejet</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RejectSubmissionDialog;
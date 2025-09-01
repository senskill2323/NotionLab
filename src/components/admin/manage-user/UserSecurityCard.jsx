import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, KeyRound, Mail } from 'lucide-react';

const UserSecurityCard = ({ user, isSubmitting, handleSetDefaultPassword, handlePasswordResetRequest }) => {
  return (
    <Card className="glass-effect h-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound /> Sécurité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={isSubmitting}>
              Définir un mot de passe par défaut
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le mot de passe de l'utilisateur sera défini sur une valeur par défaut sécurisée (`Password123!`) et un email sera envoyé à {user.email} pour l'en notifier.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleSetDefaultPassword} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer et réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Button variant="secondary" className="w-full" onClick={handlePasswordResetRequest} disabled={isSubmitting}>
          <Mail className="mr-2 h-4 w-4" />
          Envoyer une demande de modification
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserSecurityCard;
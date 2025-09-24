import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const DeleteAccountSection = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const confirmationPhrase = 'SUPPRIMER MON COMPTE';
  const isConfirmationValid = confirmationText === confirmationPhrase;

  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);

    try {
      if (user.profile?.avatar_url) {
        const avatarPath = user.profile.avatar_url.split('/').pop();
        if (avatarPath) {
          await supabase.storage.from('avatars').remove([avatarPath]);
        }
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-user-full', {
        body: { userId: user.id },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Suppression impossible');
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      await signOut();

      toast({
        title: 'Compte supprime',
        description: 'Votre compte a ete supprime definitivement.',
      });

      navigate('/');
    } catch (error) {
      console.error('Erreur suppression compte:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer votre compte. Contactez le support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
      setConfirmationText('');
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Attention :</strong> La suppression de votre compte est definitive et irreversible.
          Toutes vos donnees, formations, tickets et historique seront perdus.
        </AlertDescription>
      </Alert>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer mon compte
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer definitivement votre compte
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Cette action est <strong>irreversible</strong>. En supprimant votre compte, vous perdrez :</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Toutes vos donnees personnelles</li>
                <li>Vos formations et progression</li>
                <li>Vos tickets de support</li>
                <li>Votre historique complet</li>
              </ul>
              <p className="text-sm font-medium">
                Pour confirmer, tapez exactement :{' '}
                <code className="bg-muted px-1 rounded">{confirmationPhrase}</code>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirmation</Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={confirmationPhrase}
              className="font-mono"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationText('');
                setIsDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={!isConfirmationValid || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer definitivement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSection;

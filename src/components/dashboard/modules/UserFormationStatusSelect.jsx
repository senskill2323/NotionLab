import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const UserFormationStatusSelect = ({ formation, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);

    try {
      // Logique spécifique pour la soumission d'un parcours personnalisé
      if (newStatus === 'a_valider' && formation.course_type === 'custom') {
        const { error } = await supabase.rpc('submit_user_parcours_for_validation', {
          p_course_id: formation.id,
        });
        if (error) throw error;
        toast({
          title: 'Parcours soumis !',
          description: 'Votre parcours personnalisé a été envoyé pour validation.',
        });
      } else {
        // Logique générale pour les autres changements de statut
        const { data: existing, error: fetchError } = await supabase
          .from('user_formations')
          .select('id')
          .eq('user_id', formation.user_id)
          .eq('formation_id', formation.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          const { error: updateError } = await supabase
            .from('user_formations')
            .update({ status: newStatus })
            .eq('id', existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('user_formations')
            .insert({
              user_id: formation.user_id,
              formation_id: formation.id,
              status: newStatus,
              enrolled_at: new Date(),
            });
          if (insertError) throw insertError;
        }
        toast({
          title: 'Succès',
          description: 'Statut mis à jour.',
        });
      }
      
      onStatusChange(formation.id, newStatus);

    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour le statut: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatus = formation.status || 'en_preparation';
  const isLocked = ['a_valider', 'demarre', 'termine'].includes(currentStatus);

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating || isLocked}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Changer le statut" />
        </SelectTrigger>
        <SelectContent>
          {currentStatus === 'a_valider' && <SelectItem value="a_valider" disabled>En attente de validation</SelectItem>}
          {currentStatus === 'demarre' && <SelectItem value="demarre" disabled>Démarré</SelectItem>}
          {currentStatus === 'termine' && <SelectItem value="termine" disabled>Terminé</SelectItem>}
          
          <SelectItem value="en_preparation">En préparation</SelectItem>
          {formation.course_type === 'custom' && <SelectItem value="a_valider">Soumettre pour validation</SelectItem>}
          {formation.course_type === 'standard' && <SelectItem value="a_valider">S'inscrire</SelectItem>}
          <SelectItem value="archive">Archivé</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default UserFormationStatusSelect;
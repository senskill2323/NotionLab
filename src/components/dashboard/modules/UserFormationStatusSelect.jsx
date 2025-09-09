import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, Clock, Archive, Play } from 'lucide-react';

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

  const getStatusConfig = (status) => {
    switch (status) {
      case 'demarre':
        return { label: 'Démarré', variant: 'default', icon: <Play className="w-3 h-3" /> };
      case 'a_valider':
        return { label: 'En validation', variant: 'secondary', icon: <Clock className="w-3 h-3" /> };
      case 'termine':
        return { label: 'Terminé', variant: 'success', icon: <CheckCircle className="w-3 h-3" /> };
      case 'archive':
        return { label: 'Archivé', variant: 'outline', icon: <Archive className="w-3 h-3" /> };
      default:
        return { label: 'En préparation', variant: 'outline', icon: null };
    }
  };

  const statusConfig = getStatusConfig(currentStatus);

  if (isLocked) {
    return (
      <div className="flex items-center gap-2">
        {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
        <Badge variant={statusConfig.variant} className="flex items-center gap-1.5 text-xs px-2 py-1">
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <div className="flex items-center gap-1.5">
            {statusConfig.icon}
            <SelectValue placeholder="Statut" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en_preparation">En préparation</SelectItem>
          {formation.course_type === 'custom' && <SelectItem value="a_valider">Soumettre pour validation</SelectItem>}
          {formation.course_type === 'standard' && <SelectItem value="a_valider">S'inscrire</SelectItem>}
          <SelectItem value="archive">Archiver</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default UserFormationStatusSelect;
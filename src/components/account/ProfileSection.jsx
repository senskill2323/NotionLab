import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast.js';
import { Edit3, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabasClient';

const EditableField = ({ label, value, field, onUpdate, type = "text" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(field, editValue);
      setIsEditing(false);
      toast({
        title: "Modification enregistrée",
        description: `${label} mis à jour avec succès`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              id={field}
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="h-9 w-9 p-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1 p-2 bg-muted/50 rounded-md min-h-[36px] flex items-center">
              <span className="text-sm">
                {value || <span className="text-muted-foreground italic">Non renseigné</span>}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-9 w-9 p-0 hover:bg-muted"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const ProfileSection = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const updateProfile = async (field, value) => {
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    // Rafraîchir les données utilisateur
    await refreshUser();
  };

  return (
    <div className="space-y-6">
      <EditableField
        label="Nom complet"
        value={user.profile?.full_name}
        field="full_name"
        onUpdate={updateProfile}
      />
      
      <EditableField
        label="Nom d'affichage (pseudo)"
        value={user.profile?.last_name}
        field="last_name"
        onUpdate={updateProfile}
      />
      
      <EditableField
        label="Prénom"
        value={user.profile?.first_name}
        field="first_name"
        onUpdate={updateProfile}
      />
      
      <EditableField
        label="Téléphone"
        value={user.profile?.phone}
        field="phone"
        onUpdate={updateProfile}
        type="tel"
      />
    </div>
  );
};

export default ProfileSection;

import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast.js';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabasClient';

const EditableField = ({ label, value, field, onUpdate, type = "text", containerClassName = '' }) => {
  const [editValue, setEditValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Synchroniser editValue avec value quand value change
  React.useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(field, editValue);
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

  const wrapperClassName = ['space-y-2', containerClassName].filter(Boolean).join(' ');

  return (
    <div className={wrapperClassName}>
      <Label htmlFor={field} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={field}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          disabled={isLoading}
          className="flex-1"
          placeholder={`Saisir ${label.toLowerCase()}`}
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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

  const updateEmail = async (field, value) => {
    // Mise à jour de l'email via Supabase Auth
    const { error } = await supabase.auth.updateUser({ email: value });
    if (error) {
      throw error;
    }
    // Rafraîchir les données utilisateur
    await refreshUser();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <EditableField
        label="Email"
        value={user.email}
        field="email"
        onUpdate={updateEmail}
        type="email"
        containerClassName="md:col-span-2"
      />

      <EditableField
        label="Nom"
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
        label="Pseudo"
        value={user.profile?.pseudo}
        field="pseudo"
        onUpdate={updateProfile}
      />

      <EditableField
        label="Téléphone"
        value={user.profile?.phone_number}
        field="phone_number"
        onUpdate={updateProfile}
        type="tel"
      />
    </div>
  );
};

export default ProfileSection;

import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit3, Check, X, Loader2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabasClient';

const AddressField = ({ label, value, field, onUpdate, placeholder }) => {
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
        title: "Adresse mise à jour",
        description: `${label} modifié avec succès`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'adresse",
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
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
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
                {value || <span className="text-muted-foreground italic">{placeholder}</span>}
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

const AddressSection = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const updateAddress = async (field, value) => {
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    await refreshUser();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Information facultative :</strong> Ces informations ne sont pas obligatoires et ne seront utilisées que si vous le souhaitez. 
          Vous pouvez les laisser vides ou les remplir partiellement selon vos besoins.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <AddressField
            label="Adresse"
            value={user.profile?.address}
            field="address"
            onUpdate={updateAddress}
            placeholder="Numéro et nom de rue"
          />
        </div>
        
        <AddressField
          label="Ville"
          value={user.profile?.city}
          field="city"
          onUpdate={updateAddress}
          placeholder="Votre ville"
        />
        
        <AddressField
          label="Code postal"
          value={user.profile?.postal_code}
          field="postal_code"
          onUpdate={updateAddress}
          placeholder="Code postal"
        />
        
        <div className="md:col-span-2">
          <AddressField
            label="Pays"
            value={user.profile?.country}
            field="country"
            onUpdate={updateAddress}
            placeholder="Votre pays"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressSection;

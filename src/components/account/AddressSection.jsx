import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit3, Check, X, Loader2, Info, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/lib/supabasClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import useCountries from '@/hooks/useCountries';

const normalizeValue = (value) => {
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
};

const AddressField = ({ label, value, field, onUpdate, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if ((editValue || '') === (value || '')) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate({ [field]: normalizeValue(editValue) });
      setIsEditing(false);
      toast({
        title: 'Adresse mise à jour',
        description: `${label} modifié avec succès`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de sauvegarder l'adresse",
        variant: 'destructive',
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

const CountryField = ({ label, value, onUpdate, countries, placeholder, isLoadingOptions, optionsError }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  const selected = countries.find((country) => country.code === value) || null;

  const handleSelect = async (code) => {
    if (!code || code === value) {
      setPopoverOpen(false);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({ country_code: code, country_code_ref: code });
      toast({
        title: 'Adresse mise à jour',
        description: `${label} modifié avec succès`,
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de sauvegarder l'adresse",
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setPopoverOpen(false);
    }
  };

  const handleClear = async () => {
    if (!value) {
      setIsEditing(false);
      setPopoverOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({ country_code: null, country_code_ref: null });
      toast({
        title: 'Adresse mise à jour',
        description: `${label} modifié avec succès`,
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de sauvegarder l'adresse",
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setPopoverOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Popover
              open={popoverOpen}
              onOpenChange={(open) => {
                if (!isSaving) setPopoverOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="flex-1 justify-between"
                  disabled={isSaving || isLoadingOptions || optionsError}
                  onClick={() => setPopoverOpen((prev) => !prev)}
                >
                  <span className="truncate text-left">
                    {selected ? `${selected.name} (${selected.code})` : 'Sélectionner un pays...'}
                  </span>
                  {isSaving ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un pays..." />
                  <CommandEmpty>{optionsError ? 'Impossible de charger les pays.' : isLoadingOptions ? 'Chargement...' : 'Aucun pays trouvé.'}</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-72">
                      {countries.map((country) => (
                        <CommandItem
                          key={country.code}
                          value={country.name}
                          onSelect={() => handleSelect(country.code)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              country.code === value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {country.name}
                        </CommandItem>
                      ))}
                      <CommandItem
                        value="__clear__"
                        onSelect={handleClear}
                        className="text-muted-foreground"
                      >
                        Effacer la sélection
                      </CommandItem>
                    </ScrollArea>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setPopoverOpen(false);
              }}
              disabled={isSaving}
              className="h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1 p-2 bg-muted/50 rounded-md min-h-[36px] flex items-center">
              <span className="text-sm">
                {selected ? `${selected.name} (${selected.code})` : (
                  <span className="text-muted-foreground italic">{placeholder}</span>
                )}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-9 w-9 p-0 hover:bg-muted"
              disabled={(isLoadingOptions || optionsError) && !selected}
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
  const countriesQuery = useCountries();

  const updateAddress = async (payload) => {
    const { error } = await supabase
      .from('profiles')
      .update(payload)
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
            value={user.profile?.address_line}
            field="address_line"
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
          <CountryField
            label="Pays"
            value={user.profile?.country_code_ref ?? user.profile?.country_code}
            onUpdate={updateAddress}
            countries={countriesQuery.data || []}
            placeholder="Votre pays"
            isLoadingOptions={countriesQuery.isLoading}
            optionsError={Boolean(countriesQuery.error)}
          />
        </div>
      </div>
    </div>
  );
};

export default AddressSection;



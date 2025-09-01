import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, KeyRound, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import countries from '@/data/countries.json';
import { cn } from '@/lib/utils';

const PersonalDataForm = ({ editMode = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const { register, handleSubmit, reset, control, setValue, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    if (user?.profile) {
      reset({
        first_name: user.profile.first_name || '',
        last_name: user.profile.last_name || '',
        email: user.email || '',
        phone_number: user.profile.phone_number || '',
        postal_code: user.profile.postal_code || '',
        city: user.profile.city || '',
        country_code: user.profile.country_code || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    if (editMode) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        postal_code: data.postal_code,
        city: data.city,
        country_code: data.country_code,
      })
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      toast({
        title: 'Erreur',
        description: 'La mise à jour de votre profil a échoué.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Votre profil a été mis à jour.',
      });
    }
  };

  const handlePasswordReset = async () => {
    if (editMode) return;
    setPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/connexion?reason=reset`,
    });
    setPasswordLoading(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'envoyer l'email de réinitialisation.",
      });
    } else {
      toast({
        title: 'Email envoyé',
        description: 'Veuillez consulter votre boîte de réception pour changer votre mot de passe.',
      });
    }
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">Prénom</Label>
          <Input id="first_name" {...register('first_name')} disabled={editMode} />
        </div>
        <div>
          <Label htmlFor="last_name">Nom</Label>
          <Input id="last_name" {...register('last_name')} disabled={editMode} />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} disabled />
      </div>
      <div>
        <Label htmlFor="phone_number">Téléphone</Label>
        <Input id="phone_number" {...register('phone_number')} disabled={editMode} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="postal_code">Code Postal</Label>
          <Input id="postal_code" {...register('postal_code')} disabled={editMode} />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input id="city" {...register('city')} disabled={editMode} />
        </div>
      </div>
       <div>
        <Label htmlFor="country_code">Pays</Label>
         <Controller
            name="country_code"
            control={control}
            render={({ field }) => (
              <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryPopoverOpen}
                    className="w-full justify-between"
                    disabled={editMode}
                  >
                    {field.value
                      ? countries.find((country) => country.code === field.value)?.name
                      : "Sélectionner un pays..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Rechercher un pays..." />
                    <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-72">
                        {countries.map((country) => (
                          <CommandItem
                            key={country.code}
                            value={country.name}
                            onSelect={() => {
                              setValue("country_code", country.code, { shouldDirty: true });
                              setCountryPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === country.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country.name}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          />
      </div>
      {!editMode && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={loading || !isDirty}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
          <Button type="button" variant="outline" onClick={handlePasswordReset} disabled={passwordLoading}>
            {passwordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Changer mon mot de passe
          </Button>
        </div>
      )}
    </form>
  );
};

export default PersonalDataForm;
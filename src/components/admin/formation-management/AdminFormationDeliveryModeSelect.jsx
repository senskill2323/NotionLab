import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Monitor, MapPin, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const deliveryModeConfig = {
  online: { label: "En ligne", icon: <Monitor className="w-4 h-4" /> },
  in_person: { label: "Présentiel", icon: <MapPin className="w-4 h-4" /> },
  hybrid: { label: "Hybride", icon: <Layers className="w-4 h-4" /> },
};

const AdminFormationDeliveryModeSelect = ({ course, onDeliveryModeChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleDeliveryModeChange = async (newMode) => {
    if (newMode === course.delivery_mode) return; // Éviter les updates inutiles
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ delivery_mode: newMode })
        .eq('id', course.id);

      if (error) {
        toast({
          title: 'Erreur',
          description: `Impossible de mettre à jour le mode de diffusion: ${error.message}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Succès',
          description: 'Mode de diffusion mis à jour.',
        });
        if (onDeliveryModeChange) {
          onDeliveryModeChange(course.id, newMode);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue s\'est produite.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Assurer une valeur par défaut robuste
  const deliveryMode = course?.delivery_mode || 'hybrid';
  const currentMode = deliveryModeConfig[deliveryMode] || deliveryModeConfig.hybrid;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  currentMode.icon
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Mode actuel: {currentMode.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        {Object.entries(deliveryModeConfig).map(([value, { label, icon }]) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleDeliveryModeChange(value)}
            className="flex items-center gap-2"
          >
            {icon}
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminFormationDeliveryModeSelect;


import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Settings, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const typeConfig = {
  standard: { label: "Standard", icon: <Settings className="w-4 h-4" /> },
  custom: { label: "Personnalisé", icon: <User className="w-4 h-4" /> },
};

const AdminFormationTypeSelect = ({ course, onTypeChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleTypeChange = async (newType) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('courses')
      .update({ course_type: newType })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Erreur', description: `Impossible de changer le type: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Type de formation mis à jour.' });
      onTypeChange(course.id, newType);
    }
    setIsUpdating(false);
  };

  const currentType = typeConfig[course.course_type] || { label: "Inconnu" };

  return (
    <Select value={course.course_type} onValueChange={handleTypeChange} disabled={isUpdating}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger className="h-9 w-auto flex-grow text-xs pl-2 pr-2" hideArrow>
              <SelectValue asChild>
                <div className="flex items-center gap-2">
                  {currentType.icon}
                  <span className="truncate">{currentType.label}</span>
                  {isUpdating && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                </div>
              </SelectValue>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>Changer le type</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SelectContent>
        {Object.entries(typeConfig).map(([value, { label, icon }]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              {icon}
              <span>{label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AdminFormationTypeSelect;

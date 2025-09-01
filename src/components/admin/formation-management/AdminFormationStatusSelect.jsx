
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CircleDot, ShieldCheck, Archive } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const statusConfig = {
  draft: { label: "Brouillon", icon: <CircleDot className="w-4 h-4" />, color: "bg-gray-500" },
  a_valider: { label: "À valider", icon: <CircleDot className="w-4 h-4" />, color: "bg-yellow-500" },
  live: { label: "En ligne", icon: <ShieldCheck className="w-4 h-4" />, color: "bg-green-500" },
  archived: { label: "Archivé", icon: <Archive className="w-4 h-4" />, color: "bg-red-500" },
};

const AdminFormationStatusSelect = ({ course, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('courses')
      .update({ status: newStatus })
      .eq('id', course.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour le statut: ${error.message}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Statut de la formation mis à jour.',
      });
      onStatusChange(course.id, newStatus);
    }
    setIsUpdating(false);
  };
  
  const currentStatus = statusConfig[course.status] || { label: "Inconnu", color: "bg-gray-400" };

  return (
    <Select value={course.status} onValueChange={handleStatusChange} disabled={isUpdating}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger className="h-9 w-auto flex-grow text-xs pl-2 pr-2" hideArrow>
              <SelectValue asChild>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", currentStatus.color)} />
                  <span className="truncate">{currentStatus.label}</span>
                  {isUpdating && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                </div>
              </SelectValue>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>Changer le statut</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SelectContent>
        {Object.entries(statusConfig).map(([value, { label, color }]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", color)} />
              <span>{label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AdminFormationStatusSelect;

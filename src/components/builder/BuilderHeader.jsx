import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Layers, MoreVertical, Save, Copy, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

export const BuilderHeader = ({
  parcoursId,
  parcoursName,
  handleParcoursNameSave,
  handleSave,
  handleDuplicate,
  handleDelete,
  handleCloseAndReturn,
  moduleCount,
  totalHours,
  handleSubmitForValidation,
}) => {
  const [localParcoursName, setLocalParcoursName] = useState(parcoursName);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const DEFAULT_TITLE = "Nouvelle formation Sans Titre...";

  useEffect(() => {
    setLocalParcoursName(parcoursName);
    if (parcoursName === DEFAULT_TITLE) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 3000); // Animation for 3s
      return () => clearTimeout(timer);
    } else {
      setIsPulsing(false);
    }
  }, [parcoursName]);

  const handleNameChange = (e) => {
    setLocalParcoursName(e.target.value);
  };

  const handleNameBlur = () => {
    if (localParcoursName !== parcoursName) {
      handleParcoursNameSave(localParcoursName);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameBlur();
      e.target.blur();
    }
  };

  return (
    <Card className="glass-effect-light rounded-b-none">
      <CardHeader className="py-3 px-4">
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="sm" onClick={handleCloseAndReturn} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Fermer
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Layers className="w-4 h-4 mr-2" />
              <span>{moduleCount} {moduleCount > 1 ? 'modules' : 'module'}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span>{totalHours}h</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSave()}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSubmitForValidation}>
                  <Save className="w-4 h-4 mr-2" />
                  Soumettre pour validation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Input
          id="parcoursName"
          value={localParcoursName}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "text-2xl font-bold border-0 focus-visible:ring-0 p-0 h-auto bg-transparent",
            isPulsing && "animate-pulse-text"
          )}
          placeholder="Nom de la formation"
        />
      </CardHeader>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La formation sera supprimée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
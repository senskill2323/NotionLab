
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Copy, Trash2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminFormationStatusSelect from './AdminFormationStatusSelect';
import AdminFormationTypeSelect from './AdminFormationTypeSelect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const FormationCard = ({ formation, onStatusChange, onTypeChange, onDuplicate, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await onDelete(formation.id);
    setIsDeleting(false);
  };

  return (
    <Card className="overflow-hidden glass-effect h-full flex flex-col group">
      <CardHeader className="p-0 relative">
        <div className="aspect-video bg-muted overflow-hidden">
          {formation.cover_image_url ? (
            <img-replace src={formation.cover_image_url} alt={formation.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
              <span className="text-muted-foreground text-sm">Pas d'image</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-base font-bold mb-2 h-10 line-clamp-2">{formation.title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Par {formation.author ? `${formation.author.first_name} ${formation.author.last_name}` : 'N/A'}
        </p>
      </CardContent>
      <CardFooter className="p-2 bg-muted/20 border-t flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <AdminFormationStatusSelect course={formation} onStatusChange={onStatusChange} />
          <AdminFormationTypeSelect course={formation} onTypeChange={onTypeChange} />
        </div>
        <div className="flex items-center flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to={`/formation-builder/${formation.id}`}>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Éditer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDuplicate(formation)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dupliquer</TooltipContent>
            </Tooltip>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Supprimer</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette formation ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible et supprimera définitivement la formation "{formation.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Oui, supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FormationCard;

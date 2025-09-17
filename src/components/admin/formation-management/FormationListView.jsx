import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AdminFormationStatusSelect from './AdminFormationStatusSelect';
import AdminFormationTypeSelect from './AdminFormationTypeSelect';
import AdminFormationDeliveryModeSelect from './AdminFormationDeliveryModeSelect';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const FormationListView = ({ formations, onStatusChange, onTypeChange, onDeliveryModeChange, onDuplicate, onDelete, onImageUpdate }) => {
  const { toast } = useToast();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titre</TableHead>
          <TableHead>Auteur / Soumission</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Créé le</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {formations.length > 0 ? (
          formations.map((formation) => (
            <TableRow key={formation.displayId || formation.id}>
              <TableCell className="font-medium">{formation.title}</TableCell>
              <TableCell>
                {formation.is_user_submission
                  ? (formation.user_email || 'Soumission')
                  : (formation.author ? `${formation.author.first_name} ${formation.author.last_name}` : 'N/A')}
              </TableCell>
              <TableCell>
                {formation.is_user_submission ? (
                  <span>Soumission</span>
                ) : (
                  <AdminFormationTypeSelect course={formation} onTypeChange={onTypeChange} />
                )}
              </TableCell>
              <TableCell>{new Date(formation.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {formation.is_user_submission ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formation.submission_status || 'pending'}</span>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const { error } = await supabase.rpc('approve_user_parcours_submission', { p_submission_id: formation.id });
                      if (error) {
                        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'Validé', description: 'Soumission approuvée et mise en LIVE.' });
                      }
                    }}>Valider</Button>
                    <Button size="sm" variant="secondary" onClick={async () => {
                      const { error } = await supabase.rpc('revert_submission_to_pending', { p_submission_id: formation.id });
                      if (error) {
                        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'Remis en attente', description: 'Soumission remise en attente.' });
                      }
                    }}>À valider</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                      const { error } = await supabase.rpc('reject_user_parcours_submission', { p_submission_id: formation.id, p_admin_notes: '' });
                      if (error) {
                        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'Rejetée', description: 'Soumission rejetée.' });
                      }
                    }}>Rejeter</Button>
                  </div>
                ) : (
                  <AdminFormationStatusSelect course={formation} onStatusChange={onStatusChange} />
                )}
              </TableCell>
              <TableCell className="text-right">
                {formation.is_user_submission ? (
                  <div className="text-xs text-muted-foreground">—</div>
                ) : (
                  <TooltipProvider>
                    <div className="flex justify-end items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={`/formation-builder/${formation.id}`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Éditer</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onDuplicate(formation)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dupliquer</TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                            <AlertDialogAction onClick={() => onDelete(formation.id)} className="bg-destructive hover:bg-destructive/90">
                              Oui, supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TooltipProvider>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan="6" className="h-24 text-center">
              Aucune formation ne correspond à vos filtres.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default FormationListView;
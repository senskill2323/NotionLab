import React, { useState, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Copy, Trash2, Loader2, ImagePlus, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminFormationStatusSelect from './AdminFormationStatusSelect';
import AdminFormationTypeSelect from './AdminFormationTypeSelect';
import AdminFormationDeliveryModeSelect from './AdminFormationDeliveryModeSelect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const FormationCard = ({ formation, onStatusChange, onTypeChange, onDuplicate, onDelete, onImageUpdate, onDeliveryModeChange }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await onDelete(formation.id);
    setIsDeleting(false);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un fichier image valide.',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erreur',
        description: 'L\'image ne doit pas dépasser 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `formation-${formation.id}-${Date.now()}.${fileExt}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('formation-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('formation-images')
        .getPublicUrl(fileName);

      // Mettre à jour la formation avec la nouvelle URL d'image
      const { error: updateError } = await supabase
        .from('courses')
        .update({ cover_image_url: publicUrl })
        .eq('id', formation.id);

      if (updateError) throw updateError;

      // Notifier le parent component
      if (onImageUpdate) {
        onImageUpdate(formation.id, publicUrl);
      }

      toast({
        title: 'Succès',
        description: 'L\'image a été mise à jour avec succès.',
      });

    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger l\'image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageDelete = async () => {
    if (!formation.cover_image_url) return;

    setIsUploadingImage(true);

    try {
      // Extraire le nom du fichier de l'URL
      const url = new URL(formation.cover_image_url);
      const fileName = url.pathname.split('/').pop();

      // Supprimer de Supabase Storage
      if (fileName) {
        await supabase.storage
          .from('formation-images')
          .remove([fileName]);
      }

      // Mettre à jour la formation pour supprimer l'URL d'image
      const { error: updateError } = await supabase
        .from('courses')
        .update({ cover_image_url: null })
        .eq('id', formation.id);

      if (updateError) throw updateError;

      // Notifier le parent component
      if (onImageUpdate) {
        onImageUpdate(formation.id, null);
      }

      toast({
        title: 'Succès',
        description: 'L\'image a été supprimée avec succès.',
      });

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="overflow-hidden glass-effect h-full flex flex-col group">
      <CardHeader className="p-0 relative">
        <div 
          className="aspect-video bg-muted overflow-hidden relative group/image"
          onMouseEnter={() => setIsImageHovered(true)}
          onMouseLeave={() => setIsImageHovered(false)}
        >
          {formation.cover_image_url ? (
            <img src={formation.cover_image_url} alt={formation.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
              <span className="text-muted-foreground text-sm">Pas d'image</span>
            </div>
          )}
          
          {/* Overlay menu au survol (disabled for submissions) */}
          {isImageHovered && !formation.is_user_submission && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-all duration-200">
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 bg-white/90 hover:bg-white text-black"
                        onClick={triggerFileInput}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : formation.cover_image_url ? (
                          <Edit className="h-4 w-4" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formation.cover_image_url ? 'Modifier l\'image' : 'Ajouter une image'}
                    </TooltipContent>
                  </Tooltip>
                  
                  {formation.cover_image_url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-10 w-10 bg-red-500/90 hover:bg-red-500 text-white"
                          onClick={handleImageDelete}
                          disabled={isUploadingImage}
                        >
                          {isUploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Supprimer l'image</TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </div>
          )}
          
          {/* Input file caché (disabled for submissions) */}
          {!formation.is_user_submission && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-base font-bold mb-2 h-10 line-clamp-2">{formation.title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {formation.is_user_submission ? (
            <span>Soumission par {formation.user_email || 'Utilisateur'}</span>
          ) : (
            <span>Par {formation.author ? `${formation.author.first_name} ${formation.author.last_name}` : 'N/A'}</span>
          )}
        </p>
      </CardContent>
      <CardFooter className="p-2 bg-muted/20 border-t flex items-center justify-between gap-2">
        {formation.is_user_submission ? (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-xs text-muted-foreground truncate">
              Statut: <span className="font-medium">{formation.submission_status || 'pending'}</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isSubmittingAction}
                      onClick={async () => {
                        try {
                          setIsSubmittingAction(true);
                          await supabase.rpc('approve_user_parcours_submission', { p_submission_id: formation.id }).throwOnError();
                          toast({ title: 'Validé', description: 'Soumission approuvée et mise en LIVE.' });
                        } catch (e) {
                          toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                        } finally {
                          setIsSubmittingAction(false);
                        }
                      }}
                    >
                      Valider
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Approuver et initialiser le Kanban</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="secondary" disabled={isSubmittingAction}
                      onClick={async () => {
                        try {
                          setIsSubmittingAction(true);
                          await supabase.rpc('revert_submission_to_pending', { p_submission_id: formation.id }).throwOnError();
                          toast({ title: 'Remis en attente', description: 'Soumission remise en attente.' });
                        } catch (e) {
                          toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                        } finally {
                          setIsSubmittingAction(false);
                        }
                      }}
                    >
                      À valider
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Revenir à l’état “pending”</TooltipContent>
                </Tooltip>
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isSubmittingAction}>
                          Rejeter
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Rejeter la soumission</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rejeter cette soumission ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action mettra la soumission en statut “rejected”.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            setIsSubmittingAction(true);
                            await supabase.rpc('reject_user_parcours_submission', { p_submission_id: formation.id, p_admin_notes: '' }).throwOnError();
                            toast({ title: 'Rejetée', description: 'Soumission rejetée.' });
                          } catch (e) {
                            toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                          } finally {
                            setIsSubmittingAction(false);
                          }
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Confirmer le rejet
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <AdminFormationStatusSelect course={formation} onStatusChange={onStatusChange} />
              <AdminFormationTypeSelect course={formation} onTypeChange={onTypeChange} />
              <AdminFormationDeliveryModeSelect course={formation} onDeliveryModeChange={onDeliveryModeChange} />
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
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default FormationCard;

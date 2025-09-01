import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FolderKanban, Star, StickyNote, FileType, Youtube, FileText, Eye, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ViewResourceDialog from './ViewResourceDialog';
import NewResourceDialog from '@/components/admin/NewResourceDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Papa from 'papaparse';

const StarRating = ({ rating, onRate, resourceId, editMode }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleRating = async (newRating) => {
    if (editMode || !user) return;
    const { data, error } = await supabase
      .from('resource_ratings')
      .upsert({ resource_id: resourceId, user_id: user.id, rating: newRating }, { onConflict: 'resource_id,user_id' });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder la note.", variant: "destructive" });
    } else {
      onRate(resourceId, newRating);
    }
  };

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`cursor-pointer h-4 w-4 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          onClick={() => handleRating(star)}
        />
      ))}
    </div>
  );
};

const getFileIcon = (format) => {
    switch (format) {
      case 'pdf': return <FileType className="w-5 h-5 text-red-500" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
      case 'internal_note': return <StickyNote className="w-5 h-5 text-yellow-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
};

const ResourcesPanel = ({ editMode = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = React.useState([]);
  const [loading, setLoading] = React.useState(!editMode);
  const [selectedResource, setSelectedResource] = React.useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const fetchResources = React.useCallback(async () => {
    if (!user || editMode) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_user_resources_with_ratings', { p_user_id: user.id });
    if (error) {
      console.error('Error fetching resources:', error);
      toast({ title: "Erreur", description: "Impossible de charger les ressources.", variant: "destructive" });
    } else {
       const resourcesWithDetails = await Promise.all((data || []).map(async r => {
        let details = { content: '', file_path: null };
        if (r.format === 'internal_note' || r.format === 'pdf') {
          const { data: resourceDetails, error: detailsError } = await supabase
            .from('resources')
            .select('content, file_path')
            .eq('id', r.resource_id)
            .single();
          if (detailsError) console.error("Error fetching resource details:", detailsError);
          else details = resourceDetails;
        }
        return { ...r, ...details };
      }));
      setResources(resourcesWithDetails);
    }
    setLoading(false);
  }, [user, toast, editMode]);

  React.useEffect(() => {
    if (user) {
        fetchResources();
        const channelId = `user-resources-channel-${user.id}`;
        const channel = supabase.channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
                fetchResources();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, (payload) => {
                fetchResources();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_ratings' }, (payload) => {
                fetchResources();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
  }, [user, fetchResources]);

  const handleRate = (resourceId, newRating) => {
    setResources(prev => prev.map(r => r.resource_id === resourceId ? { ...r, rating: newRating } : r));
  };

  const handleDelete = async () => {
    if (!selectedResource) return;

    let error;
    if (selectedResource.source_type === 'created') {
      if (selectedResource.file_path) {
        const { error: storageError } = await supabase.storage.from('resources').remove([selectedResource.file_path]);
        if (storageError) toast({ title: "Erreur de suppression du fichier", description: storageError.message, variant: "destructive" });
      }
      const { error: deleteError } = await supabase.from('resources').delete().eq('id', selectedResource.resource_id);
      error = deleteError;
    } else if (selectedResource.source_type === 'assigned') {
      const { error: deleteError } = await supabase.from('resource_assignments').delete().eq('id', selectedResource.source_id);
      error = deleteError;
    }

    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la ressource.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "La ressource a été supprimée.", className: "bg-green-500 text-white" });
      fetchResources();
    }
    setIsDeleteDialogOpen(false);
    setSelectedResource(null);
  };

  const handleExport = (resource) => {
    const dataToExport = {
      "Nom": resource.name,
      "Type": resource.type,
      "Format": resource.format,
      "URL": resource.url || "N/A",
      "Contenu": resource.format === 'internal_note' ? resource.content : "N/A",
      "Date de création": new Date(resource.created_at).toLocaleString('fr-FR'),
      "Note personnelle": resource.rating ? `${resource.rating}/5` : "Non notée"
    };

    const csv = Papa.unparse([dataToExport]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const safeFileName = resource.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `${safeFileName}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exportation réussie", description: "Le fichier CSV a été téléchargé." });
  };

  const handleAction = (action, resource) => {
     if (editMode) return;

     setSelectedResource(resource);

     switch (action) {
        case 'Consulter':
            if (resource.format === 'internal_note') {
                setIsViewDialogOpen(true);
            } else if (resource.url) {
                window.open(resource.url, '_blank', 'noopener,noreferrer');
            } else {
                toast({
                    title: "Aucun contenu à afficher",
                    description: "Cette ressource n'a pas de contenu ou de lien associé.",
                    variant: "destructive"
                });
            }
            break;
        case 'Modifier':
            if (resource.source_type === 'created') {
                setIsEditDialogOpen(true);
            } else {
                toast({
                    title: "Action non autorisée",
                    description: "Vous ne pouvez modifier que les ressources assignées.",
                    variant: "destructive"
                });
            }
            break;
        case 'Supprimer':
            setIsDeleteDialogOpen(true);
            break;
        case 'Exporter':
            handleExport(resource);
            break;
        default:
            toast({
                title: "Action inconnue",
                description: `L'action "${action}" n'est pas reconnue.`,
            });
            break;
     }
  }

  const displayResources = editMode ? [{ source_id: 1, resource_id: 1, name: "Exemple de ressource", type: "PDF", format: "Document", rating: 4, url: "#", source_type: 'created', created_at: new Date().toISOString() }] : resources;

  return (
    <>
      <Card className="glass-effect h-full">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center text-base"><FolderKanban className="w-4 h-4 mr-2 text-primary" />Mes Ressources</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? <div className="flex justify-center items-center h-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
            <div className="space-y-2">
              {displayResources.length > 0 ? displayResources.map((resource) => (
                <div key={resource.source_id} className="bg-secondary/50 rounded-md p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(resource.format)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{resource.name}</h4>
                      <StarRating rating={resource.rating} onRate={handleRate} resourceId={resource.resource_id} editMode={editMode} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction('Consulter', resource)}>
                                      <Eye className="w-4 h-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Consulter</p></TooltipContent>
                          </Tooltip>
                          {resource.source_type === 'created' && (
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction('Modifier', resource)}>
                                          <Pencil className="w-4 h-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Modifier</p></TooltipContent>
                              </Tooltip>
                          )}
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction('Exporter', resource)}>
                                      <FileSpreadsheet className="w-4 h-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Exporter en CSV</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleAction('Supprimer', resource)}>
                                      <Trash2 className="w-4 h-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Supprimer</p></TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  </div>
                </div>
              )) : (
                <p className="text-center text-sm text-muted-foreground py-4">Aucune ressource. Créez-en depuis le chat !</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <ViewResourceDialog 
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        resource={selectedResource}
      />
      <NewResourceDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={fetchResources}
        existingResource={selectedResource}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedResource?.source_type === 'created'
                ? "Cette action supprimera définitivement la ressource et son fichier associé, si applicable. Cette action est irréversible."
                : "Cette action retirera la ressource de votre tableau de bord, mais ne la supprimera pas pour les autres utilisateurs."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ResourcesPanel;
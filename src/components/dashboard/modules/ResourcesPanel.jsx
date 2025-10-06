import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FolderKanban, Star, StickyNote, FileType, Youtube, FileText, Eye, Pencil, Trash2, FileSpreadsheet, Copy, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ModuleHeader from '@/components/dashboard/ModuleHeader';
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
    <div className="flex items-center ml-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`cursor-pointer h-3 w-3 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          onClick={() => handleRating(star)}
        />
      ))}
    </div>
  );
};

const getFileIcon = (format) => {
    switch (format) {
      case 'pdf': return <FileType className="w-4 h-4 text-red-500" />;
      case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
      case 'internal_note': return <StickyNote className="w-4 h-4 text-yellow-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
};

const formatResourceDate = (isoDate) => {
  if (!isoDate) return '--';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ResourcesPanel = ({ editMode = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = React.useState([]);
  const [loading, setLoading] = React.useState(!editMode);
  const [selectedResource, setSelectedResource] = React.useState(null);
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [activeTab, setActiveTab] = React.useState('inProgress');
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
                fetchResources();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, () => {
                fetchResources();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_ratings' }, () => {
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedResources = resources.filter(r => selectedIds.has(r.source_id));
    
    for (const resource of selectedResources) {
      let error;
      if (resource.source_type === 'created') {
        if (resource.file_path) {
          const { error: storageError } = await supabase.storage.from('resources').remove([resource.file_path]);
          if (storageError) console.error('Storage error:', storageError);
        }
        const { error: deleteError } = await supabase.from('resources').delete().eq('id', resource.resource_id);
        error = deleteError;
      } else if (resource.source_type === 'assigned') {
        const { error: deleteError } = await supabase.from('resource_assignments').delete().eq('id', resource.source_id);
        error = deleteError;
      }
      
      if (error) {
        toast({ title: "Erreur", description: `Impossible de supprimer ${resource.name}.`, variant: "destructive" });
      }
    }
    
    toast({ title: "Suppression réussie", description: `${selectedIds.size} ressource(s) supprimée(s).` });
    setSelectedIds(new Set());
    fetchResources();
  };

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedResources = resources.filter(r => selectedIds.has(r.source_id) && r.source_type === 'created');
    
    for (const resource of selectedResources) {
      const { error } = await supabase
        .from('resources')
        .insert({
          name: `${resource.name} (copie)`,
          type: resource.type,
          format: resource.format,
          url: resource.url,
          content: resource.content,
          user_id: user.id
        });
      
      if (error) {
        toast({ title: "Erreur", description: `Impossible de dupliquer ${resource.name}.`, variant: "destructive" });
      }
    }
    
    toast({ title: "Duplication réussie", description: `${selectedResources.length} ressource(s) dupliquée(s).` });
    setSelectedIds(new Set());
    fetchResources();
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

  // Filtrage des ressources par statut (simulé pour l'exemple)
  const inProgressResources = resources.filter(r => r.status !== 'archived');
  const archivedResources = resources.filter(r => r.status === 'archived');
  
  const displayResources = editMode 
    ? [{ source_id: 1, resource_id: 1, name: "Exemple de ressource", type: "PDF", format: "Document", rating: 4, url: "#", source_type: 'created', created_at: new Date().toISOString() }] 
    : (activeTab === 'inProgress' ? inProgressResources : archivedResources);

  // Gestion sélection
  const handleToggleSelect = (resourceId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(resourceId)) {
      newSelected.delete(resourceId);
    } else {
      newSelected.add(resourceId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayResources.length && displayResources.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayResources.map(r => r.source_id)));
    }
  };

  const isAllSelected = displayResources.length > 0 && selectedIds.size === displayResources.length;

  return (
    <>
      <Card className="glass-effect h-full">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center gap-3">
            <ModuleHeader
              title="Mes Ressources"
              Icon={FolderKanban}
              variant="slate"
            />
            {!editMode && (
              <Button
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="ml-auto bg-green-600/90 hover:bg-green-700 text-white h-9 px-3 text-xs font-medium rounded-full shadow-sm transition-all duration-200 hover:shadow"
              >
                <PlusCircle className="h-3 w-3 mr-1.5" />
                Créer une ressource
              </Button>
            )}
          </div>
        </CardHeader>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="inline-flex h-7 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-auto">
                  <TabsTrigger value="inProgress" className="text-xs px-2 py-1">En cours</TabsTrigger>
                  <TabsTrigger value="archived" className="text-xs px-2 py-1">Archivés</TabsTrigger>
                </TabsList>
              </Tabs>
              {displayResources.length > 0 && selectedIds.size > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={handleBulkDuplicate} className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Dupliquer</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Supprimer</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-4 pt-0">
          {loading ? <div className="flex justify-center items-center h-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
            <div className="space-y-0">
              {displayResources.length > 0 ? (
                <>
                  <div className="px-2 py-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-white bg-muted/40 border border-border/60 rounded-md sm:hidden flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className="h-3.5 w-3.5 border-primary/40"
                      />
                    </span>
                    <span>Nom de la ressource</span>
                  </div>
                  {/* Mobile list */}
                  <div className="sm:hidden space-y-0">
                    {displayResources.map((resource) => (
                      <div
                        key={resource.source_id}
                        className={`
                          relative group overflow-hidden px-2 py-0.5 flex items-center justify-between gap-1 
                          transition-all duration-200 hover:bg-muted/40 cursor-pointer
                          ${selectedIds.has(resource.source_id) ? 'ring-1 ring-primary/30 bg-muted/20' : ''}
                          motion-safe:hover:shadow-sm
                        `}
                        onClick={() => handleToggleSelect(resource.source_id)}
                      >
                        {/* Cross-over effect - mobile only */}
                        <div className="pointer-events-none absolute inset-0 -skew-x-6 bg-gradient-to-r from-transparent via-primary/8 to-transparent translate-x-[-100%] opacity-0 transition-all duration-500 motion-safe:group-hover:translate-x-[100%] motion-safe:group-hover:opacity-100" />

                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Checkbox
                            checked={selectedIds.has(resource.source_id)}
                            onCheckedChange={() => handleToggleSelect(resource.source_id)}
                            className="h-3.5 w-3.5"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {getFileIcon(resource.format)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs truncate">{resource.name}</span>
                              <StarRating rating={resource.rating} onRate={handleRate} resourceId={resource.resource_id} editMode={editMode} />
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{formatResourceDate(resource.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAction('Consulter', resource); }}>
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Consulter</p></TooltipContent>
                            </Tooltip>
                            {resource.source_type === 'created' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAction('Modifier', resource); }}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Modifier</p></TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAction('Exporter', resource); }}>
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Exporter en CSV</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleAction('Supprimer', resource); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Supprimer</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Unified desktop grid: header + rows */}
                  <div className="hidden sm:grid grid-cols-[28px_minmax(0,1fr)_150px_120px] gap-0.5 items-center rounded-md border border-border/60 bg-muted/40 px-2 py-1 mb-1 text-white">
                    <div className="flex items-center justify-center pb-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          className="h-3.5 w-3.5 border-primary/40"
                        />
                      </span>
                    </div>
                    <div className="pb-0 text-[11px] font-semibold uppercase tracking-wide text-white">Nom de la ressource</div>
                    <div className="pb-0 text-[11px] font-semibold uppercase tracking-wide text-white/90">Date d'ajout</div>
                    <div className="text-right pr-2 pb-0 text-[11px] font-semibold uppercase tracking-wide text-white/90">Actions</div>
                  </div>

                  <div className="hidden sm:flex sm:flex-col sm:gap-0">
                    {displayResources.map((resource) => {
                      const isSelected = selectedIds.has(resource.source_id);
                      return (
                        <div
                          key={resource.source_id}
                          className={`relative group rounded-md transition-all duration-200 cursor-pointer hover:bg-muted/40 ${isSelected ? 'bg-muted/20 ring-1 ring-primary/30' : ''}`}
                          onClick={() => handleToggleSelect(resource.source_id)}
                        >
                          <span className="pointer-events-none absolute inset-0 -skew-x-6 rounded-md bg-gradient-to-r from-transparent via-primary/8 to-transparent translate-x-[-100%] opacity-0 transition-all duration-500 motion-safe:group-hover:translate-x-[100%] motion-safe:group-hover:opacity-100" />
                          <div className="relative z-10 grid grid-cols-[28px_minmax(0,1fr)_150px_120px] gap-0.5 px-2 py-0.5 items-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(resource.source_id)}
                                className="h-3.5 w-3.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              {getFileIcon(resource.format)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs truncate">{resource.name}</span>
                                  <StarRating rating={resource.rating} onRate={handleRate} resourceId={resource.resource_id} editMode={editMode} />
                                </div>
                              </div>
                            </div>
                            <div className="pl-1 text-left text-xs text-muted-foreground sm:text-sm">
                              {formatResourceDate(resource.created_at)}
                            </div>
                            <div className="flex items-center gap-1 justify-end pr-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAction('Consulter', resource); }}>
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Consulter</p></TooltipContent>
                                </Tooltip>
                                {resource.source_type === 'created' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAction('Modifier', resource); }}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Modifier</p></TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAction('Exporter', resource); }}>
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Exporter en CSV</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleAction('Supprimer', resource); }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Supprimer</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">Aucune ressource. Creez-en depuis votre tableau de bord !</p>
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

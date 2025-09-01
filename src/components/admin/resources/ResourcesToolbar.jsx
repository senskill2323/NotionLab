import React from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
    import { Search, Layers, Download, Plus, Trash2 } from 'lucide-react';
    import Papa from 'papaparse';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    
    const ResourcesToolbar = ({
      searchTerm,
      setSearchTerm,
      groupBy,
      setGroupBy,
      onAddNew,
      selectedRows,
      setSelectedRows,
      resources,
      users,
      onDeleteSuccess
    }) => {
      const { toast } = useToast();

      const exportToCSV = () => {
        if (resources.length === 0) {
          toast({ title: "Exportation annulée", description: "Aucune ressource à exporter.", variant: "destructive" });
          return;
        }
        const dataToExport = resources.map(r => ({
            Nom: r.name,
            Type: r.type,
            Format: r.format,
            URL: r.url || "N/A",
            Note: r.content || "N/A",
            Création: new Date(r.created_at).toLocaleString('fr-FR'),
            Modification: new Date(r.updated_at).toLocaleString('fr-FR'),
            Assigné_à: r.assigned_user_ids.map(uid => {
                const user = users.find(u => u.id === uid);
                return user ? `${user.first_name} ${user.last_name}` : 'N/A';
            }).join(', ') || "Personne",
            Famille: r.family?.name || 'N/A',
            'Sous-Famille': r.subfamily?.name || 'N/A'
        }));
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `export_ressources_${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };

      const handleDeleteSelected = async () => {
        const resourcesToDelete = resources.filter(r => selectedRows.includes(r.id));
        const filePathsToDelete = resourcesToDelete.map(r => r.file_path).filter(Boolean);

        if (filePathsToDelete.length > 0) {
            const { error: storageError } = await supabase.storage.from('resources').remove(filePathsToDelete);
            if (storageError) {
                toast({ title: "Erreur de suppression de fichier", description: storageError.message, variant: "destructive" });
                // We don't return here, to try and delete DB records anyway
            }
        }

        const { error } = await supabase.from('resources').delete().in('id', selectedRows);
        if (error) {
            toast({ title: "Erreur", description: `Impossible de supprimer les ressources: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Succès", description: "Ressources sélectionnées supprimées.", className: "bg-green-500 text-white" });
            setSelectedRows([]);
            onDeleteSuccess();
        }
      };
    
      return (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"><Layers className="w-4 h-4 mr-2" />Grouper par: {groupBy !== 'none' ? groupBy : 'Aucun'}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setGroupBy('none')}>Aucun</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('type')}>Type</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('format')}>Format</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('family')}>Famille</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {selectedRows.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2" />Supprimer ({selectedRows.length})</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. {selectedRows.length} ressource(s) et leurs fichiers associés (si applicable) seront définitivement supprimée(s).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher une ressource..."
                className="pl-8 sm:w-[200px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={exportToCSV} aria-label="Exporter en CSV">
                <Download className="w-4 h-4" />
            </Button>
            <Button onClick={onAddNew} className="notion-gradient text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau
            </Button>
          </div>
        </div>
      );
    };
    
    export default ResourcesToolbar;
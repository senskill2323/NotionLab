import React from 'react';
    import { TableRow, TableCell } from "@/components/ui/table";
    import { Checkbox } from "@/components/ui/checkbox";
    import { Button } from "@/components/ui/button";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { MultiSelect } from '@/components/ui/multi-select';
    import { FileText, FileType, Youtube, StickyNote, Trash2, Pencil, Copy } from 'lucide-react';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    
    const ResourcesTableRow = ({ resource, isSelected, onSelectRow, relatedData, onEdit, onUpdateSuccess }) => {
      const { toast } = useToast();
      const { user } = useAuth();
      const { users, families, subfamilies } = relatedData;
      
      const handleUpdateResource = async (updates) => {
        const { error } = await supabase.from('resources').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', resource.id);
        if (error) {
          toast({ title: "Erreur", description: `Échec de la mise à jour: ${error.message}`, variant: "destructive" });
        } else {
          toast({ title: "Succès", description: "Ressource mise à jour.", className: "bg-green-500 text-white" });
          onUpdateSuccess();
        }
      };
    
      const handleAssignmentChange = async (newUserIds) => {
        const currentAssignments = resource.assigned_user_ids || [];
        const toAdd = newUserIds.filter(id => !currentAssignments.includes(id));
        const toRemove = currentAssignments.filter(id => !newUserIds.includes(id));

        if(toAdd.length > 0) {
          const { error: addError } = await supabase.from('resource_assignments').insert(toAdd.map(uid => ({ resource_id: resource.id, user_id: uid, assigned_by: user.id })));
          if(addError) toast({ title: "Erreur d'assignation", description: addError.message, variant: "destructive"});
        }
        if(toRemove.length > 0) {
          const { error: removeError } = await supabase.from('resource_assignments').delete().eq('resource_id', resource.id).in('user_id', toRemove);
          if(removeError) toast({ title: "Erreur de désassignation", description: removeError.message, variant: "destructive"});
        }
        if (!toAdd.length && !toRemove.length) return;
        toast({ title: "Succès", description: "Assignations mises à jour.", className: "bg-green-500 text-white" });
        onUpdateSuccess();
      };
    
      const handleDelete = async () => {
        if (resource.file_path) {
          const { error: storageError } = await supabase.storage.from('resources').remove([resource.file_path]);
          if (storageError) {
             toast({ title: "Erreur de suppression de fichier", description: storageError.message, variant: "destructive" });
             // On ne bloque pas la suppression de la DB si le fichier n'existe plus
          }
        }
        const { error } = await supabase.from('resources').delete().eq('id', resource.id);
        if (error) {
          toast({ title: "Erreur", description: `Impossible de supprimer la ressource: ${error.message}`, variant: "destructive" });
        } else {
          toast({ title: "Succès", description: "Ressource supprimée.", className: "bg-green-500 text-white" });
          onUpdateSuccess();
        }
      };

      const handleDuplicate = async () => {
        const { id, created_at, updated_at, family, subfamily, assignments, ...original } = resource;
        const newResource = {
          ...original,
          name: `${original.name} (Copie)`,
          created_by: user.id,
        };
        const { error } = await supabase.from('resources').insert(newResource);
        if (error) {
          toast({ title: "Erreur de duplication", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Succès", description: "Ressource dupliquée.", className: "bg-green-500 text-white" });
          onUpdateSuccess();
        }
      }
    
      const getFileIcon = (format) => {
        switch (format) {
          case 'pdf': return <FileType className="w-4 h-4 text-red-500" />;
          case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
          case 'internal_note': return <StickyNote className="w-4 h-4 text-yellow-500" />;
          default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
      };

      const userOptions = React.useMemo(() => users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })), [users]);
      const familyOptions = React.useMemo(() => families.map(f => ({ value: f.id, label: f.name })), [families]);
      const typeOptions = React.useMemo(() => ['Document', 'Guide', 'Note', 'Vidéo'].map(t => ({value: t, label: t})), []);
      const currentSubfamilyOptions = React.useMemo(() => subfamilies.filter(sf => sf.family_id === resource.family_id).map(sf => ({ value: sf.id, label: sf.name })), [subfamilies, resource.family_id]);
    
      return (
        <TableRow data-state={isSelected ? "selected" : ""}>
          <TableCell><Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectRow(resource.id, checked)} /></TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {getFileIcon(resource.format)}
              <span className="truncate">{resource.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <Select value={resource.type || ''} onValueChange={(value) => handleUpdateResource({ type: value })}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{typeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <MultiSelect options={userOptions} selected={resource.assigned_user_ids} onChange={handleAssignmentChange} />
          </TableCell>
          <TableCell>
            <Select value={resource.family_id || ''} onValueChange={(value) => handleUpdateResource({ family_id: value, subfamily_id: null })}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{familyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Select value={resource.subfamily_id || ''} disabled={!resource.family_id} onValueChange={(value) => handleUpdateResource({ subfamily_id: value })}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{currentSubfamilyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
          </TableCell>
          <TableCell>{new Date(resource.created_at).toLocaleDateString('fr-FR')}</TableCell>
          <TableCell className="text-right">
             <div className="flex justify-end items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(resource)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate}><Copy className="w-4 h-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible. La ressource "{resource.name}" et son fichier associé (si applicable) seront définitivement supprimés.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
             </div>
          </TableCell>
        </TableRow>
      );
    };
    
    export default ResourcesTableRow;
import React, { useState, useEffect, useCallback } from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
    } from "@/components/ui/dialog";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Textarea } from "@/components/ui/textarea";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { useToast } from "@/components/ui/use-toast";
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Loader2 } from 'lucide-react';
    import { v4 as uuidv4 } from 'uuid';
    import { cn } from '@/lib/utils';
    import { ScrollArea } from '@/components/ui/scroll-area';

    const NewResourceDialog = ({ isOpen, onOpenChange, onSuccess, existingResource, relatedData, initialData }) => {
      const { user } = useAuth();
      const { toast } = useToast();
      const [name, setName] = useState('');
      const [type, setType] = useState('');
      const [format, setFormat] = useState('pdf');
      const [url, setUrl] = useState('');
      const [content, setContent] = useState('');
      const [file, setFile] = useState(null);
      const [selectedFamily, setSelectedFamily] = useState('');
      const [selectedSubfamily, setSelectedSubfamily] = useState('');
      const [isSaving, setIsSaving] = useState(false);

      const families = relatedData?.families || [];
      const allSubfamilies = relatedData?.subfamilies || [];

      const subfamiliesForFamily = selectedFamily ? allSubfamilies.filter(sf => sf.family_id === selectedFamily) : [];
      
      const resetForm = useCallback(() => {
        setName('');
        setType('');
        setFormat('pdf');
        setUrl('');
        setContent('');
        setFile(null);
        setSelectedFamily('');
        setSelectedSubfamily('');
      }, []);

      const resourceToEdit = existingResource?.id ? existingResource : (existingResource?.resource_id ? { ...existingResource, id: existingResource.resource_id } : null);
      const isEditing = !!resourceToEdit;
      const isEnhancedEditorMode = isEditing && resourceToEdit?.format === 'internal_note';

      useEffect(() => {
        if (isOpen) {
            if (resourceToEdit) {
                setName(resourceToEdit.name || '');
                setType(resourceToEdit.type || '');
                setFormat(resourceToEdit.format || 'pdf');
                setUrl(resourceToEdit.url || '');
                setContent(resourceToEdit.content || '');
                setSelectedFamily(resourceToEdit.family_id || '');
                setSelectedSubfamily(resourceToEdit.subfamily_id || '');
            } else if (initialData) {
                resetForm();
                setContent(initialData.content || '');
                setType(initialData.type || 'Note');
                setFormat(initialData.format || 'internal_note');
            } else {
                resetForm();
            }
        }
      }, [isOpen, resourceToEdit, initialData, resetForm]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let resourceUrl = resourceToEdit?.url || null;
        let resourceFilePath = resourceToEdit?.file_path || null;
        
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            resourceFilePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('resources')
                .upload(resourceFilePath, file, { upsert: !!resourceToEdit });

            if (uploadError) {
                toast({ title: "Erreur de téléversement", description: uploadError.message, variant: "destructive" });
                setIsSaving(false);
                return;
            }

            const { data: urlData } = supabase.storage.from('resources').getPublicUrl(resourceFilePath);
            resourceUrl = urlData.publicUrl;
        }

        const resourceData = {
          name,
          type,
          format,
          url: format === 'youtube' ? url : resourceUrl,
          content: format === 'internal_note' ? content : null,
          file_path: resourceFilePath,
          family_id: selectedFamily || null,
          subfamily_id: selectedSubfamily || null,
          updated_at: new Date().toISOString(),
        };

        let error;
        if(resourceToEdit) {
            const { error: updateError } = await supabase.from('resources').update(resourceData).eq('id', resourceToEdit.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('resources').insert({...resourceData, created_by: user.id}).select();
            error = insertError;
        }


        setIsSaving(false);
        if (error) {
          toast({ title: "Erreur", description: `Impossible de ${resourceToEdit ? 'mettre à jour' : 'créer'} la ressource. ${error.message}`, variant: "destructive" });
        } else {
          toast({ title: "Succès !", description: `La ressource a été ${resourceToEdit ? 'mise à jour' : 'créée'}.`, className: "bg-green-500 text-white" });
          onOpenChange(false);
          if(onSuccess) onSuccess();
        }
      };
      
      const handleFormatChange = (value) => {
        setFormat(value);
        if (!isEditing && !initialData) {
            setUrl('');
            setContent('');
            setFile(null);
        }
      }

      const renderContent = () => {
        if (isEnhancedEditorMode) {
          return (
            <div className="flex flex-col gap-4 flex-grow min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue placeholder="Type de ressource" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Document">Document</SelectItem>
                          <SelectItem value="Guide">Guide</SelectItem>
                          <SelectItem value="Note">Note</SelectItem>
                          <SelectItem value="Vidéo">Vidéo</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-grow flex flex-col min-h-0">
                <Label htmlFor="content" className="mb-2">Contenu</Label>
                <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="flex-grow resize-none" />
              </div>
            </div>
          );
        }

        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nom</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Type de ressource" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Document">Document</SelectItem>
                      <SelectItem value="Guide">Guide</SelectItem>
                      <SelectItem value="Note">Note</SelectItem>
                      <SelectItem value="Vidéo">Vidéo</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="format" className="text-right">Format</Label>
              <Select value={format} onValueChange={handleFormatChange} disabled={isEditing && (format !== 'internal_note')}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Format" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="youtube">Vidéo Youtube</SelectItem>
                      <SelectItem value="internal_note">Note Interne</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {format === 'pdf' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">Fichier</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files[0])} className="col-span-3" accept=".pdf" />
              </div>
            )}

            {format === 'youtube' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">URL Youtube</Label>
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            )}

            {format === 'internal_note' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="content" className="text-right">Contenu</Label>
                <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="col-span-3" rows={8} />
              </div>
            )}
            
            {relatedData && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="family" className="text-right">Famille</Label>
                  <Select value={selectedFamily} onValueChange={(val) => {setSelectedFamily(val); setSelectedSubfamily('');}}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Associer à une famille (optionnel)" /></SelectTrigger>
                      <SelectContent>
                          {families.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subfamily" className="text-right">Sous-Famille</Label>
                  <Select value={selectedSubfamily} onValueChange={setSelectedSubfamily} disabled={!selectedFamily}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Associer à une sous-famille (optionnel)" /></SelectTrigger>
                      <SelectContent>
                          {subfamiliesForFamily.map(sf => <SelectItem key={sf.id} value={sf.id}>{sf.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        );
      };

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className={cn(
            "sm:max-w-[525px]",
            isEnhancedEditorMode && "sm:max-w-3xl h-auto max-h-[80vh] flex flex-col"
          )}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Modifier la ressource' : 'Nouvelle Ressource'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Mettez à jour les détails de cette ressource.' : 'Ajoutez une nouvelle ressource à votre bibliothèque.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className={cn("py-4", isEnhancedEditorMode && "flex-grow flex flex-col min-h-0")}>
              <ScrollArea className={cn(isEnhancedEditorMode && "flex-grow pr-6 -mr-6")}>
                <div className={cn(isEnhancedEditorMode && "flex flex-col gap-4 h-full")}>
                  {renderContent()}
                </div>
              </ScrollArea>
              <DialogFooter className={cn(isEnhancedEditorMode && "pt-4")}>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? 'Enregistrer les modifications' : 'Créer la ressource'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    };

    export default NewResourceDialog;
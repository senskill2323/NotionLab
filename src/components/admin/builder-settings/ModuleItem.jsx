import React, { useState } from 'react';
    import { useSortable } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { Card, CardContent } from '@/components/ui/card';
    import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
    import { Input } from '@/components/ui/input';
    import { Textarea } from '@/components/ui/textarea';
    import { Button } from '@/components/ui/button';
    import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';

    const ModuleItem = ({ module, hasPermission }) => {
      const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `module-${module.id}`, disabled: !hasPermission });
      const { updateModule, deleteModule } = useBuilderCatalog();
      const [isEditing, setIsEditing] = useState(false);
      const [editedModule, setEditedModule] = useState({ ...module });

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      };

      const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedModule(prev => ({ ...prev, [name]: value }));
      };
      
      const handleDurationChange = (e) => {
        setEditedModule(prev => ({ ...prev, duration: parseInt(e.target.value, 10) || 0 }));
      };

      const handleSave = () => {
        updateModule(editedModule.id, editedModule);
        setIsEditing(false);
      };

      const handleCancel = () => {
        setEditedModule({ ...module });
        setIsEditing(false);
      };
      
      const handleDelete = () => {
        deleteModule(module.id);
      }

      if (isEditing && hasPermission) {
        return (
          <div ref={setNodeRef} style={style}>
            <Card className="p-3 bg-secondary/50">
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center gap-2">
                   <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical /></div>
                  <Input name="title" value={editedModule.title} onChange={handleInputChange} className="font-semibold" />
                </div>
                <Textarea name="description" value={editedModule.description || ''} onChange={handleInputChange} placeholder="Description du module" rows={2} />
                <div className="flex items-center gap-2">
                  <Input type="number" name="duration" value={editedModule.duration} onChange={handleDurationChange} className="w-24" />
                  <span>minutes</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="icon" variant="ghost" onClick={handleCancel}><X className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={handleSave}><Check className="h-4 w-4 text-green-500" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      return (
        <div ref={setNodeRef} style={style}>
          <Card className="p-3 bg-secondary/50">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {hasPermission && <div {...attributes} {...listeners} className="cursor-grab p-1 pt-0"><GripVertical /></div>}
                  <div>
                    <p className="font-semibold">{module.title}</p>
                    <p className="text-xs text-muted-foreground">{module.description || 'Pas de description'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Durée: {module.duration} minutes</p>
                  </div>
                </div>
                {hasPermission && (
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={handleDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    };

    export default ModuleItem;
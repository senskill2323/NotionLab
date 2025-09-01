import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';

const EditModuleDialog = ({ open, onOpenChange, onSave, initialData }) => {
  const [moduleData, setModuleData] = useState({
    title: '',
    description: '',
    duration: 0,
  });

  useEffect(() => {
    if (initialData) {
      setModuleData({
        title: initialData.title || '',
        description: initialData.description || '',
        duration: initialData.duration || 0,
      });
    } else {
        setModuleData({ title: '', description: '', duration: 0 });
    }
  }, [initialData, open]);

  const handleSave = () => {
    if (moduleData.title.trim() && moduleData.duration >= 0) {
      onSave(moduleData);
    }
  };
  
  const handleChange = (e) => {
      const { name, value } = e.target;
      setModuleData(prev => ({ ...prev, [name]: value }));
  };

  const isEditing = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le module' : 'Ajouter un module'}</DialogTitle>
          <DialogDescription>
            Détaillez les informations de ce module pédagogique.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Titre
            </Label>
            <Input
              id="title"
              name="title"
              value={moduleData.title}
              onChange={handleChange}
              className="col-span-3"
              autoFocus
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={moduleData.description}
              onChange={handleChange}
              className="col-span-3"
              rows={3}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Durée (min)
            </Label>
            <Input
              id="duration"
              name="duration"
              type="number"
              value={moduleData.duration}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditModuleDialog;
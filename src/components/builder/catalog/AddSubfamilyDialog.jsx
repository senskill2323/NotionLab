import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export const AddSubfamilyDialog = ({ families, onSave, open, onOpenChange }) => {
    const [name, setName] = useState('');
    const [familyId, setFamilyId] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        if (!name.trim() || !familyId) {
            toast({ title: "Erreur", description: "Veuillez sélectionner une famille et donner un nom.", variant: "destructive" });
            return;
        }
        const family = families.find(f => f.id === familyId);
        onSave({ name, family_id: familyId, display_order: family?.subfamilies?.length || 0 });
        setName('');
        setFamilyId('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter une sous-famille</DialogTitle>
                    <DialogDescription>
                        Choisissez une famille parente et nommez votre nouvelle sous-famille.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="family" className="text-right">Famille</Label>
                        <Select onValueChange={setFamilyId} value={familyId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Sélectionnez une famille" />
                            </SelectTrigger>
                            <SelectContent>
                                {families.map(family => (
                                    <SelectItem key={family.id} value={family.id}>{family.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nom</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit}>Enregistrer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
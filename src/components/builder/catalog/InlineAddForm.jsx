import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const InlineAddForm = ({ placeholder, onSave, onCancel, initialData = {}, fullForm = false }) => {
    const [name, setName] = useState(initialData.name || '');
    const [description, setDescription] = useState(initialData.description || '');
    const [duration, setDuration] = useState(initialData.duration || 1);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSave({ name, description, duration });
        setName('');
        setDescription('');
        setDuration(1);
    };

    const handleCancel = () => {
        onCancel();
        setName('');
        setDescription('');
        setDuration(1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div className="space-y-2 p-2 bg-muted/50 rounded-md border border-primary/50">
            <div className="flex items-center gap-2">
                 <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-grow h-8 text-sm"
                    autoFocus
                />
                 {fullForm && (
                     <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value, 10) || 1)}
                        placeholder="Durée"
                        className="w-24 h-8 text-sm"
                        min="1"
                        onKeyDown={handleKeyDown}
                        title="Durée en sessions de 45min"
                    />
                 )}
            </div>
           
            {fullForm && (
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (facultatif)"
                    className="h-auto min-h-[40px] max-h-[100px] text-sm"
                    rows={2}
                    onKeyDown={handleKeyDown}
                />
            )}
            <div className="flex justify-end gap-2">
                 <Button size="icon" variant="ghost" onClick={handleCancel} className="h-7 w-7">
                    <X className="h-4 w-4 text-destructive" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleSubmit} className="h-7 w-7">
                    <Check className="h-4 w-4 text-green-500" />
                </Button>
            </div>
        </div>
    );
};
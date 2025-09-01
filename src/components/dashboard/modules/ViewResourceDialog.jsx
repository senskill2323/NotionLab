import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const ViewResourceDialog = ({ isOpen, onOpenChange, resource }) => {
  if (!resource) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{resource.name}</DialogTitle>
          <DialogDescription>
            {resource.type} - {new Date(resource.created_at).toLocaleDateString('fr-FR')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4 pr-6">
            <div 
                className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: resource.content || "Aucun contenu." }}
            />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ViewResourceDialog;
import React, { useState, useEffect, useRef } from 'react';
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
import { Bold, Italic, Underline, List, ListOrdered, Type } from 'lucide-react';

const EditModuleDialog = ({ open, onOpenChange, onSave, initialData }) => {
  const [moduleData, setModuleData] = useState({
    title: '',
    description: '',
    duration: 0,
  });
  const textareaRef = useRef(null);

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

  // Fonctions de formatage de texte
  const applyFormatting = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = moduleData.description.slice(start, end);
    const beforeText = moduleData.description.slice(0, start);
    const afterText = moduleData.description.slice(end);

    let newText = '';
    let newCursorPos = start;

    switch (type) {
      case 'bold':
        newText = `**${selectedText}**`;
        newCursorPos = selectedText ? start + newText.length : start + 2;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        newCursorPos = selectedText ? start + newText.length : start + 1;
        break;
      case 'underline':
        newText = `__${selectedText}__`;
        newCursorPos = selectedText ? start + newText.length : start + 2;
        break;
      case 'bullet':
        const lines = selectedText || 'Nouvel élément';
        newText = lines.split('\n').map(line => line.trim() ? `• ${line.replace(/^[•\-\*]\s*/, '')}` : '• ').join('\n');
        newCursorPos = start + newText.length;
        break;
      case 'numbered':
        const numberedLines = selectedText || 'Nouvel élément';
        newText = numberedLines.split('\n').map((line, index) => 
          line.trim() ? `${index + 1}. ${line.replace(/^\d+\.\s*/, '')}` : `${index + 1}. `
        ).join('\n');
        newCursorPos = start + newText.length;
        break;
      default:
        return;
    }

    const updatedDescription = beforeText + newText + afterText;
    setModuleData(prev => ({ ...prev, description: updatedDescription }));

    // Restaurer la position du curseur
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const isEditing = !!initialData;

  // Convert rich-text lists pasted from other apps (e.g., Google Docs, Notion) into
  // plain text bullet points compatible with our textarea.
  const handlePasteDescription = (e) => {
    try {
      const html = e.clipboardData?.getData('text/html') || '';
      const plain = e.clipboardData?.getData('text/plain') || '';
      if (!html && !plain) return; // nothing special

      // We'll always handle paste ourselves to normalize bullets
      e.preventDefault();

      let pastedText = '';

      if (html) {
        // Basic HTML parsing
        const container = document.createElement('div');
        container.innerHTML = html;
        const liNodes = Array.from(container.querySelectorAll('li'));

        if (liNodes.length > 0) {
          // Real HTML list -> bullet lines
          pastedText = liNodes
            .map((li) => li.textContent.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .map((t) => `• ${t}`)
            .join('\n');
        } else {
          // No <li> found. Convert paragraphs and <br> into lines.
          let html2 = html
            .replace(/<br\s*\/?>(?=\s*<)/gi, '\n') // br before another tag
            .replace(/<br\s*\/?>(?!\n)/gi, '\n')
            .replace(/<\/(p|div|h[1-6])>/gi, '\n')
            .replace(/<(p|div|h[1-6])[^>]*>/gi, '');

          const tmp = document.createElement('div');
          tmp.innerHTML = html2;
          const textWithBreaks = (tmp.textContent || '').replace(/\r\n|\r/g, '\n');
          const rawLines = textWithBreaks.split(/\n+/).map(l => l.trim()).filter(Boolean);

          const bulletRegex = /^\s*(?:[•\-\*\u2022\u25AA\u25CF\u25E6\u2219]|[0-9]+[\.)]|[a-zA-Z][\.)]|[–—\-])\s+/;
          pastedText = rawLines.map(l => {
            if (bulletRegex.test(l)) {
              return `• ${l.replace(bulletRegex, '')}`.trim();
            }
            return l; // keep non-bullet lines as-is
          }).join('\n');
        }
      } else if (plain) {
        // Plain text: preserve lines and normalize bullets
        const lines = plain.replace(/\r\n|\r/g, '\n').split(/\n+/).map(l => l.trim()).filter(Boolean);
        const bulletRegex = /^\s*(?:[•\-\*\u2022\u25AA\u25CF\u25E6\u2219]|[0-9]+[\.)]|[a-zA-Z][\.)]|[–—\-])\s+/;
        pastedText = lines.map(l => bulletRegex.test(l) ? `• ${l.replace(bulletRegex, '')}`.trim() : l).join('\n');
      }

      const textarea = e.target;
      const start = textarea.selectionStart ?? moduleData.description.length;
      const end = textarea.selectionEnd ?? start;

      setModuleData((prev) => {
        const before = prev.description.slice(0, start);
        const after = prev.description.slice(end);
        return { ...prev, description: `${before}${pastedText}${after}` };
      });
    } catch (err) {
      // If anything goes wrong, let the default paste happen
      console.debug('[EditModuleDialog] Paste handling failed, using default paste', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[940px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le module' : 'Ajouter un module'}</DialogTitle>
          <DialogDescription>
            Détaillez les informations de ce module pédagogique.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4" onClick={(e) => e.stopPropagation()}>
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
           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <div className="col-span-3">
              {/* Barre d'outils de formatage */}
              <div className="flex items-center gap-1 p-2 border border-border rounded-t-md bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => applyFormatting('bold')}
                  title="Gras (**texte**)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => applyFormatting('italic')}
                  title="Italique (*texte*)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => applyFormatting('underline')}
                  title="Souligné (__texte__)"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => applyFormatting('bullet')}
                  title="Liste à puces"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => applyFormatting('numbered')}
                  title="Liste numérotée"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                id="description"
                name="description"
                value={moduleData.description}
                onChange={handleChange}
                onPaste={handlePasteDescription}
                className="min-h-[188px] resize-y rounded-t-none border-t-0"
                rows={10}
                placeholder="Décrivez le module...&#10;&#10;Vous pouvez utiliser:&#10;• Point 1&#10;• Point 2&#10;• Point 3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supporte le formatage Markdown : **gras**, *italique*, __souligné__, • puces, 1. numérotées
              </p>
            </div>
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
import React, { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  Strikethrough,
  Undo,
  Redo,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Palette,
  List,
  ListOrdered,
  Quote,
  Code,
  Pilcrow as PilcrowLeft,
  Pilcrow as PilcrowRight,
  CaseSensitive,
  Youtube as YoutubeIcon,
  Upload,
  Diamond,
  Maximize,
  Code2,
  Loader2,
} from 'lucide-react';
import {
  EnhancedLink,
  CTA_VARIANT_OPTIONS,
  sanitizeVariantKey,
} from '@/components/admin/extensions/enhancedLink';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMAIL_TEMPLATE_VARIABLES } from '@/components/admin/constants/emailTemplateVariables';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { uploadEmailImage } from '@/lib/customSupabaseClient';

const CTA_DEFAULT_VARIANT = 'primary';
const CTA_DEFAULT_LABEL = 'Ouvrir le lien';

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value = '') => value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);

const sanitizeHrefInput = (value = '') => value.trim();

const MenuBar = ({ editor, toggleFullscreen, toggleHtmlMode, isHtmlMode }) => {
  const { toast } = useToast();
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [ctaVariant, setCtaVariant] = useState(CTA_DEFAULT_VARIANT);
  const [ctaError, setCtaError] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageTab, setImageTab] = useState('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const imageFileInputRef = useRef(null);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState(null);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const resetImageState = useCallback(() => {
    setImageTab('url');
    setImageUrl('');
    setImageFile(null);
    setImageUploading(false);
    setImageError(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  }, []);

  const handleOpenImageDialog = useCallback(() => {
    if (!editor) return;
    resetImageState();
    setImageDialogOpen(true);
  }, [editor, resetImageState]);

  const handleImageDialogOpenChange = useCallback(
    (open) => {
      setImageDialogOpen(open);
      if (!open) {
        resetImageState();
      }
    },
    [resetImageState],
  );

  const handleInsertImageFromUrl = useCallback(() => {
    if (!editor) return;
    if (!imageUrl.trim()) {
      setImageError("L'URL est obligatoire.");
      return;
    }
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    handleImageDialogOpenChange(false);
  }, [editor, handleImageDialogOpenChange, imageUrl]);

  const handleImageFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    setImageFile(file ?? null);
    setImageError(null);
  }, []);

  const handleUploadImage = useCallback(async () => {
    if (!editor) return;
    if (!imageFile) {
      setImageError('Selectionnez un fichier image.');
      return;
    }

    setImageUploading(true);
    setImageError(null);
    try {
      const { publicUrl } = await uploadEmailImage(imageFile);
      editor.chain().focus().setImage({ src: publicUrl }).run();
      toast({
        title: 'Image ajoutee',
        description: 'Le fichier a ete televerse avec succes.',
      });
      handleImageDialogOpenChange(false);
    } catch (error) {
      console.error('[tiptap] image upload failed', error);
      const message = error?.message ?? "Echec du televersement de l'image.";
      setImageError(message);
      toast({
        title: 'Televersement impossible',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setImageUploading(false);
    }
  }, [editor, imageFile, toast, handleImageDialogOpenChange]);

  const resetYoutubeState = useCallback(() => {
    setYoutubeUrl('');
    setYoutubeError(null);
  }, []);

  const handleYoutubeDialogOpenChange = useCallback(
    (open) => {
      setYoutubeDialogOpen(open);
      if (!open) {
        resetYoutubeState();
      }
    },
    [resetYoutubeState],
  );

  const handleOpenYoutubeDialog = useCallback(() => {
    if (!editor) return;
    resetYoutubeState();
    setYoutubeDialogOpen(true);
  }, [editor, resetYoutubeState]);

  const handleInsertYoutubeVideo = useCallback(() => {
    if (!editor) return;
    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) {
      setYoutubeError("L'URL YouTube est obligatoire.");
      return;
    }

    editor.chain().focus().setYoutubeVideo({ src: trimmedUrl }).run();
    toast({
      title: 'Video ajoutee',
      description: 'La video YouTube a ete inseree.',
    });
    handleYoutubeDialogOpenChange(false);
  }, [editor, youtubeUrl, toast, handleYoutubeDialogOpenChange]);

  const handleInsertVariable = useCallback(
    (variable) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${variable}}}`).run();
    },
    [editor],
  );

  const resetCtaForm = useCallback(() => {
    setCtaLabel('');
    setCtaHref('');
    setCtaVariant(CTA_DEFAULT_VARIANT);
    setCtaError(null);
  }, []);

  const handleOpenCtaDialog = useCallback(() => {
    if (!editor) return;

    const { selection } = editor.state;
    let selectedText = '';
    if (!selection.empty) {
      selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    } else if (editor.schema?.marks?.link) {
      const range = getMarkRange(selection.$from, editor.schema.marks.link);
      if (range) {
        selectedText = editor.state.doc.textBetween(range.from, range.to, ' ');
      }
    }

    const linkAttrs = editor.getAttributes('link') ?? {};
    setCtaLabel(selectedText || linkAttrs.title || linkAttrs['aria-label'] || '');
    setCtaHref(linkAttrs.href || '');
    setCtaVariant(sanitizeVariantKey(linkAttrs['data-cta-variant']) ?? CTA_DEFAULT_VARIANT);
    setCtaError(null);
    setCtaDialogOpen(true);
  }, [editor]);

  const handleInsertCta = useCallback(() => {
    if (!editor) return;

    setCtaError(null);
    const sanitizedHref = sanitizeHrefInput(ctaHref);
    if (!sanitizedHref) {
      setCtaError('Le lien est obligatoire.');
      return;
    }

    const variant = sanitizeVariantKey(ctaVariant) ?? CTA_DEFAULT_VARIANT;
    const label = ctaLabel.trim() ? ctaLabel.trim() : CTA_DEFAULT_LABEL;
    const html = `<a href="${escapeHtml(sanitizedHref)}" data-cta-variant="${variant}">${escapeHtml(label)}</a>`;

    const chain = editor.chain().focus();
    if (editor.isActive('link')) {
      chain.extendMarkRange('link').deleteSelection();
    } else if (!editor.state.selection.empty) {
      chain.deleteSelection();
    }

    chain.insertContent(html).run();
    resetCtaForm();
    setCtaDialogOpen(false);
  }, [ctaHref, ctaLabel, ctaVariant, editor, resetCtaForm]);

  const handleDialogOpenChange = useCallback(
    (open) => {
      setCtaDialogOpen(open);
      if (!open) {
        resetCtaForm();
      }
    },
    [resetCtaForm],
  );

  const handleAction = useCallback((action) => {
    alert(
      `?? This feature isn't implemented yet-but don't worry! You can request it in your next prompt! ??`,
    );
  }, []);

  if (!editor) {
    return null;
  }

  const currentColor = editor.getAttributes('textStyle').color || '#000000';

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border-b border-slate-200 bg-white p-2 text-slate-900 shadow-sm [&_button]:text-slate-700 [&_button]:focus-visible:ring-primary/40 [&_button]:focus-visible:ring-offset-0 [&_button:hover]:bg-slate-100 [&_[data-state='on']]:bg-slate-200 [&_[data-state='on']]:text-slate-900">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={isHtmlMode}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Annuler</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={isHtmlMode}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Retablir</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-24" disabled={isHtmlMode}>
                  Paragraphe
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-b border-slate-200 shadow-lg">
                <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                  Paragraphe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  Titre 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  Titre 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  Titre 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
                  Titre 4
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>Format de paragraphe</TooltipContent>
        </Tooltip>

        <Toggle
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={isHtmlMode}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={isHtmlMode}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          className="underline"
          disabled={isHtmlMode}
        >
          U
        </Toggle>
        <Toggle
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={isHtmlMode}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isHtmlMode}>
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40 bg-white border-b border-slate-200 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1">
                  <input
                    type="color"
                    className="h-8 w-full cursor-pointer border bg-transparent"
                    onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
                    value={currentColor}
                  />
                </div>
                <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>
                  Couleur par defaut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>Couleur du texte</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              disabled={isHtmlMode}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Surligner</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              disabled={isHtmlMode}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aligner a gauche</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              disabled={isHtmlMode}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Centrer</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              disabled={isHtmlMode}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aligner a droite</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              disabled={isHtmlMode}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Justifier</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={editor.isActive('bulletList')}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              disabled={isHtmlMode}
            >
              <List className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Liste a puces</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={editor.isActive('orderedList')}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={isHtmlMode}
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Liste numerotee</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
              disabled={isHtmlMode}
            >
              <PilcrowRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Augmenter le retrait</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().liftListItem('listItem').run()}
              disabled={isHtmlMode}
            >
              <PilcrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Diminuer le retrait</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={setLink} disabled={isHtmlMode}>
              <Link2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ajouter un lien</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isHtmlMode}>
                  <CaseSensitive className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto bg-white text-slate-900 border border-slate-200 shadow-lg">
                {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
                  <DropdownMenuItem
                    key={variable.value}
                    onSelect={() => handleInsertVariable(variable.value)}
                    className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  >
                    {variable.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>Inserer une variable</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpenCtaDialog} disabled={isHtmlMode}>
              <Diamond className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserer un bouton</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpenImageDialog} disabled={isHtmlMode}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ajouter une image</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpenYoutubeDialog} disabled={isHtmlMode}>
              <YoutubeIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserer une video YouTube</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              disabled={isHtmlMode}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserer une ligne horizontale</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              disabled={isHtmlMode}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Citation</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              disabled={isHtmlMode}
            >
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bloc de code</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleAction('upload-file')}
              disabled={isHtmlMode}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Televerser un fichier</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleAction('insert-gallery')}
              disabled={isHtmlMode}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserer une galerie</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              disabled={isHtmlMode}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inserer un tableau</TooltipContent>
        </Tooltip>
        {editor.isActive('table') && !isHtmlMode && (
          <>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()}>
              +Col Avant
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              +Col Apres
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()}>
              -Col
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()}>
              +Ligne Avant
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>
              +Ligne Apres
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteRow().run()}>
              -Ligne
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteTable().run()}>
              -Tableau
            </Button>
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle pressed={isHtmlMode} onPressedChange={toggleHtmlMode}>
              <Code2 className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Mode HTML</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Plein ecran</TooltipContent>
        </Tooltip>
      </div>

      <Dialog modal={false} open={imageDialogOpen} onOpenChange={handleImageDialogOpenChange}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Ajouter une image</DialogTitle>
            <DialogDescription>
              Inserez un visuel en collant un lien ou en televersant un fichier vers Supabase.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={imageTab} onValueChange={setImageTab} className="w-full">
            <TabsList className="grid grid-cols-2 rounded-md bg-slate-100 p-1 text-slate-600">
              <TabsTrigger
                value="url"
                className="text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                Depuis un lien
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                Televerser
              </TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-4 space-y-3 focus-visible:outline-none">
              <div className="space-y-1.5">
                <Label htmlFor="image-url">URL de l&apos;image</Label>
                <Input
                  id="image-url"
                  placeholder="https://cdn..."
                  value={imageUrl}
                  className="bg-white text-slate-900 border border-slate-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0 placeholder:text-slate-500"
                  onChange={(event) => {
                    setImageUrl(event.target.value);
                    setImageError(null);
                  }}
                />
                <p className="text-xs text-slate-500">
                  Collez un lien direct vers une image deja hebergee.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="upload" className="mt-4 space-y-3 focus-visible:outline-none">
              <div className="space-y-1.5">
                <Label htmlFor="image-file">Fichier image (5 Mo max)</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  ref={imageFileInputRef}
                  className="bg-white text-slate-900 border border-slate-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0 file:text-slate-900"
                  onChange={handleImageFileChange}
                />
                {imageFile ? (
                  <p className="text-xs text-slate-500">
                    {imageFile.name} — {(imageFile.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Formats autorises : PNG, JPG, WEBP, GIF, SVG.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {imageError && <p className="text-xs text-destructive">{imageError}</p>}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImageDialogOpenChange(false)}
              disabled={imageUploading}
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
            >
              Annuler
            </Button>
            <Button
              onClick={imageTab === 'upload' ? handleUploadImage : handleInsertImageFromUrl}
              disabled={imageUploading}
              className="border border-slate-300 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {imageUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {imageTab === 'upload' ? 'Televerser et inserer' : 'Inserer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={youtubeDialogOpen} onOpenChange={handleYoutubeDialogOpenChange}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Inserer une video YouTube</DialogTitle>
            <DialogDescription>
              Collez un lien YouTube valide pour integrer automatiquement le lecteur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="youtube-url">URL YouTube</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(event) => {
                  setYoutubeUrl(event.target.value);
                  setYoutubeError(null);
                }}
                className="bg-white text-slate-900 border border-slate-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0 placeholder:text-slate-500"
              />
            </div>
            {youtubeError && <p className="text-xs text-destructive">{youtubeError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleYoutubeDialogOpenChange(false)}
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
            >
              Annuler
            </Button>
            <Button onClick={handleInsertYoutubeVideo}>Inserer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ctaDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Inserer un bouton</DialogTitle>
            <DialogDescription>
              Transforme la selection actuelle en bouton stylise compatible e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="cta-label">Texte du bouton</Label>
              <Input
                id="cta-label"
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                placeholder="Ex : Confirmer mon inscription"
                className="bg-white text-slate-900 border border-slate-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cta-href">Lien</Label>
              <Input
                id="cta-href"
                value={ctaHref}
                onChange={(event) => setCtaHref(event.target.value)}
                placeholder="https://notionlab.ch"
                className="bg-white text-slate-900 border border-slate-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <Label>Style du bouton</Label>
              <Select value={ctaVariant} onValueChange={setCtaVariant}>
                <SelectTrigger className="bg-white text-slate-900 border border-slate-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0">
                  <SelectValue placeholder="Choisir un style" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border border-slate-200">
                  {CTA_VARIANT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ctaError && <p className="text-xs text-destructive">{ctaError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
            >
              Annuler
            </Button>
            <Button onClick={handleInsertCta}>Inserer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const TiptapEditor = ({ content, onChange, placeholder }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Underline,
      EnhancedLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      HorizontalRule,
      Youtube.configure({ nocookie: true }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor: updatedEditor }) => {
      if (!isHtmlMode) {
        onChange(updatedEditor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none text-slate-900 focus:outline-none min-h-[360px] px-5 py-4 bg-white',
      },
    },
  });

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((value) => !value);
  }, []);

  const toggleHtmlMode = useCallback(() => {
    setIsHtmlMode((value) => !value);
  }, []);

  const handleHtmlChange = useCallback(
    (event) => {
      if (editor) {
        editor.commands.setContent(event.target.value);
        onChange(event.target.value);
      }
    },
    [editor, onChange],
  );

  const editorWrapperClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-white'
    : 'flex min-h-[520px] flex-col rounded-md border border-slate-300 bg-white shadow-sm';

  return (
    <div className={editorWrapperClass}>
      <MenuBar
        editor={editor}
        toggleFullscreen={toggleFullscreen}
        toggleHtmlMode={toggleHtmlMode}
        isHtmlMode={isHtmlMode}
      />
      <div className="flex-grow overflow-y-auto bg-white">
        {isHtmlMode ? (
          <Textarea
            className="h-full w-full resize-none rounded-none border border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
            value={editor?.getHTML() ?? ''}
            onChange={handleHtmlChange}
          />
        ) : (
          <EditorContent editor={editor} className="min-h-[360px] px-5 py-4 bg-white text-slate-900" />
        )}
      </div>
      {editor && (
        <div className="border-t p-2 text-right text-xs text-muted-foreground">
          {editor.storage.characterCount.characters()} caracteres / {editor.storage.characterCount.words()} mots
        </div>
      )}
    </div>
  );
};

export default TiptapEditor;

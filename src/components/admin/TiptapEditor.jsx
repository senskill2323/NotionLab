import React, { useCallback, useState } from 'react';
    import { useEditor, EditorContent } from '@tiptap/react';
    import StarterKit from '@tiptap/starter-kit';
    import Underline from '@tiptap/extension-underline';
    import Link from '@tiptap/extension-link';
    import Image from '@tiptap/extension-image';
    import Placeholder from '@tiptap/extension-placeholder';
    import Table from '@tiptap/extension-table';
    import TableRow from '@tiptap/extension-table-row';
    import TableCell from '@tiptap/extension-table-cell';
    import TableHeader from '@tiptap/extension-table-header';
    import TextAlign from '@tiptap/extension-text-align';
    import TextStyle from '@tiptap/extension-text-style';
    import { Color } from '@tiptap/extension-color';
    import FontFamily from '@tiptap/extension-font-family';
    import Highlight from '@tiptap/extension-highlight';
    import HorizontalRule from '@tiptap/extension-horizontal-rule';
    import Youtube from '@tiptap/extension-youtube';
    import CharacterCount from '@tiptap/extension-character-count';

    import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Undo, Redo, Link2, Image as ImageIcon, Table as TableIcon, Heading1, Heading2, Heading3, Heading4, AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus, Palette, Pilcrow, Type, Youtube as YoutubeIcon, Upload, Diamond, CaseSensitive, Pilcrow as PilcrowLeft, Pilcrow as PilcrowRight, Maximize, Code2 } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Toggle } from '@/components/ui/toggle';
    import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
    import { Textarea } from '@/components/ui/textarea';

    const MenuBar = ({ editor, toggleFullscreen, toggleHtmlMode, isHtmlMode }) => {
      const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }, [editor]);

      const addImage = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('URL de l\'image');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }, [editor]);
      
      const addYoutubeVideo = () => {
        const url = prompt('Enter YouTube URL');
        if (url) editor.commands.setYoutubeVideo({ src: url });
      };
      
      const handleAction = (action) => {
        alert(`🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀`);
      };

      if (!editor) return null;

      return (
        <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-background rounded-t-md">
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={isHtmlMode}><Undo className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Annuler</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={isHtmlMode}><Redo className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Rétablir</TooltipContent></Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" className="w-24" disabled={isHtmlMode}>Paragraphe</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>Paragraphe</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>Titre 1</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Titre 2</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>Titre 3</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>Titre 4</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>Format de paragraphe</TooltipContent>
          </Tooltip>

          <Toggle pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} disabled={isHtmlMode}><Bold className="h-4 w-4" /></Toggle>
          <Toggle pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} disabled={isHtmlMode}><Italic className="h-4 w-4" /></Toggle>
          <Toggle pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} className="underline" disabled={isHtmlMode}>U</Toggle>
          <Toggle pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} disabled={isHtmlMode}><Strikethrough className="h-4 w-4" /></Toggle>
          
          <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isHtmlMode}><Palette className="h-4 w-4" /></Button></DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Couleurs</TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              <input type="color" className="w-full p-1" onInput={(e) => editor.chain().focus().setColor(e.target.value).run()} value={editor.getAttributes('textStyle').color || '#000000'}/>
              <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>Défaut</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHighlight().run()} disabled={isHtmlMode}><Palette className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Surligner</TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} disabled={isHtmlMode}><AlignLeft className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Aligner à gauche</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} disabled={isHtmlMode}><AlignCenter className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Centrer</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} disabled={isHtmlMode}><AlignRight className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Aligner à droite</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('justify').run()} disabled={isHtmlMode}><AlignJustify className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Justifier</TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild><Toggle pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} disabled={isHtmlMode}><List className="h-4 w-4" /></Toggle></TooltipTrigger><TooltipContent>Liste à puces</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Toggle pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} disabled={isHtmlMode}><ListOrdered className="h-4 w-4" /></Toggle></TooltipTrigger><TooltipContent>Liste numérotée</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={isHtmlMode}><PilcrowRight className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Augmenter le retrait</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={isHtmlMode}><PilcrowLeft className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Diminuer le retrait</TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={setLink} disabled={isHtmlMode}><Link2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Ajouter un lien</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={addImage} disabled={isHtmlMode}><ImageIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Ajouter une image</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={addYoutubeVideo} disabled={isHtmlMode}><YoutubeIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Insérer une vidéo YouTube</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={isHtmlMode}><Minus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Insérer une ligne horizontale</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={isHtmlMode}><Quote className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Citation</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleCodeBlock().run()} disabled={isHtmlMode}><Code className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bloc de code</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleAction('upload-file')} disabled={isHtmlMode}><Upload className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Téléverser un fichier</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleAction('insert-gallery')} disabled={isHtmlMode}><ImageIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Insérer une galerie</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleAction('special-characters')} disabled={isHtmlMode}><Diamond className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Caractères spéciaux</TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={isHtmlMode}><TableIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Insérer un tableau</TooltipContent></Tooltip>
          {editor.isActive('table') && !isHtmlMode && (
            <>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()}>+Col Avant</Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col Après</Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()}>-Col</Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()}>+Ligne Avant</Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>+Ligne Après</Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteRow().run()}>-Ligne</Button>
              <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteTable().run()}>-Tableau</Button>
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
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleFullscreen}><Maximize className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Plein écran</TooltipContent></Tooltip>
        </div>
      );
    };

    const TiptapEditor = ({ content, onChange, placeholder }) => {
      const [isFullscreen, setIsFullscreen] = useState(false);
      const [isHtmlMode, setIsHtmlMode] = useState(false);

      const editor = useEditor({
        extensions: [
          StarterKit.configure({
            horizontalRule: false,
          }),
          Underline,
          Link.configure({ openOnClick: false, autolink: true }),
          Image,
          Placeholder.configure({ placeholder }),
          Table.configure({ resizable: true }),
          TableRow, TableHeader, TableCell,
          TextAlign.configure({ types: ['heading', 'paragraph'] }),
          TextStyle, Color, FontFamily,
          Highlight.configure({ multicolor: true }),
          HorizontalRule,
          Youtube.configure({ nocookie: true }),
          CharacterCount,
        ],
        content: content,
        onUpdate: ({ editor }) => {
          if (!isHtmlMode) {
            onChange(editor.getHTML());
          }
        },
        editorProps: {
          attributes: {
            class: 'prose dark:prose-invert prose-sm sm:prose-base max-w-none m-5 focus:outline-none',
          },
        },
      });

      const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
      };

      const toggleHtmlMode = () => {
        setIsHtmlMode(!isHtmlMode);
      };

      const handleHtmlChange = (e) => {
        if (editor) {
          editor.commands.setContent(e.target.value);
          onChange(e.target.value);
        }
      };

      const editorWrapperClass = isFullscreen
        ? 'fixed inset-0 z-50 bg-background flex flex-col'
        : 'border rounded-md flex flex-col min-h-[520px]';

      return (
        <div className={editorWrapperClass}>
          <MenuBar editor={editor} toggleFullscreen={toggleFullscreen} toggleHtmlMode={toggleHtmlMode} isHtmlMode={isHtmlMode} />
          <div className="flex-grow overflow-y-auto">
            {isHtmlMode ? (
              <Textarea
                className="w-full h-full p-4 font-mono text-sm bg-background text-foreground border-0 rounded-none resize-none focus:ring-0"
                value={editor?.getHTML()}
                onChange={handleHtmlChange}
              />
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
          {editor && (
            <div className="text-xs text-muted-foreground p-2 border-t text-right">
              {editor.storage.characterCount.characters()} caractères / {editor.storage.characterCount.words()} mots
            </div>
          )}
        </div>
      );
    };

    export default TiptapEditor;

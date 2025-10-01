import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Send,
  Smile,
  Plus,
  Youtube,
  FileText,
  BookOpen,
  Loader2,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { listShareableResources } from '@/lib/chatApi';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const RESOURCE_SEARCH_LIMIT = 200;

const AddResourceDialog = ({ open, onOpenChange, onSelectResource }) => {
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const fetchResources = async () => {
      setLoading(true);
      try {
        const data = await listShareableResources({ limit: RESOURCE_SEARCH_LIMIT });
        if (!isMounted) return;
        setResources(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching resources', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchResources();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const filteredResources = resources.filter((resource) =>
    resource.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Ajouter une ressource</DialogTitle>
          <DialogDescription>
            Selectionnez une ressource a partager dans la conversation.
          </DialogDescription>
        </DialogHeader>

        <Command className="rounded-lg border shadow-sm">
          <CommandInput
            placeholder="Rechercher une ressource..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>{loading ? 'Chargement...' : 'Aucune ressource trouvee.'}</CommandEmpty>
          <CommandGroup heading="Ressources disponibles" className="max-h-60 overflow-y-auto">
            {filteredResources.map((resource) => (
              <CommandItem
                key={resource.id}
                onSelect={() => {
                  onSelectResource?.(resource);
                  onOpenChange(false);
                  setSearch('');
                }}
              >
                {resource.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PLACEHOLDER_BY_VARIANT = {
  client: 'Ecris ton message... (Entrer pour envoyer)',
  admin: 'Repondre a la conversation... (Entrer pour envoyer)',
};

const ChatInput = ({
  onSendMessage,
  onFileSelect,
  onSelectResource,
  onClearChat,
  isAdmin,
  variant = 'client',
  className,
}) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const placeholder = PLACEHOLDER_BY_VARIANT[variant] || PLACEHOLDER_BY_VARIANT.client;
  const canShareResources = Boolean(isAdmin);
  const showClearAction = typeof onClearChat === 'function';

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    onSendMessage?.(message.trim());
    setMessage('');
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onFileSelect?.(file);
    } catch (error) {
      toast({ title: 'Erreur', description: error?.message || "Impossible d'envoyer le fichier.", variant: 'destructive' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleYoutubeLink = () => {
    const url = window.prompt('Colle le lien de la video YouTube :');
    if (url) {
      onSendMessage?.(url.trim());
    }
  };

  const handleConfirmClear = () => {
    onClearChat?.();
    setShowClearConfirm(false);
    toast({ title: 'Chat vide', description: 'La conversation a ete effacee.' });
  };

  return (
    <>
      <div
        className={cn(
          'border-t bg-card px-4 pb-4 pt-3 space-y-3',
          variant === 'admin' ? 'shadow-sm' : '',
          className,
        )}
      >
        <div className="border rounded-xl bg-background">
          <div className="flex items-center justify-between px-3 py-2 border-b text-sm text-muted-foreground">
            <span>Composer un message</span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </Button>
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" side="top" align="end">
                  <EmojiPicker onEmojiClick={(emoji) => setMessage((prev) => prev + emoji.emoji)} theme="dark" width={320} height={380} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" side="top" align="start">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" className="justify-start gap-2" onClick={handleYoutubeLink}>
                      <Youtube className="h-4 w-4" /> Lien YouTube
                    </Button>
                    <Button variant="ghost" className="justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                      <FileText className="h-4 w-4" /> Document
                    </Button>
                    {canShareResources && (
                      <Button variant="ghost" className="justify-start gap-2" onClick={() => setShowResourceDialog(true)}>
                        <BookOpen className="h-4 w-4" /> Ressource
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={placeholder}
              rows={variant === 'admin' ? 4 : 3}
              className="min-h-[96px] resize-none border-0 bg-transparent px-3 py-3 pr-28 focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (message.trim()) {
                    onSendMessage?.(message.trim());
                    setMessage('');
                  }
                }
              }}
              disabled={uploading}
            />
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <Button type="submit" variant="ghost" size="icon" disabled={!message.trim() || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
              {showClearAction && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => setShowClearConfirm(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Vider le chat
                    </DropdownMenuItem>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Action definitive
                    </DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </form>
        </div>
        {variant === 'client' && (
          <p className="text-xs leading-snug font-semibold text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md px-3 py-2">
            Rappel "Ressourcez une explication" : selectionne un passage puis utilise le menu contextuel pour l'enregistrer comme ressource.
          </p>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="application/pdf,application/zip,image/*,text/plain"
      />

      <AddResourceDialog
        open={showResourceDialog}
        onOpenChange={setShowResourceDialog}
        onSelectResource={onSelectResource}
      />

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vider la conversation ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. Tous les messages seront definitivement supprimes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmClear}>
              Oui, vider le chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatInput;

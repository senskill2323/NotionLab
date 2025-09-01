import React, { useState, useRef, useEffect } from 'react';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
    import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
    import { Send, Smile, Plus, Youtube, FileText, BookOpen, Loader2, MoreVertical, Trash2 } from 'lucide-react';
    import EmojiPicker from 'emoji-picker-react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';

    const AddResourceDialog = ({ open, onOpenChange, onSelectResource }) => {
      const [resources, setResources] = useState([]);
      const [loading, setLoading] = useState(false);
      const [search, setSearch] = useState("");

      useEffect(() => {
        if (open) {
          const fetchResources = async () => {
            setLoading(true);
            const { data, error } = await supabase
              .from('resources')
              .select('id, name, type, format')
              .order('name', { ascending: true });
            
            if (error) {
              console.error("Error fetching resources:", error);
            } else {
              setResources(data);
            }
            setLoading(false);
          };
          fetchResources();
        }
      }, [open]);
      
      const filteredResources = resources.filter(resource => 
        resource.name.toLowerCase().includes(search.toLowerCase())
      );

      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ajouter une ressource</DialogTitle>
              <DialogDescription>
                Recherchez et sélectionnez une ressource à partager dans le chat.
              </DialogDescription>
            </DialogHeader>
            <Command className="rounded-lg border shadow-md">
              <CommandInput 
                placeholder="Rechercher une ressource..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandEmpty>{loading ? "Chargement..." : "Aucune ressource trouvée."}</CommandEmpty>
              <CommandGroup heading="Ressources disponibles" className="max-h-60 overflow-y-auto">
                {filteredResources.map((resource) => (
                  <CommandItem
                    key={resource.id}
                    onSelect={() => {
                      onSelectResource(resource);
                      onOpenChange(false);
                      setSearch("");
                    }}
                  >
                    {resource.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };

    const ChatInput = ({ onSendMessage, onFileSelect, onSelectResource, onClearChat, isAdmin }) => {
      const [input, setInput] = useState('');
      const [uploading, setUploading] = useState(false);
      const [showEmojiPicker, setShowEmojiPicker] = useState(false);
      const [showResourceDialog, setShowResourceDialog] = useState(false);
      const [showClearConfirm, setShowClearConfirm] = useState(false);
      const fileInputRef = useRef(null);
      const { toast } = useToast();

      const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
      };

      const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
          await onFileSelect(file);
        } catch (error) {
          toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
          setUploading(false);
          e.target.value = null;
        }
      };

      const handleYoutubeLink = () => {
        const url = prompt("Veuillez coller le lien de la vidéo YouTube :");
        if (url) {
          onSendMessage(url);
        }
      };

      const handleConfirmClear = () => {
        onClearChat();
        setShowClearConfirm(false);
        toast({ title: "Chat vidé", description: "La conversation a été effacée."});
      };

      return (
        <>
          <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t">
            <div className="w-full px-4">
              <div className="py-3 w-full">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Poser une question..."
                    className="h-12 text-base pl-12 pr-32 rounded-lg bg-muted border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" side="top" align="start">
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" className="justify-start gap-2" onClick={handleYoutubeLink}>
                            <Youtube className="h-4 w-4" /> YouTube
                          </Button>
                          <Button variant="ghost" className="justify-start gap-2" onClick={() => fileInputRef.current.click()}>
                            <FileText className="h-4 w-4" /> Document
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" className="justify-start gap-2" onClick={() => setShowResourceDialog(true)}>
                              <BookOpen className="h-4 w-4" /> Ressource
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <Smile className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto" side="top" align="end">
                        <EmojiPicker onEmojiClick={(emojiObject) => setInput(prev => prev + emojiObject.emoji)} theme="dark" />
                      </PopoverContent>
                    </Popover>
                    <Button type="submit" variant="ghost" size="icon" disabled={!input.trim() || uploading} className="text-muted-foreground hover:text-foreground">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowClearConfirm(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Vider le chat</span>
                        </DropdownMenuItem>
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">pas conseillé !</DropdownMenuLabel>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,image/*" />
                  </div>
                </form>
              </div>
            </div>
          </footer>
          <AddResourceDialog open={showResourceDialog} onOpenChange={setShowResourceDialog} onSelectResource={onSelectResource} />
          
          <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vider la conversation ?</DialogTitle>
                <DialogDescription>
                  Cette action est irréversible. Tous les messages de cette conversation seront définitivement supprimés.
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
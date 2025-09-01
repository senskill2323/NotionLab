import React, { useState, useCallback } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2, CornerUpLeft, Send, Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react';
    import { v4 as uuidv4 } from 'uuid';

    const CreateForumTopicPage = () => {
      const { user } = useAuth();
      const navigate = useNavigate();
      const { toast } = useToast();
      const [title, setTitle] = useState('');
      const [content, setContent] = useState('');
      const [files, setFiles] = useState([]);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        const newFiles = selectedFiles.filter(file => file.size <= 2 * 1024 * 1024);
        if (newFiles.length !== selectedFiles.length) {
          toast({ title: "Fichier trop volumineux", description: "Certains fichiers dépassent la limite de 2 Mo et n'ont pas été ajoutés.", variant: "destructive" });
        }
        setFiles(prev => [...prev, ...newFiles]);
      };

      const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim() || !user) return;

        setIsSubmitting(true);

        try {
          const uploadedAttachments = [];
          for (const file of files) {
            const filePath = `${user.id}/${uuidv4()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('forum_attachments')
              .upload(filePath, file);

            if (uploadError) throw new Error(`Erreur de téléversement: ${uploadError.message}`);
            
            const { data: urlData } = supabase.storage.from('forum_attachments').getPublicUrl(filePath);
            uploadedAttachments.push({
              name: file.name,
              url: urlData.publicUrl,
              type: file.type,
              size: file.size,
            });
          }

          const { data: topicData, error: topicError } = await supabase
            .from('forum_topics')
            .insert({
              title,
              content,
              author_id: user.id,
              attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
            })
            .select()
            .single();

          if (topicError) throw topicError;

          toast({ title: "Succès", description: "Votre sujet a été créé.", className: "bg-green-500 text-white" });
          navigate(`/forum`);

        } catch (error) {
          console.error('Error creating topic:', error);
          toast({ title: "Erreur", description: error.message || "Impossible de créer le sujet.", variant: "destructive" });
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <>
          <Helmet>
            <title>Créer un nouveau sujet - Forum</title>
            <meta name="description" content="Créez un nouveau sujet de discussion sur notre forum." />
          </Helmet>
          <div className="container mx-auto px-4 py-24 sm:py-32">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Link to="/forum" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <CornerUpLeft className="w-4 h-4" />
                Retour au forum
              </Link>
              <Card className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit}>
                  <CardHeader>
                    <CardTitle>Créer un nouveau sujet</CardTitle>
                    <CardDescription>Partagez votre idée ou posez votre question à la communauté.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="title" className="font-medium">Titre</label>
                      <Input
                        id="title"
                        placeholder="Le titre de votre sujet"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="content" className="font-medium">Message</label>
                      <Textarea
                        id="content"
                        placeholder="Écrivez votre message ici..."
                        rows={10}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium">Pièces jointes (2 Mo max par fichier)</label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*,application/pdf"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Paperclip className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Glissez-déposez ou <span className="text-primary font-semibold">cliquez pour choisir</span></p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, GIF</p>
                        </label>
                      </div>
                      {files.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-primary flex-shrink-0" /> : <FileText className="w-5 h-5 text-primary flex-shrink-0" />}
                                <span className="text-sm truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} Mo)</span>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-6 w-6">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()} className="w-full sm:w-auto ml-auto">
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Publier le sujet
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </div>
        </>
      );
    };

    export default CreateForumTopicPage;
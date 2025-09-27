import React, { useState, useEffect, useCallback } from 'react';
    import { useParams, useNavigate, Link } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
    import { Loader2, Save, ArrowLeft, ChevronRight } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useDebounce } from 'use-debounce';
    import TiptapEditor from '@/components/admin/TiptapEditor';
    import { v4 as uuidv4 } from 'uuid';

    const slugify = (text) => {
      if (!text) return '';
      return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    };

    const EditStaticPage = () => {
      const { id } = useParams();
      const navigate = useNavigate();
      const { toast } = useToast();
      const isNewPage = id === undefined;

      const [page, setPage] = useState({
        title: '',
        content: '',
        seo_description: '',
        status: 'draft',
        options: {
          show_title: true,
          show_right_column: true,
          visible_offline: false,
          show_footer: true,
        },
      });
      const [loading, setLoading] = useState(!isNewPage);
      const [saving, setSaving] = useState(false);
      const [debouncedPage] = useDebounce(page, 1000);

      const fetchPage = useCallback(async () => {
        if (isNewPage) return;
        setLoading(true);
        const { data, error } = await supabase
          .from('static_pages')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          toast({ title: 'Erreur', description: 'Impossible de charger la page.', variant: 'destructive' });
          navigate('/admin/dashboard?tab=pages');
        } else {
          setPage({
            ...data,
            options: {
              show_title: true,
              show_right_column: true,
              visible_offline: false,
              show_footer: true,
              ...(data.options || {}),
            }
          });
        }
        setLoading(false);
      }, [id, isNewPage, navigate, toast]);

      useEffect(() => {
        fetchPage();
      }, [fetchPage]);

      const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPage(prev => ({ ...prev, [name]: value }));
      };

      const handleContentChange = (newContent) => {
        setPage(prev => ({ ...prev, content: newContent }));
      };

      const handleOptionChange = (option, value) => {
        setPage(prev => ({
          ...prev,
          options: { ...prev.options, [option]: value === 'true' },
        }));
      };
      
      const handleStatusChange = (newStatus) => {
        setPage(prev => ({ ...prev, status: newStatus }));
      };

      const savePage = useCallback(async (pageData, showToast = true) => {
        setSaving(true);
        
        let pageToSave = { ...pageData };
        if (!pageToSave.title) {
          if (showToast) toast({ title: 'Titre requis', description: 'Veuillez donner un titre à votre page.', variant: 'destructive' });
          setSaving(false);
          return;
        }

        try {
          if (isNewPage) {
            const newSlug = slugify(pageToSave.title) || `page-${uuidv4().slice(0, 8)}`;
            const { data, error } = await supabase
              .from('static_pages')
              .insert({ ...pageToSave, slug: newSlug })
              .select()
              .single();
            if (error) throw error;
            if (showToast) toast({ title: 'Page créée', description: 'La page a été créée avec succès.', className: 'bg-green-500 text-white' });
            navigate(`/admin/pages/${data.id}`, { replace: true });
          } else {
            const { error } = await supabase
              .from('static_pages')
              .update(pageToSave)
              .eq('id', id);
            if (error) throw error;
            if (showToast) toast({ title: 'Page sauvegardée', description: 'Vos modifications ont été enregistrées.', className: 'bg-green-500 text-white' });
          }
        } catch (error) {
          if (showToast) toast({ title: 'Erreur de sauvegarde', description: error.message, variant: 'destructive' });
        } finally {
          setSaving(false);
        }
      }, [id, isNewPage, navigate, toast]);

      useEffect(() => {
        if (!isNewPage && !loading) {
          savePage(debouncedPage, false);
        }
      }, [debouncedPage, isNewPage, loading, savePage]);

      if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
      }

      return (
        <>
          <Helmet>
            <title>{isNewPage ? 'Créer une page' : `Modifier: ${page.title}`}</title>
          </Helmet>
          <div className="container mx-auto px-4 py-8 pt-24 sm:pt-28">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <header className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Link to="/admin/dashboard?tab=pages" className="hover:text-foreground">Les pages statiques</Link>
                  <ChevronRight className="h-4 w-4 mx-1" />
                  <span className="text-foreground font-medium">{isNewPage ? 'Nouvelle page' : page.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => navigate('/admin/dashboard?tab=pages')}>Annuler</Button>
                  <Button onClick={() => savePage(page)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isNewPage ? 'Créer la page' : 'Sauvegarder'}
                  </Button>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <Input
                        name="title"
                        placeholder="Titre de la page"
                        value={page.title}
                        onChange={handleInputChange}
                        className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                        maxLength={255}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Contenu de la page</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TiptapEditor
                        content={page.content}
                        onChange={handleContentChange}
                        placeholder="Commencez à écrire votre page ici..."
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimisation SEO</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="seo_description">Meta description</Label>
                        <Textarea
                          id="seo_description"
                          name="seo_description"
                          value={page.seo_description || ''}
                          onChange={handleInputChange}
                          maxLength={300}
                          placeholder="Une brève description pour les moteurs de recherche."
                        />
                        <p className="text-sm text-muted-foreground text-right">
                          {page.seo_description?.length || 0} / 300
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Publication</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div>
                        <Label>Statut</Label>
                        <RadioGroup value={page.status} onValueChange={handleStatusChange} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="draft" id="draft" />
                            <Label htmlFor="draft">Brouillon</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="published" id="published" />
                            <Label htmlFor="published">Publié</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Afficher le titre</Label>
                        <RadioGroup value={String(page.options.show_title)} onValueChange={(v) => handleOptionChange('show_title', v)} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="show_title_yes" /><Label htmlFor="show_title_yes">Oui</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="show_title_no" /><Label htmlFor="show_title_no">Non</Label></div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Afficher la colonne de droite</Label>
                        <RadioGroup value={String(page.options.show_right_column)} onValueChange={(v) => handleOptionChange('show_right_column', v)} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="show_col_yes" /><Label htmlFor="show_col_yes">Oui</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="show_col_no" /><Label htmlFor="show_col_no">Non</Label></div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Afficher le pied de page</Label>
                        <RadioGroup value={String(page.options.show_footer)} onValueChange={(v) => handleOptionChange('show_footer', v)} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="show_footer_yes" /><Label htmlFor="show_footer_yes">Oui</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="show_footer_no" /><Label htmlFor="show_footer_no">Non</Label></div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Visible hors connexion</Label>
                        <RadioGroup value={String(page.options.visible_offline)} onValueChange={(v) => handleOptionChange('visible_offline', v)} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="visible_offline_yes" /><Label htmlFor="visible_offline_yes">Oui</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="visible_offline_no" /><Label htmlFor="visible_offline_no">Non</Label></div>
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      );
    };

    export default EditStaticPage;

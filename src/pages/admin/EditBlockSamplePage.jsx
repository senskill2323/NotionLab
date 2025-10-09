import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import HomeBlockLayoutEditor from '@/components/admin/home-blocks/HomeBlockLayoutEditor';
import {
  getLayoutDefinition,
  getLayoutKeys,
} from '@/components/admin/home-blocks/layoutRegistry';
import useHomeBlockEditor from '@/components/admin/home-blocks/useHomeBlockEditor';

const DEFAULT_LAYOUT = 'home.main_hero';

const EditBlockSamplePage = ({ mode = 'edit' }) => {
  const isNew = mode === 'create';
  const { sampleId: sampleIdParam } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const coerceSampleId = (value) => {
    if (!value) return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  };

  const sampleId = isNew ? null : coerceSampleId(sampleIdParam);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [metadataForm, setMetadataForm] = useState(() => ({
    title: '',
    block_type: 'dynamic',
    layout: DEFAULT_LAYOUT,
    htmlContent: '',
  }));

  const {
    editorState,
    fallbackJson: editorFallbackJson,
    setEditorState,
    setSerializedContent,
    setFallbackJson,
    reset: resetEditor,
    hydrateFromRecord,
    getContentPayload,
  } = useHomeBlockEditor({
    initialLayout: DEFAULT_LAYOUT,
    initialBlockType: 'dynamic',
    toast,
  });

  const layoutOptions = useMemo(() => {
    return getLayoutKeys()
      .map((layout) => {
        const definition = getLayoutDefinition(layout);
        return {
          value: layout,
          label: definition?.label ?? layout,
          blockType: definition?.blockType ?? 'dynamic',
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadSample = async () => {
      if (isNew) {
        resetEditor({
          nextLayout: DEFAULT_LAYOUT,
          nextBlockType: 'dynamic',
        });
        setPreviewMode('desktop');
        setLoading(false);
        return;
      }

      if (!sampleId) {
        toast({
          title: 'Mod�le introuvable',
          description: "Identifiant de mod�le invalide.",
          variant: 'destructive',
        });
        handleBack();
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('block_samples')
        .select('*')
        .eq('id', sampleId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        toast({
          title: 'Mod�le introuvable',
          description: "Impossible de charger ce mod�le.",
          variant: 'destructive',
        });
        handleBack();
        return;
      }

      setMetadataForm({
        title: data.title ?? '',
        block_type: data.block_type ?? 'dynamic',
        layout: data.layout ?? DEFAULT_LAYOUT,
        htmlContent:
          data.block_type === 'html'
            ? typeof data.content === 'string'
              ? data.content
              : data.content?.html ?? ''
            : '',
      });

      if (data.block_type === 'dynamic') {
        hydrateFromRecord({
          recordLayout: data.layout ?? DEFAULT_LAYOUT,
          recordBlockType: 'dynamic',
          recordContent: data.content ?? {},
        });
      } else {
        resetEditor({
          nextLayout: DEFAULT_LAYOUT,
          nextBlockType: 'dynamic',
        });
      }

      setPreviewMode('desktop');
      setLoading(false);
    };

    loadSample();

    return () => {
      isMounted = false;
    };
  }, [handleBack, hydrateFromRecord, isNew, resetEditor, sampleId, toast]);

  const handleLayoutChange = useCallback(
    (nextLayout) => {
      setMetadataForm((prev) => ({
        ...prev,
        layout: nextLayout,
      }));
      resetEditor({
        nextLayout,
        nextBlockType: 'dynamic',
      });
    },
    [resetEditor],
  );

  const handleBlockTypeChange = useCallback(
    (nextType) => {
      setMetadataForm((prev) => ({
        ...prev,
        block_type: nextType,
        htmlContent: nextType === 'html' ? prev.htmlContent : '',
      }));

      if (nextType === 'dynamic') {
        resetEditor({
          nextLayout: metadataForm.layout ?? DEFAULT_LAYOUT,
          nextBlockType: 'dynamic',
        });
      }
      setPreviewMode('desktop');
    },
    [metadataForm.layout, resetEditor],
  );

  const handleSave = useCallback(async () => {
    const trimmedTitle = metadataForm.title.trim();
    if (!trimmedTitle) {
      toast({
        title: 'Titre requis',
        description: 'Veuillez saisir un titre.',
        variant: 'destructive',
      });
      return;
    }

    let content;
    if (metadataForm.block_type === 'dynamic') {
      try {
        content = getContentPayload();
      } catch (_) {
        return;
      }
    } else {
      content = metadataForm.htmlContent ?? '';
    }

    const payload = {
      title: trimmedTitle,
      block_type: metadataForm.block_type,
      layout: metadataForm.layout,
      content,
    };

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from('block_samples').insert([payload]);
        if (error) throw error;
        toast({ title: 'Mod�le enregistr�' });
      } else {
        const { error } = await supabase
          .from('block_samples')
          .update(payload)
          .eq('id', sampleId);
        if (error) throw error;
        toast({ title: 'Mod�le mis � jour' });
      }
      handleBack();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Impossible de sauvegarder: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [
    getContentPayload,
    handleBack,
    isNew,
    metadataForm.block_type,
    metadataForm.htmlContent,
    metadataForm.layout,
    metadataForm.title,
    sampleId,
    toast,
  ]);

  const pageTitle = isNew ? 'Nouveau mod�le de bloc' : `Modifier ${metadataForm.title || 'un mod�le'}`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Helmet>
        <title>{pageTitle} | Admin</title>
      </Helmet>

      <Button variant="ghost" className="h-auto px-0 gap-2 text-muted-foreground" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        Retour � la biblioth�que
      </Button>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{pageTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {isNew
            ? 'Cr�ez un mod�le r�utilisable pour vos blocs d’accueil.'
            : 'Modifiez les m�tadonn�es et le contenu du mod�le selectionn�.'}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-[22rem] space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations g�n�rales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-title">Titre</Label>
                <Input
                  id="template-title"
                  value={metadataForm.title}
                  onChange={(event) =>
                    setMetadataForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Titre du mod�le"
                />
              </div>

              <div className="space-y-2">
                <Label>Type de contenu</Label>
                <Select value={metadataForm.block_type} onValueChange={handleBlockTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dynamic">Dynamique (layout)</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {metadataForm.block_type === 'dynamic' && (
                <div className="space-y-2">
                  <Label>Layout</Label>
                  <Select value={metadataForm.layout} onValueChange={handleLayoutChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {layoutOptions
                        .filter((option) => option.blockType !== 'html')
                        .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {metadataForm.block_type === 'html' && (
            <Card>
              <CardHeader>
                <CardTitle>Contenu HTML</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={18}
                  value={metadataForm.htmlContent}
                  onChange={(event) =>
                    setMetadataForm((prev) => ({
                      ...prev,
                      htmlContent: event.target.value,
                    }))
                  }
                  placeholder="<section>Votre HTML…</section>"
                />
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={handleBack}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde�
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>

        {metadataForm.block_type === 'dynamic' && (
          <div className="flex-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aper�u</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleGroup
                  type="single"
                  value={previewMode}
                  onValueChange={(value) => value && setPreviewMode(value)}
                >
                  <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
                  <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
                </ToggleGroup>

                <div
                  className={
                    previewMode === 'mobile'
                      ? 'mx-auto w-[420px] border rounded-lg'
                      : 'border rounded-lg'
                  }
                >
                  <HomeBlockLayoutEditor
                    layout={metadataForm.layout}
                    value={editorState}
                    onChange={setEditorState}
                    onContentChange={setSerializedContent}
                    previewMode={previewMode}
                    fallbackJson={editorFallbackJson}
                    onFallbackJsonChange={setFallbackJson}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditBlockSamplePage;

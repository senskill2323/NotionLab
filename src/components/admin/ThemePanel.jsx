import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Palette, PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ThemeEditor } from './theme/ThemeEditor';
import { ThemeLibrary } from './theme/ThemeLibrary';
import { initialTranslations } from './theme/theme-constants';

const ThemePanel = () => {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { refreshTheme, applyTheme: applyPreviewTheme, theme: originalTheme } = useTheme();

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('themes').select('*').order('is_default', { ascending: false }).order('name');
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les thèmes.", variant: "destructive" });
    } else {
      setThemes(data);
      const activeTheme = data.find(t => t.is_default);
      if (activeTheme && !selectedTheme) {
        setSelectedTheme(activeTheme);
      } else if (data.length > 0 && !selectedTheme) {
        setSelectedTheme(data[0]);
      }
    }
    setLoading(false);
  }, [toast, selectedTheme]);

  useEffect(() => {
    fetchThemes();
    return () => {
      if (originalTheme) {
        applyPreviewTheme(originalTheme);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTheme) {
      applyPreviewTheme(selectedTheme.tokens);
    }
  }, [selectedTheme, applyPreviewTheme]);

  const updateSelectedTheme = (newThemeData) => {
    setSelectedTheme(prevTheme => {
        const updatedTheme = { ...prevTheme, ...newThemeData };
        if (newThemeData.tokens) {
            applyPreviewTheme(newThemeData.tokens);
        }
        return updatedTheme;
    });
  };

  const handleSaveTheme = async () => {
    if (!selectedTheme) return;
    setIsSaving(true);
    
    const { id, name, tokens, is_default, created_at, updated_at, ...rest } = selectedTheme;

    const themeDataToSave = {
      name: name,
      tokens: tokens,
    };
    
    const { error } = await supabase.from('themes').update(themeDataToSave).eq('id', selectedTheme.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le thème.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Thème sauvegardé.", className: "bg-green-500 text-white" });
      await fetchThemes();
      if (selectedTheme.is_default) {
        await refreshTheme();
      }
    }
    setIsSaving(false);
  };

  const handleDuplicateTheme = async (themeToDuplicate) => {
    const newTheme = {
      id: uuidv4(),
      name: `${themeToDuplicate.name} (Copie)`,
      tokens: themeToDuplicate.tokens,
      is_default: false,
    };
    const { error } = await supabase.from('themes').insert(newTheme);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de dupliquer le thème.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Thème dupliqué." });
      await fetchThemes();
    }
  };

  const handleNewTheme = async () => {
    const defaultTheme = themes.find(t => t.is_default) || themes[0];
    if (!defaultTheme) {
        toast({ title: "Erreur", description: "Aucun thème de base à dupliquer.", variant: "destructive" });
        return;
    }
    await handleDuplicateTheme(defaultTheme);
  };

  const handleDeleteTheme = async (themeId) => {
    const { error } = await supabase.from('themes').delete().eq('id', themeId);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le thème.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Thème supprimé." });
      if (selectedTheme?.id === themeId) {
        setSelectedTheme(themes.find(t => t.is_default) || themes[0] || null);
      }
      await fetchThemes();
    }
  };

  const handleSetActiveTheme = async (themeId) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('set_active_theme', { p_theme_id: themeId });
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'activer le thème.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Nouveau thème activé.", className: "bg-green-500 text-white" });
      await fetchThemes();
      await refreshTheme();
    }
    setIsSaving(false);
  };

  const { activeTheme, draftThemes } = useMemo(() => {
    const active = themes.find(t => t.is_default);
    const drafts = themes.filter(t => !t.is_default);
    return { activeTheme: active, draftThemes: drafts };
  }, [themes]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-effect overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette /> Gestionnaire d'Apparence</CardTitle>
        <CardDescription>Collectionnez, testez et organisez vos thèmes. Les changements sont prévisualisés en direct.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          <div className="lg:col-span-3 xl:col-span-3 border-r border-border pr-6">
            <ThemeLibrary
              activeTheme={activeTheme}
              draftThemes={draftThemes}
              selectedTheme={selectedTheme}
              onSelectTheme={setSelectedTheme}
              onNewTheme={handleNewTheme}
              onDuplicateTheme={handleDuplicateTheme}
              onDeleteTheme={handleDeleteTheme}
              onSetActiveTheme={handleSetActiveTheme}
              isSaving={isSaving}
            />
          </div>
          <div className="lg:col-span-9 xl:col-span-9">
            <div className="flex justify-end mb-4">
              <Button onClick={handleSaveTheme} disabled={isSaving || !selectedTheme}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Sauvegarder les changements
              </Button>
            </div>
            <ThemeEditor
              theme={selectedTheme}
              onUpdateTheme={updateSelectedTheme}
              translations={initialTranslations}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemePanel;
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, SlidersHorizontal, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

const ComponentManagerPage = () => {
  const [rules, setRules] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [openFamilies, setOpenFamilies] = useState({});

  const familyOrder = [
    'Éléments Globaux',
    'Page d\'accueil',
    'Tableau de bord Admin',
    'Tableau de bord Client',
    'Page Formations',
    'Page Life OS system',
    'Page Qui suis-je?',
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rulesPromise = supabase.from('component_rules').select('*').order('family').order('display_order');
    const typesPromise = supabase.from('user_types').select('*').order('id');
    
    const [{ data: rulesData, error: rulesError }, { data: typesData, error: typesError }] = await Promise.all([rulesPromise, typesPromise]);

    if (rulesError || typesError) {
      toast({ title: 'Erreur', description: 'Impossible de charger les données.', variant: 'destructive' });
      console.error(rulesError || typesError);
    } else {
      setRules(rulesData);
      setUserTypes(typesData.filter(t => t.type_name !== 'owner'));
      const families = [...new Set(rulesData.map(p => p.family))];
      const initialOpenState = families.reduce((acc, family) => {
        acc[family] = true;
        return acc;
      }, {});
      setOpenFamilies(initialOpenState);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFamily = (family) => {
    setOpenFamilies(prev => ({ ...prev, [family]: !prev[family] }));
  };

  const groupedRules = rules.reduce((acc, r) => {
    const family = r.family || 'Divers';
    if (!acc[family]) {
      acc[family] = [];
    }
    acc[family].push(r);
    return acc;
  }, {});

  const handleStateChange = (ruleId, userType, value) => {
    setRules(prev =>
      prev.map(r => r.id === ruleId ? { ...r, [`${userType}_state`]: value } : r)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = rules.map(({ id, ...rest }) => {
        const updateData = {};
        userTypes.forEach(type => {
            updateData[`${type.type_name}_state`] = rest[`${type.type_name}_state`];
        });
        updateData['anonymous_state'] = rest['anonymous_state'];
        return { id, ...updateData };
    });

    const { error } = await supabase.from('component_rules').upsert(updates);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les règles.', variant: 'destructive' });
      console.error(error);
    } else {
      toast({ title: 'Succès', description: 'Les règles des composants ont été mises à jour.' });
    }
    setSaving(false);
  };

  const stateOptions = [
    { value: 'visible', label: 'Visible' },
    { value: 'hidden', label: 'Masqué' },
    { value: 'disabled', label: 'Désactivé' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Helmet>
        <title>Apparence des Boutons | Admin</title>
        <meta name="description" content="Gérez la visibilité et l'état des composants pour chaque type d'utilisateur." />
      </Helmet>
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
            Apparence des Boutons
          </CardTitle>
          <CardDescription>
            Définissez l'état (visible, masqué, désactivé) de chaque bouton pour les différents types d'utilisateurs, par page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-200">
            <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-300" />
            <AlertTitle>Comment ça marche ?</AlertTitle>
            <AlertDescription>
              Ce tableau vous donne un contrôle total sur l'interface. Chaque ligne représente un bouton ou un lien. Pour chaque rôle, vous pouvez choisir de le rendre `Visible`, de le `Masquer` complètement, ou de l'afficher comme `Désactivé` (grisé et non cliquable).
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg overflow-hidden">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%] font-bold">Composant</TableHead>
                    <TableHead className="text-center font-bold">Visiteur</TableHead>
                    {userTypes.map(type => (
                      <TableHead key={type.id} className="text-center font-bold">{type.display_name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {familyOrder.map(family => groupedRules[family] && (
                    <React.Fragment key={family}>
                      <TableRow className="bg-muted/50 hover:bg-muted/60">
                        <TableCell colSpan={userTypes.length + 2} className="font-bold cursor-pointer" onClick={() => toggleFamily(family)}>
                          <div className="flex items-center gap-2">
                            {openFamilies[family] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {family}
                          </div>
                        </TableCell>
                      </TableRow>
                      {openFamilies[family] && groupedRules[family].map(rule => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium flex items-center gap-2 pl-10">
                            {rule.description}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Clé: {rule.component_key}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center">
                            <Select value={rule.anonymous_state} onValueChange={(value) => handleStateChange(rule.id, 'anonymous', value)}>
                              <SelectTrigger className="w-[110px] mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {stateOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {userTypes.map(type => (
                            <TableCell key={type.id} className="text-center">
                              <Select value={rule[`${type.type_name}_state`]} onValueChange={(value) => handleStateChange(rule.id, type.type_name, value)}>
                                <SelectTrigger className="w-[110px] mx-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {stateOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Sauvegarder les modifications
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ComponentManagerPage;
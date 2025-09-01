import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, ShieldCheck, HelpCircle, Info, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RolesPermissionsPage = () => {
  const [permissions, setPermissions] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [openFamilies, setOpenFamilies] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const permPromise = supabase.from('role_permissions').select('*').order('family').order('display_order').order('permission');
    const typesPromise = supabase.from('user_types').select('*').order('id');
    const [{ data: permData, error: permError }, { data: typesData, error: typesError }] = await Promise.all([permPromise, typesPromise]);

    if (permError || typesError) {
      toast({ title: 'Erreur', description: 'Impossible de charger les données.', variant: 'destructive' });
      console.error(permError || typesError);
    } else {
      setPermissions(permData);
      setUserTypes(typesData.filter(t => t.type_name !== 'owner'));
      const families = [...new Set(permData.map(p => p.family))];
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

  const groupedPermissions = permissions.reduce((acc, p) => {
    const family = p.family || 'Divers';
    if (!acc[family]) {
      acc[family] = [];
    }
    acc[family].push(p);
    return acc;
  }, {});

  const handlePermissionChange = (permissionId, userType, value) => {
    setPermissions(prev =>
      prev.map(p => p.id === permissionId ? { ...p, [userType]: value } : p)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = permissions.map(({ id, prof, client, guest, vip }) => ({ id, prof, client, guest, vip }));
    const { error } = await supabase.from('role_permissions').upsert(updates);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les permissions.', variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Les permissions ont été mises à jour.' });
    }
    setSaving(false);
  };

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
        <title>Droits et Rôles | Admin</title>
        <meta name="description" content="Gérez les permissions pour chaque type d'utilisateur." />
      </Helmet>
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Droits et Types d'utilisateurs
          </CardTitle>
          <CardDescription>
            Cochez les cases pour accorder des permissions aux différents types d'utilisateurs. Le type "Owner" a tous les droits par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-200">
            <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-300" />
            <AlertTitle>Comment ça marche ?</AlertTitle>
            <AlertDescription>
              Chaque famille de droits possède une permission `*:view_module`. C'est elle qui contrôle si le module est visible ou non sur le tableau de bord de l'utilisateur. Les autres permissions gèrent les actions possibles à l'intérieur du module.
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg overflow-hidden">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%] font-bold">Permission</TableHead>
                    {userTypes.map(type => (
                      <TableHead key={type.id} className="text-center font-bold">{type.display_name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {Object.entries(groupedPermissions).sort(([famA], [famB]) => (groupedPermissions[famA][0].display_order || 999) - (groupedPermissions[famB][0].display_order || 999)).map(([family, perms]) => (
                    <React.Fragment key={family}>
                      <TableRow className="bg-muted/50 hover:bg-muted/60">
                        <TableCell colSpan={userTypes.length + 1} className="font-bold cursor-pointer" onClick={() => toggleFamily(family)}>
                          <div className="flex items-center gap-2">
                            {openFamilies[family] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {family}
                          </div>
                        </TableCell>
                      </TableRow>
                      {openFamilies[family] && perms.map(permission => (
                        <TableRow key={permission.id}>
                          <TableCell className={`font-medium flex items-center gap-2 pl-10 ${permission.permission.endsWith(':view_module') ? 'font-bold' : ''}`}>
                            {permission.permission.endsWith(':view_module') && <Eye className="w-4 h-4 text-blue-500" />}
                            {permission.permission}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{permission.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          {userTypes.map(type => (
                            <TableCell key={type.id} className="text-center">
                              <Checkbox
                                checked={!!permission[type.type_name]}
                                onCheckedChange={checked => handlePermissionChange(permission.id, type.type_name, checked)}
                                aria-label={`Permission ${permission.permission} pour ${type.display_name}`}
                              />
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

export default RolesPermissionsPage;
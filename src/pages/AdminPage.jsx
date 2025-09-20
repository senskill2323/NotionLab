import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, MessageSquare, Settings, BarChart3, LifeBuoy, Puzzle, Shield, SlidersHorizontal, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import RolesPermissionsPage from '@/pages/admin/RolesPermissionsPage';
import ModuleManagerPage from '@/pages/admin/ModuleManagerPage';
import ComponentManagerPage from '@/pages/admin/ComponentManagerPage';
import AssistantAdminPage from '@/pages/admin/AssistantAdminPage';

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('permissions');

  // Tabs de base
  const baseTabs = [
    { id: 'permissions', label: 'Droits et Rôles', icon: Shield, component: <RolesPermissionsPage /> },
    { id: 'modules', label: 'Gestion des Modules', icon: Puzzle, component: <ModuleManagerPage /> },
    { id: 'components', label: 'Gestion des Composants', icon: SlidersHorizontal, component: <ComponentManagerPage /> },
    { id: 'users', label: 'Utilisateurs', icon: Users, component: <p>Gestion des utilisateurs à venir.</p> },
    { id: 'formations', label: 'Formations', icon: BookOpen, component: <p>Gestion des formations à venir.</p> },
    { id: 'chat', label: 'Chat', icon: MessageSquare, component: <p>Gestion du chat à venir.</p> },
    { id: 'stats', label: 'Statistiques', icon: BarChart3, component: <p>Statistiques à venir.</p> },
    { id: 'support', label: 'Support', icon: LifeBuoy, component: <p>Support à venir.</p> },
    { id: 'settings', label: 'Paramètres', icon: Settings, component: <p>Paramètres à venir.</p> },
  ];

  // Onglet "IAssistant" accessible uniquement au rôle owner
  // Tolérance: si la jointure user_types n'est pas disponible, on accepte aussi le fallback texte
  const isOwner = (user?.profile?.user_type === 'owner') || (user?.profile?.user_types?.type_name === 'owner');
  const tabs = isOwner
    ? [
        { id: 'iassistant', label: 'IAssistant', icon: Bot, component: <AssistantAdminPage /> },
        ...baseTabs,
      ]
    : baseTabs;

  return (
    <>
      <Helmet>
        <title>Panneau d'Administration | NotionLab</title>
        <meta name="description" content="Panneau d'administration pour gérer la plateforme NotionLab." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/40">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold tracking-tight">Panneau d'Administration</h1>
            <p className="text-muted-foreground mt-2">
              Bienvenue, {user?.profile?.first_name || 'Admin'}. Gérez la plateforme depuis cet espace centralisé.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            <motion.aside
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-1/4"
            >
              <Card className="glass-effect sticky top-24">
                <CardHeader>
                  <CardTitle>Menu de navigation</CardTitle>
                  <CardDescription>Sélectionnez une section à gérer.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  {tabs.map(tab => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <tab.icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.aside>

            <motion.main
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:w-3/4"
            >
              {tabs.find(tab => tab.id === activeTab)?.component}
            </motion.main>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
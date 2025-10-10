import React from 'react';
import { Helmet } from 'react-helmet';
import HomeBlockManagementPanel from '@/components/admin/HomeBlockManagementPanel';

const HomeBlockManagementPage = () => (
  <div className="container mx-auto py-8 space-y-6">
    <Helmet>
      <title>Gestion des Blocs de Contenu | Admin</title>
    </Helmet>
    <header className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Gestion des Blocs de Contenu</h1>
    </header>
    <HomeBlockManagementPanel />
  </div>
);

export default HomeBlockManagementPage;

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HomeBlockList from '@/components/admin/home-blocks/HomeBlockList';
import BlockSamplesPanel from '@/components/admin/home-blocks/BlockSamplesPanel';

const HomeBlockManagementPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState(searchParams.get('subtab') || 'list');

  const handleTabChange = (value) => {
    setActiveSubTab(value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('subtab', value);
    setSearchParams(newSearchParams, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="list">Liste des bloques</TabsTrigger>
          <TabsTrigger value="samples">Bibliothèque de modèles</TabsTrigger>
          <TabsTrigger value="categories" disabled>Gestion des catégories</TabsTrigger>
          <TabsTrigger value="config" disabled>Configuration</TabsTrigger>
          <TabsTrigger value="archives">Archives</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <HomeBlockList />
        </TabsContent>
        <TabsContent value="samples" className="mt-4">
          <BlockSamplesPanel />
        </TabsContent>
        <TabsContent value="archives" className="mt-4">
          <HomeBlockList mode="archives" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomeBlockManagementPanel;
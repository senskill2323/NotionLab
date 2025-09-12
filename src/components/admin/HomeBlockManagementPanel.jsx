import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HomeBlockList from '@/components/admin/home-blocks/HomeBlockList';
import BlockSamplesPanel from '@/components/admin/home-blocks/BlockSamplesPanel';

const HomeBlockManagementPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get('editing') === 'true' && searchParams.get('view') !== 'edit')
    ? 'samples'
    : (searchParams.get('subtab') || 'list');
  const [activeSubTab, setActiveSubTab] = useState(initial);

  const handleTabChange = (value) => {
    // Persist the subtab in URL so a remount preserves the selected subtab
    const sp = new URLSearchParams(window.location.search);
    sp.set('subtab', value);
    setSearchParams(sp, { replace: true });
    setActiveSubTab(value);
  };

  // Only react to editing=true to force the Samples tab. Ignore other URL subtab changes to prevent bounce.
  useLayoutEffect(() => {
    const isEditingTemplate = searchParams.get('editing') === 'true';
    const isBlockEditing = searchParams.get('view') === 'edit';
    if (isEditingTemplate && !isBlockEditing && activeSubTab !== 'samples') {
      setActiveSubTab('samples');
      const sp = new URLSearchParams(searchParams);
      sp.set('subtab', 'samples');
      setSearchParams(sp, { replace: true });
    }
  }, [searchParams, activeSubTab, setSearchParams]);

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="list">Liste des bloques</TabsTrigger>
          <TabsTrigger value="samples">Bibliothèque de modèles</TabsTrigger>
          <TabsTrigger value="categories" disabled>Gestion des catégories</TabsTrigger>
          <TabsTrigger value="config" disabled>Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4" forceMount style={{ display: activeSubTab === 'list' ? 'block' : 'none' }}>
          <HomeBlockList />
        </TabsContent>
        <TabsContent value="samples" className="mt-4" forceMount style={{ display: activeSubTab === 'samples' ? 'block' : 'none' }}>
          <BlockSamplesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomeBlockManagementPanel;
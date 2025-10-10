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
  const [refreshListKey, setRefreshListKey] = useState(0);

  const handleTabChange = (value) => {
    // Persist the subtab in URL so a remount preserves the selected subtab
    const sp = new URLSearchParams(window.location.search);
    sp.set('subtab', value);
    setSearchParams(sp, { replace: true });
    setActiveSubTab(value);
  };

  // Called by children when a new block is created from a template
  const handleBlockCreated = (createdBlockId) => {
    // Persist editor state so HomeBlockList opens directly in edit mode
    try {
      if (createdBlockId) {
        sessionStorage.setItem('homeBlockEditor', JSON.stringify({
          view: 'edit',
          blockId: createdBlockId,
          timestamp: Date.now(),
        }));
      } else {
        sessionStorage.removeItem('homeBlockEditor');
      }
    } catch (_) {}

    // Switch to the list tab and bump a refresh key so the list refetches
    const sp = new URLSearchParams(window.location.search);
    // Clear any template editing flags to avoid being bounced back to Samples
    sp.delete('editing');
    sp.delete('sampleId');
    sp.set('subtab', 'list');
    if (createdBlockId) {
      sp.set('view', 'edit');
      sp.set('blockId', String(createdBlockId));
    } else {
      sp.delete('view');
      sp.delete('blockId');
    }
    setSearchParams(sp, { replace: true });
    setActiveSubTab('list');
    setRefreshListKey((k) => k + 1);
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
        <TabsList className="bg-green-50 dark:bg-green-900/20">
          <TabsTrigger value="list">Liste des blocs</TabsTrigger>
          <TabsTrigger value="samples">Bibliothèque de modèles</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4" forceMount style={{ display: activeSubTab === 'list' ? 'block' : 'none' }}>
          <HomeBlockList refreshKey={refreshListKey} activeSubTab={activeSubTab} />
        </TabsContent>
        <TabsContent value="samples" className="mt-4" forceMount style={{ display: activeSubTab === 'samples' ? 'block' : 'none' }}>
          <BlockSamplesPanel onBlockCreated={handleBlockCreated} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomeBlockManagementPanel;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, GripVertical, Wand2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Input } from '@/components/ui/input';

const SortableTab = ({ tab, isEditing, onLabelChange, onStartEdit, onEndEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };
  const Icon = Icons[tab.icon] || Icons.HelpCircle;
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      onEndEdit();
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none">
      <div className="flex items-center gap-2 p-2 bg-card border rounded-lg shadow-sm">
        <div {...listeners} className="cursor-grab p-1">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
        {isEditing ? (
          <Input
            ref={inputRef}
            type="text"
            value={tab.label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={onEndEdit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
          />
        ) : (
          <span
            onDoubleClick={() => onStartEdit(tab.id)}
            className="text-sm font-medium p-1 cursor-pointer"
          >
            {tab.label}
          </span>
        )}
      </div>
    </div>
  );
};

const TabContainer = ({ id, tabs, isEditing, onLabelChange, onStartEdit, onEndEdit, onDragOver }) => {
  return (
    <SortableContext id={id} items={tabs.map(t => t.id)} strategy={rectSortingStrategy}>
      <div 
        className="p-4 min-h-[60px] bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-wrap gap-2"
        onDragOver={onDragOver}
      >
        {tabs.map(tab => (
          <SortableTab 
            key={tab.id} 
            tab={tab}
            isEditing={isEditing === tab.id}
            onLabelChange={(newLabel) => onLabelChange(tab.id, newLabel)}
            onStartEdit={onStartEdit}
            onEndEdit={onEndEdit}
          />
        ))}
      </div>
    </SortableContext>
  );
};

const TabsEditorPage = () => {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchTabs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admin_dashboard_tabs').select('*').order('row_order').order('col_order');
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les onglets.", variant: "destructive" });
    } else {
      setTabs((data || []).filter(t => t.label !== 'Formations' && t.label !== 'Builder Settings' && t.label !== 'Parcours'));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);
  
  const handleLabelChange = (tabId, newLabel) => {
    setTabs(currentTabs =>
      currentTabs.map(t => (t.id === tabId ? { ...t, label: newLabel } : t))
    );
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setEditingTabId(null);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTab = tabs.find(t => t.id === active.id);
    const overTab = tabs.find(t => t.id === over.id);
    if (!activeTab || !overTab) return;

    const overContainerId = over.data.current?.sortable.containerId;
    const activeContainerId = active.data.current?.sortable.containerId;

    if (overContainerId !== activeContainerId) {
        setTabs(prev => {
            const activeIndex = prev.findIndex(t => t.id === active.id);
            const overIndex = prev.findIndex(t => t.id === over.id);
            
            const newRow = overContainerId === 'row-0' ? 0 : 1;
            
            const newTabs = [...prev];
            newTabs[activeIndex] = { ...newTabs[activeIndex], row_order: newRow };

            return arrayMove(newTabs, activeIndex, overIndex);
        });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setTabs((currentTabs) => {
        const oldIndex = currentTabs.findIndex((t) => t.id === active.id);
        const newIndex = currentTabs.findIndex((t) => t.id === over.id);
        
        const movedTabs = arrayMove(currentTabs, oldIndex, newIndex);

        const tabsByRow = movedTabs.reduce((acc, tab) => {
            const row = tab.row_order || 0;
            if (!acc[row]) acc[row] = [];
            acc[row].push(tab);
            return acc;
        }, {});

        const finalTabs = [];
        Object.keys(tabsByRow).sort().forEach(rowKey => {
            tabsByRow[rowKey].forEach(tab => {
                finalTabs.push(tab);
            });
        });
        
        return finalTabs;
      });
    }
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    setEditingTabId(null);
    
    const updates = tabs.map((tab, index) => {
      const fullTab = tabs.find(t => t.id === tab.id);
      return {
        ...fullTab,
        row_order: tab.row_order,
        col_order: index,
      };
    });

    const finalUpdates = [];
    const tabsByRow = updates.reduce((acc, tab) => {
        const row = tab.row_order || 0;
        if (!acc[row]) acc[row] = [];
        acc[row].push(tab);
        return acc;
    }, {});
    
    Object.keys(tabsByRow).forEach(rowKey => {
        tabsByRow[rowKey].forEach((tab, index) => {
            finalUpdates.push({
                ...tab,
                row_order: parseInt(rowKey),
                col_order: index,
            });
        });
    });

    const { error } = await supabase.from('admin_dashboard_tabs').upsert(finalUpdates);

    if (error) {
      toast({ title: "Erreur", description: `Impossible de sauvegarder la disposition: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "La disposition des onglets a été sauvegardée.", className: "bg-green-500 text-white" });
      fetchTabs();
    }
    setSaving(false);
  };

  const activeTabForOverlay = activeId ? tabs.find(t => t.id === activeId) : null;
  
  const tabsByRow = tabs.reduce((acc, tab) => {
    const row = tab.row_order || 0;
    if (!acc[row]) acc[row] = [];
    acc[row].push(tab);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
      <Helmet>
        <title>Éditeur d'Onglets | Admin</title>
      </Helmet>
      <Card className="glass-effect">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Wand2 className="w-6 h-6 text-primary" />Éditeur d'Onglets du Dashboard</CardTitle>
            <CardDescription>Réorganisez par glisser-déposer. Double-cliquez sur un nom pour le modifier.</CardDescription>
          </div>
          <Button onClick={handleSaveLayout} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sauvegarder la Disposition
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-2">Ligne 1</p>
            <TabContainer 
              id="row-0" 
              tabs={tabsByRow[0] || []} 
              isEditing={editingTabId}
              onLabelChange={handleLabelChange}
              onStartEdit={setEditingTabId}
              onEndEdit={() => setEditingTabId(null)}
            />
          </div>
          <div>
            <p className="font-semibold mb-2">Ligne 2</p>
            <TabContainer 
              id="row-1" 
              tabs={tabsByRow[1] || []}
              isEditing={editingTabId}
              onLabelChange={handleLabelChange}
              onStartEdit={setEditingTabId}
              onEndEdit={() => setEditingTabId(null)}
            />
          </div>
        </CardContent>
      </Card>
      <DragOverlay>
        {activeTabForOverlay ? 
          <SortableTab 
            tab={activeTabForOverlay} 
            isEditing={false} 
            onLabelChange={()=>{}} 
            onStartEdit={()=>{}} 
            onEndEdit={()=>{}} 
          /> 
          : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TabsEditorPage;
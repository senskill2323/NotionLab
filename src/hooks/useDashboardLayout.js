import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { arrayMove } from '@dnd-kit/sortable';
import {
  MAX_COLS_PER_ROW,
  normalizeRow
} from '@/components/dashboard/editor/layoutUtils';

const sanitizeLayout = (layout) => {
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  const hiddenKeys = Array.isArray(layout?.hiddenModuleKeys) ? layout.hiddenModuleKeys : [];

  return {
    rows: rows.map(row => ({
      ...row,
      columns: Array.isArray(row?.columns)
        ? row.columns.map(col => ({ ...col }))
        : [],
    })),
    hiddenModuleKeys: Array.from(new Set(hiddenKeys.filter(key => typeof key === 'string' && key.length > 0))),
  };
};

export const useDashboardLayout = () => {
  const [layout, setLayoutState] = useState({ rows: [], hiddenModuleKeys: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [dropIndicatorInfo, setDropIndicatorInfo] = useState(null);
  const [forbiddenRowId, setForbiddenRowId] = useState(null);
  const { toast } = useToast();

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const setLayout = (newLayout) => {
    if (typeof newLayout === 'function') {
      setLayoutState(current => {
        const result = newLayout(current);
        const sanitized = sanitizeLayout(result);
        layoutRef.current = sanitized;
        return sanitized;
      });
    } else {
      const sanitized = sanitizeLayout(newLayout);
      layoutRef.current = sanitized;
      setLayoutState(sanitized);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: modulesData, error: modulesError } = await supabase.from('modules_registry').select('*').eq('is_active', true);
      if (modulesError) throw modulesError;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const invokeOptions = {
        body: { owner_type: 'default', owner_id: null },
      };

      if (session?.access_token) {
        invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
      }

      const { data: layoutData, error: layoutError } = await supabase.functions.invoke('get-dashboard-layout', invokeOptions);
      if (layoutError) throw layoutError;

      const layoutJson = layoutData?.layout_json;
      if (layoutJson && Array.isArray(layoutJson.rows)) {
        setLayout(sanitizeLayout(layoutJson));
      } else {
        const defaultRows = Array.isArray(modulesData) && modulesData.length > 0
          ? modulesData.map(m => ({
              rowId: uuidv4(),
              columns: [{ colId: uuidv4(), span: m.default_layout?.span || 12, moduleKey: m.module_key }]
            }))
          : [];

        setLayout({ rows: defaultRows, hiddenModuleKeys: [] });
      }
    } catch (err) {
      setError("Impossible de charger la configuration de l'éditeur.");
      toast({ title: "Erreur de chargement", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveItem(active.data.current);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    const currentLayout = layoutRef.current;
    
    setDropIndicatorInfo(null);
    setForbiddenRowId(null);
    
    if (!over || !active.data.current) return;

    const activeType = active.data.current.type;
    const overData = over.data.current;
    
    const overRow = overData?.type === 'row' 
      ? overData.row 
      : currentLayout.rows.find(r => r.rowId === overData?.rowId);

    if (!overRow) return;

    const isSameRow = activeType === 'module' && active.data.current.rowId === overRow.rowId;
    if (!isSameRow && overRow.columns.length >= MAX_COLS_PER_ROW) {
      setForbiddenRowId(overRow.rowId);
      return;
    }

    if (overData?.type === 'module') {
      const midX = over.rect.left + over.rect.width / 2;
      const side = event.activatorEvent.clientX < midX ? 'left' : 'right';
      
      setDropIndicatorInfo({
        rowId: overRow.rowId,
        colId: over.id,
        side: side,
      });
    }
  };
  
  const handleDragEnd = (event) => {
    const localDropIndicatorInfo = dropIndicatorInfo;
    const { active, over } = event;
    
    setActiveItem(null);
    setDropIndicatorInfo(null);
    setForbiddenRowId(null);

    if (!over) return null;

    const activeType = active.data.current?.type;

    if (activeType === 'library-module') {
      handleDropFromLibrary(active, over, setLayout, event);
      return null;
    }

    if (activeType === 'module') {
      // If dropped back onto the library dropzone, remove from layout
      const overType = over?.data?.current?.type;
      if (overType === 'library-dropzone') {
        let updatedLayout = null;
        const moduleKeyToHide = active.data.current?.col?.moduleKey;
        setLayout(currentLayout => {
          const newLayout = sanitizeLayout(currentLayout);
          const sourceRow = newLayout.rows.find(r => r.rowId === active.data.current.rowId);
          if (!sourceRow) return currentLayout;
          const sourceColIndex = sourceRow.columns.findIndex(c => c.colId === active.id);
          if (sourceColIndex === -1) return currentLayout;
          // Remove the module from the row
          sourceRow.columns.splice(sourceColIndex, 1);
          // Remove empty row if needed
          if (sourceRow.columns.length === 0) {
            newLayout.rows = newLayout.rows.filter(r => r.rowId !== sourceRow.rowId);
          }
          if (moduleKeyToHide) {
            const hiddenSet = new Set(newLayout.hiddenModuleKeys);
            hiddenSet.add(moduleKeyToHide);
            newLayout.hiddenModuleKeys = Array.from(hiddenSet);
          }
          newLayout.rows.forEach(normalizeRow);
          updatedLayout = newLayout;
          return newLayout;
        });
        return updatedLayout ? { type: 'library-drop', layout: updatedLayout } : null;
      }
      handleMoveInLayout(active, over, setLayout, localDropIndicatorInfo);
      return null;
    }

    return null;
  };

  const handleDropFromLibrary = (active, over, setLayout, event) => {
    const { moduleKey, defaultSpan } = active.data.current;
    const overData = over.data.current;

    const newModule = {
      colId: uuidv4(),
      moduleKey,
      span: defaultSpan,
    };

    setLayout(currentLayout => {
      let newLayout = sanitizeLayout(currentLayout);

      if (overData?.type === 'dropzone') {
        const newRow = { rowId: uuidv4(), columns: [newModule] };
        const dropZoneId = over.id.toString();
        let dropIndex = -1;

        if (dropZoneId === 'dropzone-before-first') {
          dropIndex = 0;
        } else if (dropZoneId.startsWith('dropzone-after-')) {
          const targetRowId = dropZoneId.replace('dropzone-after-', '');
          const targetRowIndex = newLayout.rows.findIndex(r => r.rowId === targetRowId);
          if (targetRowIndex > -1) {
            dropIndex = targetRowIndex + 1;
          }
        }
        
        if (dropIndex !== -1) {
          newLayout.rows.splice(dropIndex, 0, newRow);
        } else {
          newLayout.rows.push(newRow);
        }
      } else {
        const destRow = newLayout.rows.find(r => r.rowId === overData?.rowId || r.rowId === overData?.row?.rowId);
        if (!destRow) return currentLayout;

        if (destRow.columns.length >= MAX_COLS_PER_ROW) {
          toast({ title: "Ligne pleine", description: `Vous ne pouvez pas ajouter plus de ${MAX_COLS_PER_ROW} modules par ligne.`, variant: "destructive" });
          return currentLayout;
        }

        let destColIndex = destRow.columns.length;
        if (overData?.type === 'module') {
          const targetColIndex = destRow.columns.findIndex(c => c.colId === over.id);
          if (targetColIndex !== -1 && event && event.activatorEvent) {
            const midX = over.rect.left + over.rect.width / 2;
            const side = event.activatorEvent.clientX < midX ? 'left' : 'right';
            destColIndex = side === 'left' ? targetColIndex : targetColIndex + 1;
          }
        }
        destRow.columns.splice(destColIndex, 0, newModule);
      }

      newLayout.rows.forEach(normalizeRow);
      const hiddenSet = new Set(newLayout.hiddenModuleKeys);
      hiddenSet.delete(moduleKey);
      newLayout.hiddenModuleKeys = Array.from(hiddenSet);
      return newLayout;
    });
  };

  const handleMoveInLayout = (active, over, setLayout, localDropIndicatorInfo) => {
    const overData = over.data.current;

    if (overData?.type === 'dropzone') {
      setLayout(currentLayout => {
        let newLayout = sanitizeLayout(currentLayout);
        const sourceRow = newLayout.rows.find(r => r.rowId === active.data.current.rowId);
        if (!sourceRow) return currentLayout;
        
        const sourceColIndex = sourceRow.columns.findIndex(c => c.colId === active.id);
        if (sourceColIndex === -1) return currentLayout;

        const [movedModule] = sourceRow.columns.splice(sourceColIndex, 1);
        if (sourceRow.columns.length === 0) {
            newLayout.rows = newLayout.rows.filter(r => r.rowId !== sourceRow.rowId);
        }

        const newRow = { rowId: uuidv4(), columns: [movedModule] };

        const dropZoneId = over.id.toString();
        let dropIndex = -1;

        if (dropZoneId === 'dropzone-before-first') {
            dropIndex = 0;
        } else if (dropZoneId.startsWith('dropzone-after-')) {
            const targetRowId = dropZoneId.replace('dropzone-after-', '');
            const targetRowIndex = newLayout.rows.findIndex(r => r.rowId === targetRowId);
            if (targetRowIndex > -1) {
                dropIndex = targetRowIndex + 1;
            }
        }
        
        if (dropIndex !== -1) {
            newLayout.rows.splice(dropIndex, 0, newRow);
        } else {
            newLayout.rows.push(newRow);
        }

        newLayout.rows.forEach(normalizeRow);
        return newLayout;
      });
      return;
    }
    
    const activeRowId = active.data.current.rowId;
    const overRowId = overData?.rowId || overData?.row?.rowId;

    if (!activeRowId || !overRowId) return;

    const isSameRow = activeRowId === overRowId;

    setLayout(currentLayout => {
        let newLayout = JSON.parse(JSON.stringify(currentLayout));
        const sourceRow = newLayout.rows.find(r => r.rowId === activeRowId);
        const destRow = isSameRow ? sourceRow : newLayout.rows.find(r => r.rowId === overRowId);

        if (!sourceRow || !destRow) return currentLayout;
        
        const sourceColIndex = sourceRow.columns.findIndex(c => c.colId === active.id);
        if (sourceColIndex === -1) return currentLayout;
        
        if (isSameRow) {
            const overColIndex = destRow.columns.findIndex(c => c.colId === over.id);
            if (overColIndex !== -1) {
                destRow.columns = arrayMove(destRow.columns, sourceColIndex, overColIndex);
            }
        } else {
            if (destRow.columns.length >= MAX_COLS_PER_ROW) {
                toast({ title: "Ligne pleine", description: `Vous ne pouvez pas ajouter plus de ${MAX_COLS_PER_ROW} modules par ligne.`, variant: "destructive" });
                return currentLayout;
            }

            const [movedModule] = sourceRow.columns.splice(sourceColIndex, 1);

            let destColIndex = -1;
            if (localDropIndicatorInfo && localDropIndicatorInfo.rowId === destRow.rowId) {
                const targetColIndex = destRow.columns.findIndex(c => c.colId === localDropIndicatorInfo.colId);
                if (targetColIndex !== -1) {
                    destColIndex = localDropIndicatorInfo.side === 'left' ? targetColIndex : targetColIndex + 1;
                }
            } else if (overData?.type === 'module') {
                destColIndex = destRow.columns.findIndex(c => c.colId === over.id);
            }

            if (destColIndex !== -1) {
                destRow.columns.splice(destColIndex, 0, movedModule);
            } else {
                destRow.columns.push(movedModule);
            }
        }

        newLayout.rows = newLayout.rows.filter(row => row.columns.length > 0);
        newLayout.rows.forEach(normalizeRow);
        return newLayout;
    });
  };

  return {
    layout,
    setLayout,
    loading,
    error,
    fetchData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    activeItem,
    dropIndicatorInfo,
    forbiddenRowId
  };
};

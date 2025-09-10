import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

export const BuilderCatalogContext = createContext();

export const useBuilderCatalog = () => {
    const context = useContext(BuilderCatalogContext);
    if (!context) {
        throw new Error('useBuilderCatalog must be used within a BuilderCatalogProvider');
    }
    return context;
};

export const BuilderCatalogProvider = ({ children }) => {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        // Ne pas remettre loading à true ici pour éviter les flashs sur les re-fetchs de realtime
        // Charger le catalogue complet pour le builder, sans filtrage par cours "live"
        const { data, error } = await supabase
            .from('builder_families')
            .select(`
                *,
                subfamilies:builder_subfamilies (
                    *,
                    modules:builder_modules (
                        *
                    )
                )
            `)
            .order('display_order', { ascending: true })
            .order('display_order', { foreignTable: 'subfamilies', ascending: true })
            .order('display_order', { foreignTable: 'subfamilies.modules', ascending: true });

        if (error) {
            toast({ title: "Erreur", description: `Impossible de charger le catalogue: ${error.message}`, variant: "destructive" });
            setCatalog([]);
        } else {
            // Normaliser les structures imbriquées pour garantir des tableaux
            const normalized = (data || []).map(f => ({
                ...f,
                subfamilies: (f.subfamilies || []).map(sf => ({
                    ...sf,
                    modules: (sf.modules || [])
                }))
            }));
            setCatalog(normalized);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData();
        const channel = supabase
          .channel('builder-catalog-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'builder_families' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'builder_subfamilies' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'builder_modules' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchData)
          .subscribe();
    
        return () => {
          supabase.removeChannel(channel);
        };
    }, [fetchData]);
    
    const optimisticUpdate = (updateFunction) => {
        setCatalog(currentCatalog => {
            try {
                return updateFunction(currentCatalog);
            } catch (e) {
                console.error("Optimistic update failed:", e);
                return currentCatalog; // Revert on error
            }
        });
    };

    const updateFamilyName = async (id, name) => {
        optimisticUpdate(current => current.map(f => f.id === id ? { ...f, name } : f));
        const { error } = await supabase.from('builder_families').update({ name }).eq('id', id);
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const updateSubfamilyName = async (id, name) => {
        optimisticUpdate(current => current.map(f => ({
            ...f,
            subfamilies: f.subfamilies.map(sf => sf.id === id ? { ...sf, name } : sf)
        })));
        const { error } = await supabase.from('builder_subfamilies').update({ name }).eq('id', id);
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const updateModule = async (id, updates) => {
        optimisticUpdate(current => current.map(f => ({
            ...f,
            subfamilies: f.subfamilies.map(sf => ({
                ...sf,
                modules: sf.modules.map(m => m.id === id ? { ...m, ...updates } : m)
            }))
        })));
        const { error } = await supabase.from('builder_modules').update(updates).eq('id', id);
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const addFamily = async (name) => {
        const newFamily = { id: uuidv4(), name, icon: 'Package', display_order: catalog.length, subfamilies: [], created_at: new Date().toISOString() };
        optimisticUpdate(current => [...current, newFamily]);
        const { error } = await supabase.from('builder_families').insert({ id: newFamily.id, name, display_order: newFamily.display_order, icon: newFamily.icon });
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const addSubfamily = async (family_id, name) => {
        let newSubfamily;
        optimisticUpdate(current => current.map(f => {
            if (f.id === family_id) {
                const display_order = f.subfamilies.length;
                newSubfamily = { id: uuidv4(), name, family_id, display_order, modules: [], created_at: new Date().toISOString() };
                return { ...f, subfamilies: [...f.subfamilies, newSubfamily] };
            }
            return f;
        }));
        if (newSubfamily) {
            const { error } = await supabase.from('builder_subfamilies').insert({ id: newSubfamily.id, name, family_id, display_order: newSubfamily.display_order });
            if (error) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
                fetchData();
            }
        }
    };

    const addModule = async (subfamily_id, moduleData) => {
        let newModule;
        optimisticUpdate(current => current.map(f => ({
            ...f,
            subfamilies: f.subfamilies.map(sf => {
                if (sf.id === subfamily_id) {
                    const display_order = sf.modules.length;
                    newModule = { ...moduleData, id: uuidv4(), subfamily_id, display_order, created_at: new Date().toISOString() };
                    return { ...sf, modules: [...sf.modules, newModule] };
                }
                return sf;
            })
        })));
        if (newModule) {
            const { error } = await supabase.from('builder_modules').insert({ ...newModule, title: moduleData.title, description: moduleData.description, duration: moduleData.duration });
            if (error) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
                fetchData();
            }
        }
    };

    const deleteFamily = async (id) => {
        optimisticUpdate(current => current.filter(f => f.id !== id));
        const { error } = await supabase.rpc('delete_family_cascade', { p_family_id: id });
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const deleteSubfamily = async (id) => {
        optimisticUpdate(current => current.map(f => ({
            ...f,
            subfamilies: f.subfamilies.filter(sf => sf.id !== id)
        })));
        const { error } = await supabase.rpc('delete_subfamily_cascade', { p_subfamily_id: id });
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const deleteModule = async (id) => {
        optimisticUpdate(current => current.map(f => ({
            ...f,
            subfamilies: f.subfamilies.map(sf => ({
                ...sf,
                modules: sf.modules.filter(m => m.id !== id)
            }))
        })));
        const { error } = await supabase.from('builder_modules').delete().eq('id', id);
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            fetchData();
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;
        const activeModuleId = active.data.current?.id; // provided by useSortable on ModuleItemDraggable
        
        let newCatalog = JSON.parse(JSON.stringify(catalog));
        let itemsToUpdate = [];
        let table;

        // Diagnostics
        try {
            console.debug('[BuilderCatalog] DnD handleDragEnd', {
                activeId: String(active.id),
                overId: String(over.id),
                activeType,
                overType,
                activeData: active.data?.current,
                overData: over.data?.current,
            });
        } catch {}

        if (activeType === 'family') {
            const activeFamilyId = active.data.current?.id || String(active.id).replace(/^family-/, '');
            const overFamilyId = over.data.current?.id || String(over.id).replace(/^family-/, '');
            const oldIndex = newCatalog.findIndex(f => f.id === activeFamilyId);
            const newIndex = newCatalog.findIndex(f => f.id === overFamilyId);
            newCatalog = arrayMove(newCatalog, oldIndex, newIndex);
            itemsToUpdate = newCatalog.map((item, index) => ({
                id: item.id,
                name: item.name,
                icon: item.icon,
                created_at: item.created_at,
                display_order: index 
            }));
            table = 'builder_families';
        } else if (activeType === 'subfamily') {
            const parentFamilyId = active.data.current?.parent;
            const activeSubfamilyId = active.data.current?.id || String(active.id).replace(/^subfamily-/, '');
            const overSubfamilyId = over.data.current?.id || String(over.id).replace(/^subfamily-/, '');
            const parentFamily = newCatalog.find(f => f.id === parentFamilyId);
            if (!parentFamily) return;
            const oldIndex = parentFamily.subfamilies.findIndex(sf => sf.id === activeSubfamilyId);
            const newIndex = parentFamily.subfamilies.findIndex(sf => sf.id === overSubfamilyId);
            const movedSubfamilies = arrayMove(parentFamily.subfamilies, oldIndex, newIndex);
            newCatalog = newCatalog.map(f => f.id === parentFamilyId ? { ...f, subfamilies: movedSubfamilies } : f);
            itemsToUpdate = movedSubfamilies.map((item, index) => ({
                id: item.id,
                name: item.name,
                family_id: item.family_id,
                created_at: item.created_at,
                display_order: index 
            }));
            table = 'builder_subfamilies';
        } else if (activeType === 'module') {
            // Trouver le module source et sa sous-famille
            const sourceSubfamilyId = active.data.current?.parent;
            let sourceFamily, sourceSubfamily, moduleToMove;
            
            for(const f of newCatalog) {
                const sf = f.subfamilies.find(s => s.id === sourceSubfamilyId);
                if (sf) {
                    sourceFamily = f;
                    sourceSubfamily = sf;
                    moduleToMove = sf.modules.find(m => m.id === activeModuleId);
                    break;
                }
            }
            
            if (!sourceSubfamily || !moduleToMove) return;
            
            // Déterminer la destination
            let targetSubfamilyId;
            
            if (overType === 'subfamily') {
                // Drop sur une sous-famille (formation) - récupère l'id depuis les données du droppable
                targetSubfamilyId = over.data.current?.subfamilyId || over.data.current?.id || String(over.id).replace(/^subfamily(?:-header-drop|-drop|-)/, '');
            } else if (overType === 'module') {
                // Drop sur un module - on peut récupérer directement la sous-famille via les données du sortable
                targetSubfamilyId = over.data.current?.parent;
                // Fallback sécurisé si jamais non présent
                if (!targetSubfamilyId) {
                    for(const f of newCatalog) {
                        for(const sf of f.subfamilies) {
                            if (sf.modules.find(m => m.id === (over.data.current?.id))) {
                                targetSubfamilyId = sf.id;
                                break;
                            }
                        }
                        if (targetSubfamilyId) break;
                    }
                }
            } else {
                return; // Drop invalide
            }
            
            if (!targetSubfamilyId) return;
            
            // Trouver la sous-famille de destination
            let targetFamily, targetSubfamily;
            for(const f of newCatalog) {
                const sf = f.subfamilies.find(s => s.id === targetSubfamilyId);
                if (sf) {
                    targetFamily = f;
                    targetSubfamily = sf;
                    break;
                }
            }
            
            if (!targetSubfamily) return;
            
            if (sourceSubfamilyId === targetSubfamilyId) {
                // Réorganisation dans la même sous-famille
                const oldIndex = sourceSubfamily.modules.findIndex(m => m.id === activeModuleId);
                let newIndex;
                
                if (overType === 'module') {
                    newIndex = sourceSubfamily.modules.findIndex(m => m.id === (over.data.current?.id));
                } else {
                    newIndex = sourceSubfamily.modules.length - 1;
                }
                
                const movedModules = arrayMove(sourceSubfamily.modules, oldIndex, newIndex);
                newCatalog = newCatalog.map(f => f.id === sourceFamily.id ? { 
                    ...f, 
                    subfamilies: f.subfamilies.map(sf => sf.id === sourceSubfamilyId ? { 
                        ...sf, 
                        modules: movedModules 
                    } : sf) 
                } : f);
                
                itemsToUpdate = movedModules.map((item, index) => ({ 
                    ...item, 
                    display_order: index 
                }));
            } else {
                // Déplacement entre sous-familles différentes
                const updatedModuleToMove = {
                    ...moduleToMove,
                    subfamily_id: targetSubfamilyId,
                    // display_order will be recomputed by mapping below
                };
                
                // Retirer le module de la source
                const updatedSourceModules = sourceSubfamily.modules.filter(m => m.id !== activeModuleId);
                
                // Ajouter le module à la destination
                // Déterminer l'index d'insertion si on dépose sur un module spécifique dans la destination
                let insertIndex = targetSubfamily.modules.length;
                if (overType === 'module' && targetSubfamilyId === (over.data.current?.parent || targetSubfamilyId)) {
                    const overModuleId = over.data.current?.id;
                    const idx = targetSubfamily.modules.findIndex(m => m.id === overModuleId);
                    if (idx >= 0) insertIndex = idx; // insérer à la position du module ciblé
                }
                const updatedTargetModules = [
                    ...targetSubfamily.modules.slice(0, insertIndex),
                    updatedModuleToMove,
                    ...targetSubfamily.modules.slice(insertIndex)
                ];
                
                // Mettre à jour le catalogue (gérer le cas où source et cible sont dans la même famille)
                newCatalog = newCatalog.map(f => {
                    if (f.id === sourceFamily.id && f.id === targetFamily.id) {
                        // Même famille: mettre à jour les deux sous-familles dans le même passage
                        return {
                            ...f,
                            subfamilies: f.subfamilies.map(sf => {
                                if (sf.id === sourceSubfamilyId) {
                                    return { ...sf, modules: updatedSourceModules.map((m, idx) => ({ ...m, display_order: idx })) };
                                }
                                if (sf.id === targetSubfamilyId) {
                                    return { ...sf, modules: updatedTargetModules.map((m, idx) => ({ ...m, display_order: idx })) };
                                }
                                return sf;
                            })
                        };
                    }
                    if (f.id === sourceFamily.id) {
                        return {
                            ...f,
                            subfamilies: f.subfamilies.map(sf => 
                                sf.id === sourceSubfamilyId ? {
                                    ...sf,
                                    modules: updatedSourceModules.map((m, idx) => ({ ...m, display_order: idx }))
                                } : sf
                            )
                        };
                    }
                    if (f.id === targetFamily.id) {
                        return {
                            ...f,
                            subfamilies: f.subfamilies.map(sf => 
                                sf.id === targetSubfamilyId ? {
                                    ...sf,
                                    modules: updatedTargetModules.map((m, idx) => ({ ...m, display_order: idx }))
                                } : sf
                            )
                        };
                    }
                    return f;
                });
                
                // Préparer les mises à jour pour la base de données
                itemsToUpdate = [
                    ...updatedSourceModules.map((m, idx) => ({ ...m, display_order: idx })),
                    ...updatedTargetModules.map((m, idx) => ({ ...m, display_order: idx }))
                ];
            }
            
            table = 'builder_modules';
        }

        setCatalog(newCatalog);
        if (itemsToUpdate.length > 0 && table) {
            const { error } = await supabase.from(table).upsert(itemsToUpdate, { onConflict: 'id' });
            if (error) {
                toast({ title: "Erreur de réorganisation", description: error.message, variant: "destructive" });
                fetchData(); // Revert on error
            }
        }
    };

    const value = {
        catalog,
        loading,
        handleDragEnd,
        addFamily,
        addSubfamily,
        addModule,
        updateFamilyName,
        updateSubfamilyName,
        updateModule,
        deleteFamily,
        deleteSubfamily,
        deleteModule,
    };

    return (
        <BuilderCatalogContext.Provider value={value}>
            {children}
        </BuilderCatalogContext.Provider>
    );
};
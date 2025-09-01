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
            setCatalog(data || []);
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

        const activeId = active.id.toString().split('-')[1];
        const overId = over.id.toString().split('-')[1];
        const type = active.data.current.type;
        
        let newCatalog = JSON.parse(JSON.stringify(catalog));
        let itemsToUpdate = [];
        let table;

        if (type === 'family') {
            const oldIndex = newCatalog.findIndex(f => f.id === activeId);
            const newIndex = newCatalog.findIndex(f => f.id === overId);
            newCatalog = arrayMove(newCatalog, oldIndex, newIndex);
            itemsToUpdate = newCatalog.map((item, index) => ({
                id: item.id,
                name: item.name,
                icon: item.icon,
                created_at: item.created_at,
                display_order: index 
            }));
            table = 'builder_families';
        } else if (type === 'subfamily') {
            const parentFamilyId = active.data.current.parent;
            const parentFamily = newCatalog.find(f => f.id === parentFamilyId);
            if (!parentFamily) return;
            const oldIndex = parentFamily.subfamilies.findIndex(sf => sf.id === activeId);
            const newIndex = parentFamily.subfamilies.findIndex(sf => sf.id === overId);
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
        } else if (type === 'module') {
            const parentSubfamilyId = active.data.current.parent;
            let parentFamily;
            let parentSubfamily;
            for(const f of newCatalog) {
                const sf = f.subfamilies.find(s => s.id === parentSubfamilyId);
                if (sf) {
                    parentFamily = f;
                    parentSubfamily = sf;
                    break;
                }
            }
            if(!parentSubfamily || !parentFamily) return;

            const oldIndex = parentSubfamily.modules.findIndex(m => m.id === activeId);
            const newIndex = parentSubfamily.modules.findIndex(m => m.id === overId);
            const movedModules = arrayMove(parentSubfamily.modules, oldIndex, newIndex);
            newCatalog = newCatalog.map(f => f.id === parentFamily.id ? { ...f, subfamilies: f.subfamilies.map(sf => sf.id === parentSubfamilyId ? { ...sf, modules: movedModules } : sf) } : f);
            itemsToUpdate = movedModules.map((item, index) => ({ ...item, display_order: index }));
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
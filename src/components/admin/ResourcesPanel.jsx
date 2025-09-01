import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { FolderKanban, Plus, Loader2 } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import NewResourceDialog from './NewResourceDialog';
    import ResourcesToolbar from './resources/ResourcesToolbar';
    import ResourcesTable from './resources/ResourcesTable';

    const ResourcesPanel = () => {
      const { toast } = useToast();
      const [resources, setResources] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState("");
      const [isDialogOpen, setIsDialogOpen] = useState(false);
      const [editingResource, setEditingResource] = useState(null);
      const [selectedRows, setSelectedRows] = useState([]);
      const [groupBy, setGroupBy] = useState('none');
      const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });
      
      const [relatedData, setRelatedData] = useState({ users: [], families: [], subfamilies: [] });

      const fetchRelatedData = useCallback(async () => {
        const [usersRes, familiesRes, subfamiliesRes] = await Promise.all([
            supabase.from('profiles').select('id, first_name, last_name, user_types!inner(type_name)').in('user_types.type_name', ['client', 'vip']),
            supabase.from('builder_families').select('id, name'),
            supabase.from('builder_subfamilies').select('id, name, family_id')
        ]);

        setRelatedData({
            users: usersRes.data || [],
            families: familiesRes.data || [],
            subfamilies: subfamiliesRes.data || []
        });
      }, []);

      const fetchResources = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('resources')
          .select(`
            id, name, type, format, url, content, created_at, updated_at, family_id, subfamily_id, file_path,
            family:builder_families(name),
            subfamily:builder_subfamilies(name),
            assignments:resource_assignments(user_id)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching resources:", error);
          toast({ title: "Erreur", description: "Impossible de charger les ressources.", variant: "destructive" });
        } else {
          const formattedData = data.map(r => ({ ...r, assigned_user_ids: r.assignments.map(a => a.user_id) }));
          setResources(formattedData);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        fetchResources();
        fetchRelatedData();

        const channel = supabase.channel('public:resources_panel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, fetchResources)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, fetchResources)
          .subscribe();

        return () => supabase.removeChannel(channel);
      }, [fetchResources, fetchRelatedData]);


      const handleOpenDialog = (resource = null) => {
        setEditingResource(resource);
        setIsDialogOpen(true);
      };

      const handleRequestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
      };

      const sortedAndFilteredResources = useMemo(() => {
        let sortableItems = [...resources].filter(resource =>
          resource.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        if (groupBy === 'none') {
            return [{ groupTitle: null, resources: sortableItems }];
        }

        const groups = sortableItems.reduce((acc, resource) => {
            let key = 'Non groupé';
            if (groupBy === 'type') key = resource.type || 'Sans type';
            if (groupBy === 'format') key = resource.format || 'Sans format';
            if (groupBy === 'family') key = resource.family?.name || 'Sans famille';
            
            if (!acc[key]) acc[key] = [];
            acc[key].push(resource);
            return acc;
        }, {});

        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([groupTitle, resources]) => ({
            groupTitle,
            resources
        }));
      }, [resources, searchTerm, sortConfig, groupBy]);
      

      return (
        <div className="space-y-4">
          <NewResourceDialog 
            isOpen={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
            onResourceAdded={fetchResources} 
            existingResource={editingResource}
            relatedData={relatedData}
          />
          
          <header className="mb-6">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Ressources</h1>
                <p className="text-muted-foreground text-sm">Éléments concrets et actionnables comme des documents, guides ou procédures.</p>
              </div>
            </div>
          </header>

          <ResourcesToolbar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            onAddNew={() => handleOpenDialog(null)}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            allResourceIds={resources.map(r => r.id)}
            resources={resources}
            users={relatedData.users}
            onDeleteSuccess={fetchResources}
          />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
             <ResourcesTable
                groupedResources={sortedAndFilteredResources}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                relatedData={relatedData}
                onEdit={handleOpenDialog}
                onUpdateSuccess={fetchResources}
                sortConfig={sortConfig}
                requestSort={handleRequestSort}
             />
          )}
        </div>
      );
    };

    export default ResourcesPanel;
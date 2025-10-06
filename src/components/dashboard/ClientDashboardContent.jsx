import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

import FormationsPanel from '@/components/dashboard/modules/FormationsPanel';
import TicketsPanel from '@/components/dashboard/modules/TicketsPanel';
import ResourcesPanel from '@/components/dashboard/modules/ResourcesPanel';
import BuilderPanel from '@/components/dashboard/modules/BuilderPanel';
import KanbanPanel from '@/components/kanban/KanbanPanel';
import KPIPanel from '@/components/dashboard/modules/KPIPanel';
import HomepagePanel from '@/components/dashboard/modules/HomepagePanel';
import TrainingPreferencesPanel from '@/components/dashboard/modules/TrainingPreferencesPanel';
import AssistantPanel from '@/components/dashboard/modules/AssistantPanel';
import BlueprintsPanel from '@/components/dashboard/modules/BlueprintsPanel';

const componentMap = {
  client_formations: FormationsPanel,
  client_tickets: TicketsPanel,
  client_resources: ResourcesPanel,
  client_builder: BuilderPanel,
  client_kanban_formations: KanbanPanel,
  client_kpi: KPIPanel,
  client_homepage: HomepagePanel,
  client_training_preferences: TrainingPreferencesPanel,
  client_ai_assistant: AssistantPanel,
  client_blueprints: BlueprintsPanel,
};

const normalizeRow = (row) => {
  if (!row || !row.columns || row.columns.length === 0) return row;
  
  // Special case: if row contains client_formations, add client_kpi next to it
  const hasFormations = row.columns.some(col => col.moduleKey === 'client_formations');
  if (hasFormations && !row.columns.some(col => col.moduleKey === 'client_kpi')) {
    const newRow = JSON.parse(JSON.stringify(row));
    // Add KPI panel to the same row
    newRow.columns.push({
      colId: uuidv4(),
      moduleKey: 'client_kpi',
      span: 5 // Will be set below
    });
    
    // Set spans: formations gets 7, KPI gets 5
    newRow.columns.forEach((col) => {
      if (col.moduleKey === 'client_formations') {
        col.span = 7;
      } else if (col.moduleKey === 'client_kpi') {
        col.span = 5;
      }
    });
    
    return newRow;
  }
  
  const count = row.columns.length;
  
  // Default spans for all modules
  const getSpansForModules = (columns) => {
    const spans = { 1: [12], 2: [6, 6], 3: [4, 4, 4] };
    return spans[count] || spans[3];
  };
  
  const currentSpans = getSpansForModules(row.columns);
  
  const newRow = JSON.parse(JSON.stringify(row));
  newRow.columns.forEach((col, index) => {
    col.span = Array.isArray(currentSpans) ? currentSpans[index] : currentSpans;
  });
  return newRow;
};

const useDashboardData = () => {
  const { hasPermission, loading: permissionsLoading, error: permissionsError, refreshPermissions, ready: permissionsReady } = usePermissions();
  const [modules, setModules] = React.useState([]);
  const [layout, setLayout] = React.useState({ rows: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const hasLoadedOnceRef = React.useRef(false);

  const fetchData = React.useCallback(async () => {
    // Do not fetch until permissions are truly ready
    if (permissionsLoading || !permissionsReady) {
        // Keep previous UI; only block on the very first load
        if (!hasLoadedOnceRef.current) setLoading(true);
        return;
    }
    
    setError(null);
    if (!hasLoadedOnceRef.current) setLoading(true);

    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules_registry')
        .select('*')
        .eq('is_active', true);

      if (modulesError) throw modulesError;

      const visibleModules = modulesData.filter(module => hasPermission(module.required_permission));
      setModules(visibleModules);

      const { data: layoutData, error: layoutError } = await supabase.functions.invoke('get-dashboard-layout', {
        body: JSON.stringify({ owner_type: 'default', owner_id: null }),
      });

      if (layoutError) throw layoutError;

      if (layoutData.layout_json && layoutData.layout_json.rows.length > 0) {
        setLayout(layoutData.layout_json);
      } else {
        const defaultRows = visibleModules.map(m => ({
          rowId: uuidv4(),
          columns: [{
            colId: uuidv4(),
            span: m.default_layout?.span || 12,
            moduleKey: m.module_key
          }]
        }));
        setLayout({ rows: defaultRows });
      }
    } catch (err) {
      console.error("Error fetching dashboard config:", err);
      setError("Impossible de charger la configuration du tableau de bord.");
    } finally {
      setLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [hasPermission, permissionsLoading, permissionsReady]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleRetry = () => {
    if (permissionsError) {
      refreshPermissions();
    }
    fetchData();
  };

  return {
    modules,
    layout,
    loading: (!hasLoadedOnceRef.current)
      ? (loading || permissionsLoading || !permissionsReady)
      : loading,
    error: error || permissionsError,
    handleRetry,
  };
};

const ClientDashboardContent = () => {
  const { user } = useAuth();
  const { modules, layout, loading, error, handleRetry } = useDashboardData();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRetry}>Réessayer</Button>
      </div>
    );
  }
  
  const visibleModuleKeys = modules.map(m => m.module_key);

  return (
    <div className="min-h-screen">
      <div className="pt-10 pb-8">
        <div className="w-full px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-5">
            <h1 className="text-xl md:text-2xl font-semibold mb-1.5">
              Bonjour <span className="gradient-text">{user.profile?.pseudo || user.profile?.first_name || user.email.split('@')[0]}</span> !
            </h1>
            <p className="text-[0.7rem] md:text-sm text-foreground/80 leading-snug">Bienvenue sur votre espace de formation! Si vous avez une question, n'hésitez pas à me contacter, cette plateforme est nouvelle pour nous tous!</p>
          </motion.div>
          
          <div className="space-y-4">
            {layout.rows.map(row => {
              let visibleCols = row.columns.filter(col => visibleModuleKeys.includes(col.moduleKey));
              if (visibleCols.length === 0) return null;

              const normalizedRow = normalizeRow({ ...row, columns: visibleCols });

              return (
                <div key={normalizedRow.rowId} className="grid grid-cols-12 gap-4">
                  {normalizedRow.columns.map(col => {
                    const Component = componentMap[col.moduleKey];
                    if (!Component) return null;
                    
                    const style = { gridColumn: `span ${col.span} / span ${col.span}` };

                    return (
                      <div key={col.colId} style={style}>
                        <Component />
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {visibleModuleKeys.length === 0 && (
              <div className="lg:col-span-2 text-center py-16 bg-card/50 glass-effect rounded-lg">
                <h3 className="text-lg font-semibold">Aucun module n'est disponible pour le moment.</h3>
                <p className="text-muted-foreground mt-2">Revenez plus tard ou contactez un administrateur si vous pensez que c'est une erreur.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardContent;


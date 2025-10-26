import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

import UserManagementPanel from '@/components/admin/UserManagementPanel';
import TicketManagementPanel from '@/components/admin/TicketManagementPanel';
import ResourcesPanel from '@/components/admin/ResourcesPanel';
import RolesPermissionsPage from '@/pages/admin/RolesPermissionsPage';
import ModuleManagerPage from '@/pages/admin/ModuleManagerPage';
import ComponentManagerPage from '@/pages/admin/ComponentManagerPage';
import DashboardEditorPage from '@/pages/admin/DashboardEditorPage';
import StaticPageManagementPanel from '@/components/admin/StaticPageManagementPanel';
import HomeBlockManagementPanel from '@/components/admin/HomeBlockManagementPanel';
import ActionLogsPanel from '@/components/admin/ActionLogsPanel';
import ThemePanel from '@/components/admin/ThemePanel';
import TabsEditorPage from '@/pages/admin/TabsEditorPage';
import FormationManagementPanel from '@/components/admin/FormationManagementPanel';
import UserFormationSubmissionsPanel from '@/components/admin/UserFormationSubmissionsPanel';
import OnboardingQuestionsAdminPanel from '@/components/admin/formation-live/OnboardingQuestionsAdminPanel';
import AssistantSettingsPanel from '@/components/admin/AssistantSettingsPanel';
import BlueprintPaletteAdminPage from '@/pages/admin/BlueprintPaletteAdminPage';
import EmailNotificationsPanel from '@/components/admin/EmailNotificationsPanel';
import TestimonialsManagementPanel from '@/components/admin/TestimonialsManagementPanel';

const adminComponentMap = {
  UserManagementPanel,
  TicketManagementPanel,
  ResourcesPanel,
  RolesPermissionsPage,
  ModuleManagerPage,
  ComponentManagerPage,
  DashboardEditorPage,
  StaticPageManagementPanel,
  HomeBlockManagementPanel,
  ActionLogsPanel,
  ThemePanel,
  TabsEditorPage,
  FormationManagementPanel,
  CourseManagementPanel: FormationManagementPanel, // Rétrocompatibilité
  UserFormationSubmissionsPanel,
  OnboardingQuestionsAdminPanel,
  BlueprintPaletteAdminPage,
  EmailNotificationsPanel,
  TestimonialsManagementPanel,
};

const KpiCard = ({ title, value, subValue, loading }) => (
  <div className="bg-card/50 glass-effect p-3 rounded-lg text-center">
    <p className="text-sm text-muted-foreground">{title}</p>
    <div className="text-2xl font-bold gradient-text h-8 flex items-center justify-center">
      {loading ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : value}
    </div>
    {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
  </div>
);

const AnimatedTabTrigger = ({ value, children, hasNewActivity, onClick }) => (
  <TabsTrigger value={value} onClick={onClick} className="relative flex items-center gap-2 text-sm py-2 data-[state=active]:bg-card data-[state=active]:shadow-md">
    {hasNewActivity && (
      <motion.div 
        className="absolute -top-1 -right-1"
        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </motion.div>
    )}
    {children}
  </TabsTrigger>
);

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.pathname || '/admin/dashboard';
  const { toast } = useToast();
  const userName = user?.profile?.first_name || 'Admin';
  const missingComponentsRef = useRef(new Set());
  const hasLoadedOnceRef = useRef(false);

  const [kpis, setKpis] = useState({ open_tickets: 0, created_parcours: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

  const [newActivity, setNewActivity] = useState({ tickets: false, builder: false });
  const [tabsConfig, setTabsConfig] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [modulesConfig, setModulesConfig] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  const handleTicketPanelData = useCallback((ticketsData) => {
    if (!Array.isArray(ticketsData)) return;
    const hasNewClientReply = ticketsData.some(ticket => ticket.hasNewClientReply);
    setNewActivity((prev) => {
      if (prev.tickets === hasNewClientReply) return prev;
      return { ...prev, tickets: hasNewClientReply };
    });
  }, []);

  const checkTicketActivity = useCallback(async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, user_id, admin_last_viewed_at');
      if (ticketsError || !Array.isArray(ticketsData) || ticketsData.length === 0) {
        if (ticketsError) console.error('Error fetching tickets for activity check:', ticketsError);
        setNewActivity(prev => ({ ...prev, tickets: false }));
        return;
      }

      const ticketIds = ticketsData.map(ticket => ticket.id).filter(Boolean);
      if (ticketIds.length === 0) {
        setNewActivity(prev => ({ ...prev, tickets: false }));
        return;
      }

      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('ticket_id, user_id, created_at, profile:user_id(user_types(type_name))')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false });

      if (repliesError) {
        console.error('Error fetching replies for activity check:', repliesError);
        return;
      }

      if (!Array.isArray(repliesData) || repliesData.length === 0) {
        setNewActivity(prev => ({ ...prev, tickets: false }));
        return;
      }

      const latestReplyByTicket = new Map();
      for (const reply of repliesData) {
        if (!latestReplyByTicket.has(reply.ticket_id)) {
          latestReplyByTicket.set(reply.ticket_id, reply);
        }
      }

      const clientRoles = new Set(['client', 'vip']);
      const hasNewClientReply = ticketsData.some(ticket => {
        const latestReply = latestReplyByTicket.get(ticket.id);
        if (!latestReply) return false;
        const authorRole = latestReply.profile?.user_types?.type_name || null;
        const replyAuthorId = latestReply.user_id || null;
        const isClientAuthor = clientRoles.has(authorRole) || (replyAuthorId && replyAuthorId === ticket.user_id);
        if (!isClientAuthor) return false;
        if (!ticket.admin_last_viewed_at) return true;
        try {
          return new Date(latestReply.created_at) > new Date(ticket.admin_last_viewed_at);
        } catch (_) {
          return false;
        }
      });

      setNewActivity(prev => ({ ...prev, tickets: hasNewClientReply }));
    } catch (err) {
      console.error('Unexpected error while checking ticket activity:', err);
    }
  }, []);


  const DEFAULT_TAB_ID = 'user_submissions';
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') || DEFAULT_TAB_ID;

  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    const { data, error } = await supabase.rpc('get_admin_dashboard_kpis');
    if (error) {
      console.error('Error fetching KPIs:', error);
      toast({ title: "Erreur KPIs", description: "Impossible de charger les indicateurs de performance.", variant: "destructive" });
    } else {
      setKpis({
        open_tickets: data?.open_tickets ?? 0,
        created_parcours: data?.created_parcours ?? 0,
      });
    }
    setKpiLoading(false);
  }, [toast]);

  const fetchAdminConfig = useCallback(async () => {
    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) {
      setTabsLoading(true);
      setModulesLoading(true);
    }
    const tabsPromise = supabase.from('admin_dashboard_tabs').select('*').order('row_order').order('col_order');
    const modulesPromise = supabase.from('admin_modules_registry').select('*').eq('is_active', true);

    const [tabsResponse, modulesResponse] = await Promise.all([tabsPromise, modulesPromise]);

    if (tabsResponse.error) {
      toast({ title: "Erreur de configuration", description: "Impossible de charger la disposition des onglets.", variant: "destructive" });
    } else {
      setTabsConfig(tabsResponse.data || []);
    }

    if (modulesResponse.error) {
      toast({ title: "Erreur de configuration", description: "Impossible de charger la configuration des modules.", variant: "destructive" });
    } else {
      setModulesConfig(modulesResponse.data || []);
    }
    
    setTabsLoading(false);
    setModulesLoading(false);
    hasLoadedOnceRef.current = true;
  }, [toast]);

  useEffect(() => {
    fetchAdminConfig();
    fetchKpis();

    const kpiChannel = supabase.channel('admin-dashboard-kpis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchKpis())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses', filter: 'course_type=eq.custom' }, () => fetchKpis())
      .subscribe();
      
    const configChannel = supabase.channel('admin-dashboard-config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_dashboard_tabs' }, fetchAdminConfig)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_modules_registry' }, fetchAdminConfig)
      .subscribe();

    return () => {
        supabase.removeChannel(kpiChannel);
        supabase.removeChannel(configChannel);
    };
  }, [fetchAdminConfig, fetchKpis]);

  useEffect(() => {
    checkTicketActivity();
    const ticketActivityChannel = supabase
      .channel('admin-dashboard-ticket-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_replies' }, checkTicketActivity)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, checkTicketActivity)
      .subscribe();

    return () => {
      supabase.removeChannel(ticketActivityChannel);
    };
  }, [checkTicketActivity]);

  
  // Exclude legacy tabs and unwanted tabs
  const accessibleTabs = tabsConfig
    .filter(tab => hasPermission(tab.permission_required))
    .filter(tab => tab.label !== 'Formations')
    .filter(tab => tab.label !== 'Builder Settings')
    .filter(tab => tab.label !== 'Parcours')
    .filter(tab => {
      const label = (tab.label || '').toLowerCase();
      return label !== 'live chat' && label !== 'chat';
    });

  const assistantTabIds = useMemo(() => {
    if (!Array.isArray(accessibleTabs)) return [];
    const idMatches = ['ia_assistant', 'ia-assistant', 'iassistant', 'assistant', 'assistant_ia', 'assistantia'];
    return Array.from(new Set(accessibleTabs
      .filter((tab) => {
        const label = (tab?.label || '').toLowerCase();
        const tabId = (tab?.tab_id || '').toLowerCase();
        if (label === 'iassistant' || label === 'assistant ia' || label === 'assistant') return true;
        return idMatches.includes(tabId);
      })
      .map((tab) => tab.tab_id)
      .filter(Boolean)));
  }, [accessibleTabs]);

  const tabsByRow = accessibleTabs.reduce((acc, tab) => {
    const row = tab.row_order || 0;
    if (!acc[row]) acc[row] = [];
    acc[row].push(tab);
    return acc;
  }, {});

  const userType = user?.profile?.user_type;
  const permsLoadingEffective = userType === 'owner' ? false : permissionsLoading;

  const determineInitialTab = useCallback(() => {
    if (permsLoadingEffective || tabsLoading) return DEFAULT_TAB_ID;
    if (tabFromUrl && accessibleTabs.some(t => t.tab_id === tabFromUrl)) return tabFromUrl;
    if (accessibleTabs.length > 0) return accessibleTabs[0].tab_id;
    return DEFAULT_TAB_ID;
  }, [tabFromUrl, accessibleTabs, permsLoadingEffective, tabsLoading]);

  const [activeTab, setActiveTab] = useState(determineInitialTab);
  
  useEffect(() => {
    if(!permsLoadingEffective && !tabsLoading) {
        const initialTab = determineInitialTab();
        setActiveTab(initialTab);
        if (initialTab) {
          const sp = new URLSearchParams(location.search);
          if (sp.get('tab') !== initialTab) {
            sp.set('tab', initialTab);
            navigate(`/admin/dashboard?${sp.toString()}`, { replace: true });
          }
        }
    }
  }, [permsLoadingEffective, tabsLoading, determineInitialTab, navigate, location.search]);
  
  const handleTabChange = (value) => {
    setActiveTab(value);
    const sp = new URLSearchParams(location.search);
    sp.set('tab', value);
    navigate(`/admin/dashboard?${sp.toString()}`, { replace: true });
    if (value === 'tickets') setNewActivity(prev => ({ ...prev, tickets: false }));
    if (value === 'builder-parcours') setNewActivity(prev => ({ ...prev, builder: false }));
  };

  const renderTabContent = (tabId) => {
    if (assistantTabIds.includes(tabId)) {
      return (
        <div className="space-y-6">
          <AssistantSettingsPanel />
        </div>
      );
    }

    if (modulesLoading) {
      return <div className="flex justify-center items-center h-64"><Icons.Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const tabModules = modulesConfig
      .filter(m => m.tab_id === tabId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    if (tabModules.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <Icons.LayoutDashboard className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold">Aucun module configuré</h2>
          <p>Aucun module n'est actuellement assigné à cet onglet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {tabModules.map(module => {
          const Component = adminComponentMap[module.component_name];
          if (!Component) {
            if (!missingComponentsRef.current.has(module.component_name)) {
              console.warn(`Composant non trouvé : ${module.component_name}`);
              missingComponentsRef.current.add(module.component_name);
            }
            return null;
          }
          const componentProps = {};
          if (module.component_name === 'TicketManagementPanel') {
            componentProps.onDataChange = handleTicketPanelData;
          }
          return <Component key={module.module_key} {...componentProps} />;
        })}
      </div>
    );
  };

  if (permsLoadingEffective || tabsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Icons.Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Tableau de Bord Administrateur | Notion Pro</title>
        <meta name="description" content="Gérez les utilisateurs, les formations et les tickets depuis le tableau de bord administrateur." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full px-4 pt-24 sm:pt-28">
          <div className="space-y-8">
            <header>
              <h1 className="text-xl font-bold tracking-tight">
                Espace Administrateur (<span className="gradient-text">{userName}</span>)
              </h1>
            </header>

            <Tabs value={activeTab || DEFAULT_TAB_ID} onValueChange={handleTabChange} className="w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex flex-col gap-2 w-full">
                  {Object.keys(tabsByRow).sort().map(rowKey => (
                    <TabsList key={rowKey} className="bg-muted/50 dark:bg-muted/20 p-1 h-auto rounded-lg flex-wrap justify-start">
                      {(tabsByRow[rowKey] || []).sort((a, b) => (a.col_order || 0) - (b.col_order || 0)).map(tab => {
                        const Icon = Icons[tab.icon] || Icons.HelpCircle;
                        const isTicketsTab = tab.tab_id === 'tickets' || tab.label?.toLowerCase() === 'tickets';
                        const activityKey = isTicketsTab ? 'tickets' : tab.tab_id;
                        const shouldHighlight = !!newActivity[activityKey];
                        const iconClassName = `h-4 w-4 ${shouldHighlight ? 'text-emerald-400 animate-[pulse_1.4s_ease-in-out_infinite]' : ''}`;
                        const labelClassName = shouldHighlight ? 'text-emerald-100 dark:text-emerald-300' : '';
                        return (
                          <AnimatedTabTrigger 
                            key={tab.tab_id} 
                            value={tab.tab_id}
                            hasNewActivity={shouldHighlight}
                            onClick={() => handleTabChange(tab.tab_id)}
                          >
                            {tab.label !== 'Formation Live' && <Icon className={iconClassName} />}
                            <div className={`flex items-center gap-2 ${labelClassName}`}>
                              {tab.label === 'Formation Live' && (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              )}
                              {tab.label}
                            </div>
                          </AnimatedTabTrigger>
                        );
                      })}
                    </TabsList>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto self-start sm:self-center">
                   <KpiCard title="Tickets Ouverts" value={`${kpis.open_tickets}`} loading={kpiLoading} />
                   <KpiCard title="Parcours Crees" value={`${kpis.created_parcours}`} loading={kpiLoading} />
                </div>
              </div>
              
              {accessibleTabs.map(tab => (
                <TabsContent key={tab.tab_id} value={tab.tab_id}>
                  {renderTabContent(tab.tab_id)}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboardPage;






// Ceci est un petit commentaire 
import React from 'react';
    import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
    import { QueryClientProvider } from '@tanstack/react-query';
    import { queryClient } from '@/lib/reactQueryClient';

    import { Toaster } from '@/components/ui/toaster';
    import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
    import { useTheme } from '@/contexts/ThemeContext';
    import { ChatProvider } from '@/contexts/ChatContext';
    import { PermissionsProvider } from '@/contexts/PermissionsContext';
    import { ComponentStateProvider } from '@/contexts/ComponentStateContext';
    import { ResourceCreationProvider } from '@/contexts/ResourceCreationContext';
    import { BuilderCatalogProvider } from '@/contexts/BuilderCatalogContext';
    import Footer from '@/components/Footer';
    import Navigation from '@/components/Navigation';
    import HomePage from '@/pages/HomePage';
    import FormationsPage from '@/pages/FormationsPage';
    import FormationDetailPage from '@/pages/FormationDetailPage';
    import AboutPage from '@/pages/AboutPage';
    import LoginPage from '@/pages/LoginPage';
    import RegisterPage from '@/pages/RegisterPage';
    import ConfirmationPage from '@/pages/ConfirmationPage';
    import DashboardPage from '@/pages/DashboardPage';
    import CreateTicketPage from '@/pages/CreateTicketPage';
    import TicketDetailPage from '@/pages/TicketDetailPage';
    import AdminPage from '@/pages/AdminPage';
    import SystemsPage from '@/pages/SystemsPage';
    import ContactPage from '@/pages/ContactPage';
    import AssistancePage from '@/pages/AssistancePage';
    import ProtectedRoute from '@/components/ProtectedRoute';
    import PublicOnlyRoute from '@/components/PublicOnlyRoute';
    import AdminDashboardPage from '@/pages/AdminDashboardPage';
    import ManageTicketPage from '@/pages/admin/ManageTicketPage';
    import ManageUserPage from '@/pages/admin/ManageUserPage';
    import CreateUserPage from '@/pages/admin/CreateUserPage';
    import DemoDashboardPage from '@/pages/DemoDashboardPage';
    import TicketsPage from '@/pages/TicketsPage';
    import FormationBuilderPage from '@/pages/FormationBuilderPage';
    import ClientAccountPage from '@/pages/ClientAccountPage';
    import ParcoursDetailPage from '@/pages/ParcoursDetailPage';
    import ForumPage from '@/pages/ForumPage';
    import TrainingPreferencesPage from '@/pages/TrainingPreferencesPage';
    import TrainingPreferencesWizardPage from '@/pages/TrainingPreferencesWizardPage';
    import ForumTopicPage from '@/pages/ForumTopicPage';
    import CreateForumTopicPage from '@/pages/CreateForumTopicPage';
    import ChatPage from '@/pages/ChatPage';
    import { TooltipProvider } from '@/components/ui/tooltip';
    import DashboardEditorPage from '@/pages/admin/DashboardEditorPage';
    import ClientOnlyRoute from '@/components/ClientOnlyRoute';
    import EditStaticPage from '@/pages/admin/EditStaticPage';
    import { Loader2 } from 'lucide-react';
    import ModuleManagerPage from '@/pages/admin/ModuleManagerPage';
    import TabsEditorPage from '@/pages/admin/TabsEditorPage';
    import AdminLiveChatPage from '@/pages/admin/AdminLiveChatPage';

    const MainLayout = ({ children }) => {
      const location = useLocation();
      const { user } = useAuth();
      const { loading: themeLoading } = useTheme();

      const isBuilderPage = location.pathname.startsWith('/formation-builder');
      const isDashboardRoute = location.pathname.startsWith('/dashboard');
      const isAdminRoute = location.pathname.startsWith('/admin');
      const isDemoDashboard = location.pathname.startsWith('/demo-dashboard');
      const isChatPage = location.pathname.startsWith('/chat');
      const isFormationDetailPage = location.pathname.match(/^\/formation\/[^/]+$/);
      const isHomePage = location.pathname === '/';
      
      const showFooter = !isAdminRoute && !isDashboardRoute && !isBuilderPage && !isDemoDashboard && !isChatPage && !isFormationDetailPage && !isHomePage;

      // Do not block rendering on theme loading; a fallback theme is applied immediately.

      return (
        <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
          <main className="flex-grow">
            {children}
          </main>
          {showFooter && <Footer />}
        </div>
      );
    };

    const AppRoutes = () => (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/formations" element={<FormationsPage />} />
        <Route path="/formation/:id" element={<FormationDetailPage />} />
        <Route path="/qui-suis-je" element={<AboutPage />} />
        <Route path="/mes-systemes" element={<SystemsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/assistance-a-distance" element={<AssistancePage />} />
        <Route path="/demo-dashboard" element={<DemoDashboardPage />} />
        <Route path="/forum" element={<ProtectedRoute requiredPermission="forum:view"><ForumPage /></ProtectedRoute>} />
        <Route path="/forum/topic/new" element={<ProtectedRoute requiredPermission="forum:create_topic"><CreateForumTopicPage /></ProtectedRoute>} />
        <Route path="/forum/topic/:id" element={<ProtectedRoute requiredPermission="forum:view"><ForumTopicPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/connexion" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/inscription" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        
        <Route path="/mes-preferences-formation" element={<ClientOnlyRoute><TrainingPreferencesPage /></ClientOnlyRoute>} />
        <Route path="/mes-preferences-formation/editer" element={<ClientOnlyRoute><TrainingPreferencesWizardPage /></ClientOnlyRoute>} />
        <Route path="/dashboard" element={<ClientOnlyRoute><DashboardPage /></ClientOnlyRoute>} />
        <Route path="/compte-client" element={<ClientOnlyRoute><ClientAccountPage /></ClientOnlyRoute>} />
        <Route path="/chat" element={<ProtectedRoute requiredPermission="chat:view"><ChatPage /></ProtectedRoute>} />
        <Route path="/nouveau-ticket" element={<ProtectedRoute requiredPermission="tickets:create"><CreateTicketPage /></ProtectedRoute>} />
        <Route path="/ticket/:id" element={<ProtectedRoute requiredPermission="tickets:view_own"><TicketDetailPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute requiredPermission="tickets:view_own"><TicketsPage /></ProtectedRoute>} />
        
        <Route path="/formation-builder" element={<ProtectedRoute requiredPermission="builder:view"><FormationBuilderPage /></ProtectedRoute>} />
        <Route path="/formation-builder/:id" element={<ProtectedRoute requiredPermission="builder:edit_own_parcours"><FormationBuilderPage /></ProtectedRoute>} />
        <Route path="/parcours/:id" element={<ProtectedRoute requiredPermission="builder:view"><ParcoursDetailPage /></ProtectedRoute>} />
        
        <Route path="/admin/dashboard" element={<ProtectedRoute requiredPermission="admin:access_dashboard"><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/dashboard-editor" element={<ProtectedRoute requiredPermission="admin:manage_dashboard_layout"><DashboardEditorPage /></ProtectedRoute>} />
        <Route path="/admin/ticket/:id" element={<ProtectedRoute requiredPermission="tickets:view_all"><ManageTicketPage /></ProtectedRoute>} />
        <Route path="/admin/user/new" element={<ProtectedRoute requiredPermission="users:edit_any"><CreateUserPage /></ProtectedRoute>} />
        <Route path="/admin/user/:id" element={<ProtectedRoute requiredPermission="users:edit_any"><ManageUserPage /></ProtectedRoute>} />
        <Route path="/admin/live-chat" element={<ProtectedRoute requiredPermission="chat:view_all"><AdminLiveChatPage /></ProtectedRoute>} />
        <Route path="/admin/pages/new" element={<ProtectedRoute requiredPermission="admin:manage_static_pages"><EditStaticPage /></ProtectedRoute>} />
        <Route path="/admin/pages/:id" element={<ProtectedRoute requiredPermission="admin:manage_static_pages"><EditStaticPage /></ProtectedRoute>} />
        <Route path="/admin/modules" element={<ProtectedRoute requiredPermission="admin:manage_modules"><ModuleManagerPage /></ProtectedRoute>} />
        <Route path="/admin/tabs-editor" element={<ProtectedRoute requiredPermission="admin:manage_tabs_layout"><TabsEditorPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    );

    const AppContent = () => {
      const location = useLocation();
      const isBuilderPage = location.pathname.startsWith('/formation-builder');

      return (
        <MainLayout>
          {!isBuilderPage && <Navigation />}
          <AppRoutes />
        </MainLayout>
      );
    };

    function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <PermissionsProvider>
                <ComponentStateProvider>
                    <ChatProvider>
                      <ResourceCreationProvider>
                        <BuilderCatalogProvider>
                          <TooltipProvider>
                            <Toaster />
                            <AppContent />
                          </TooltipProvider>
                        </BuilderCatalogProvider>
                      </ResourceCreationProvider>
                    </ChatProvider>
                </ComponentStateProvider>
              </PermissionsProvider>
            </AuthProvider>
          </Router>
        </QueryClientProvider>
      );
    }

    export default App;

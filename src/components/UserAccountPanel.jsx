import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAccountPanel } from '@/hooks/useAccountPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ManagedComponent from '@/components/ManagedComponent';
import {
  User,
  GraduationCap,
  Ticket,
  LogOut,
  LayoutDashboard,
  Wrench,
  BookOpen,
  ChevronRight,
  BellRing,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserAccountPanel = () => {
  const { user, signOut } = useAuth();
  const { hasPermission, ready: permissionsReady } = usePermissions();
  const navigate = useNavigate();
  const {
    isOpen,
    triggerRef,
    panelRef,
    togglePanel,
    closePanel
  } = useAccountPanel();

  if (!user) return null;

  const userType = user?.profile?.user_type;
  const isAdmin = user && ['admin', 'prof', 'owner'].includes(userType);
  const notificationCount = 5; // Placeholder until notifications are wired

  const handleSignOut = async () => {
    await signOut();
    closePanel();
    navigate('/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    closePanel();
  };

  const getUserInitials = () => {
    const name = user.profile?.full_name || user.email || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getFirstName = () => {
    // Priorité 1: utiliser first_name s'il existe
    if (user.profile?.first_name && user.profile.first_name.trim()) {
      return user.profile.first_name.trim() + ',';
    }

    // Priorité 2: extraire le prénom du full_name s'il existe
    if (user.profile?.full_name && user.profile.full_name.trim()) {
      const firstWord = user.profile.full_name.trim().split(' ')[0];
      return firstWord + ',';
    }

    // Priorité 3: extraire un nom lisible de l'email
    if (user.email) {
      const emailPart = user.email.split('@')[0];
      // Séparer les mots par des caractères non-alphabétiques
      const words = emailPart.split(/[^a-zA-Z]+/).filter(word => word.length > 0);
      if (words.length > 0) {
        // Capitaliser le premier mot
        return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() + ',';
      }
    }

    // Fallback final
    return 'Utilisateur,';
  };

  // Resolve dashboard destination at click time to avoid stale readiness
  const resolveDashboardPath = () => {
    if (!isAdmin) return '/dashboard';
    // Owners always have access to admin dashboard
    if (userType === 'owner') return '/admin/dashboard';
    // If permissions not ready on public pages (e.g., homepage), optimistically try admin dashboard.
    // ProtectedRoute will redirect to '/dashboard' if permission is actually missing.
    if (!permissionsReady) return '/admin/dashboard';
    return hasPermission('admin:access_dashboard') ? '/admin/dashboard' : '/dashboard';
  };

const menuSections = [
  {
    id: 'primary',
    title: null,
    items: [
        {
          id: 'dashboard',
          title: 'Mon Dashboard',
          icon: LayoutDashboard,
          action: () => handleNavigation(resolveDashboardPath())
        },
        {
          id: 'blueprints',
          title: 'MyNotion',
          icon: BookOpen,
          componentKey: 'nav:client_blueprints',
          action: () => handleNavigation('/blueprint-builder')
        },
        {
          id: 'builder',
          title: 'Formation Builder',
          icon: Wrench,
          componentKey: 'nav:client_builder',
          action: () => handleNavigation('/formation-builder')
        }
      ]
    },
  {
    id: 'personal',
    title: null,
      items: [
        {
          id: 'profile',
          title: 'Données personnelles',
          icon: User,
          action: () => handleNavigation('/compte-client')
        },
        {
          id: 'training_preferences',
          title: 'Préférences de formation',
          icon: GraduationCap,
          action: () => handleNavigation('/mes-preferences-formation')
        },
        {
          id: 'communication_preferences',
          title: 'Préférences de communication',
          icon: BellRing,
          action: () => handleNavigation('/preferences-communication')
        },
        {
          id: 'tickets',
          title: 'Mes tickets',
          icon: Ticket,
          action: () => handleNavigation('/mes-tickets'),
          counter: notificationCount
        }
      ]
    }
  ];

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const content = (
      <Button
        type="button"
        variant="ghost"
        className="account-menu__item group"
        onClick={item.action}
      >
        <span className="account-menu__item-aura" aria-hidden="true" />
        <span className="account-menu__icon">
          <Icon className="h-5 w-5" />
        </span>
        <span className="account-menu__text">
          <span className="account-menu__title">{item.title}</span>
        </span>
        <span className="account-menu__meta">
          {item.tag && (
            <Badge variant="secondary" className="account-menu__pill">
              {item.tag}
            </Badge>
          )}
          {typeof item.counter === 'number' && item.counter > 0 && (
            <span className="account-menu__counter" aria-hidden="true">
              {item.counter}
            </span>
          )}
          <ChevronRight className="account-menu__chevron" />
        </span>
      </Button>
    );

    if (item.componentKey) {
      return (
        <ManagedComponent
          key={item.id}
          componentKey={item.componentKey}
          disabledTooltip={item.disabledTooltip}
        >
          {content}
        </ManagedComponent>
      );
    }

    return (
      <React.Fragment key={item.id}>
        {content}
      </React.Fragment>
    );
  };

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        className="account-menu-trigger group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-purple-500/40 bg-gradient-to-br from-purple-500/20 via-purple-500/5 to-purple-900/50 p-0 text-white shadow-[0_15px_30px_-18px_rgba(124,58,237,0.85)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-18px_rgba(168,85,247,0.95)] focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-[2px] focus-visible:ring-offset-background"
        onClick={togglePanel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Ouvrir le menu du compte"
      >
        <span className="account-menu-trigger__aura" aria-hidden="true" />
        <span className="account-menu-trigger__glow" aria-hidden="true" />
        <span className="relative z-10">
          <Avatar className="h-8 w-8 rounded-full border border-white/15 bg-black/40 shadow-inner shadow-purple-500/40">
            <AvatarImage
              src={user.profile?.avatar_url}
              alt={user.profile?.full_name || 'Avatar utilisateur'}
            />
            <AvatarFallback className="text-sm font-medium text-slate-100">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </span>
        {notificationCount > 0 && (
          <span className="account-menu-trigger__badge">
            {notificationCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={closePanel}
            />

            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', duration: 0.2 }}
              className="account-menu-panel absolute right-0 top-full z-50 mt-1.5 w-[256px] max-w-sm overflow-hidden rounded-b-[1.2rem] rounded-t-none border border-transparent p-[1px] shadow-[0_18px_70px_-38px_rgba(124,58,237,0.85)] backdrop-blur-xl max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:right-auto max-sm:mt-2.5 max-sm:w-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-panel-title"
            >
              <span className="account-menu-panel__glow account-menu-panel__glow--top" aria-hidden="true" />
              <span className="account-menu-panel__glow account-menu-panel__glow--bottom" aria-hidden="true" />
              <div className="account-menu-panel__surface">
                <header className="account-menu__header">
                  <div className="account-menu__hero">
                    <Avatar className="h-9 w-9 rounded-xl border border-white/20 bg-black/40 shadow-lg shadow-purple-900/50 max-sm:h-7 max-sm:w-7">
                      <AvatarImage
                        src={user.profile?.avatar_url}
                        alt={user.profile?.full_name || 'Avatar utilisateur'}
                      />
                      <AvatarFallback className="text-sm font-medium text-slate-100">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="account-menu__hero-text">
                      <h2 id="account-panel-title" className="account-menu__headline">
                        Bonjour {getFirstName()}
                      </h2>
                      {isAdmin && (
                        <span className="account-menu__chip account-menu__chip--accent">
                          Accès admin
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                <div className="account-menu__sections">
                  {menuSections.map((section) => (
                    <section key={section.id} className="account-menu__section">
                      {(section.title || section.subtitle) && (
                        <div className="account-menu__section-header">
                          <div>
                            {section.title && (
                              <h3 className="account-menu__section-title">{section.title}</h3>
                            )}
                            {section.subtitle && (
                              <p className="account-menu__section-description">
                                {section.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="account-menu__section-list">
                        {section.items.map(renderMenuItem)}
                      </div>
                    </section>
                  ))}
                </div>

                <Separator className="account-menu__separator" />

                <div className="account-menu__footer">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="account-menu__signout"
                    onClick={handleSignOut}
                  >
                    <span className="account-menu__signout-aura" aria-hidden="true" />
                    <LogOut className="h-3 w-3" />
                    <span>Déconnexion</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserAccountPanel;

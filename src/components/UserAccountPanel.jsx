import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAccountPanel } from '@/hooks/useAccountPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  GraduationCap, 
  Ticket, 
  LogOut, 
  MessageCircle,
  LayoutDashboard
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

  const isAdmin = user && ['admin', 'prof', 'owner'].includes(user.profile?.user_type);

  // Determine safest dashboard path to avoid redirect loops for admins without access
  const dashboardPath = isAdmin
    ? ((permissionsReady && hasPermission('admin:access_dashboard')) ? '/admin/dashboard' : '/')
    : '/dashboard';

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Mon Dashboard',
      icon: LayoutDashboard,
      action: () => handleNavigation(dashboardPath)
    },
    {
      id: 'profile',
      title: 'Données personnelles',
      icon: User,
      action: () => handleNavigation('/compte-client')
    },
    {
      id: 'training_preferences',
      title: 'Preferences de formation',
      icon: GraduationCap,
      action: () => handleNavigation('/mes-preferences-formation')
    },
    {
      id: 'tickets',
      title: 'Mes tickets',
      icon: Ticket,
      badge: '2',
      badgeVariant: 'destructive',
      action: () => handleNavigation('/tickets')
    },
    {
      id: 'chat',
      title: 'Chat Live',
      icon: MessageCircle,
      action: () => handleNavigation('/chat')
    }
  ];

  return (
    <div className="relative">
      {/* Avatar Trigger */}
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={togglePanel}
        className="relative p-1 rounded-full hover:bg-accent transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Ouvrir le menu de compte"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={user.profile?.avatar_url} 
            alt={user.profile?.full_name || 'Avatar utilisateur'} 
          />
          <AvatarFallback className="text-xs font-medium">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        {/* Indicateur de notifications */}
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-[10px] text-white font-bold">5</span>
        </div>
      </Button>

      {/* Panel Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={closePanel}
            />
            
            {/* Account Panel - Responsive */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-80 bg-background border rounded-lg shadow-lg z-50 overflow-hidden
                         max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:right-auto max-sm:w-auto max-sm:mt-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-panel-title"
            >
              {/* Header */}
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 max-sm:h-10 max-sm:w-10">
                    <AvatarImage 
                      src={user.profile?.avatar_url} 
                      alt={user.profile?.full_name || 'Avatar utilisateur'} 
                    />
                    <AvatarFallback className="text-sm font-medium max-sm:text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 id="account-panel-title" className="font-semibold text-lg max-sm:text-base">
                      Bonjour {getFirstName()}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start p-4 h-auto rounded-none hover:bg-muted/50 max-sm:p-3"
                      onClick={item.action}
                    >
                      <div className="flex items-center space-x-3 max-sm:space-x-2 w-full">
                        <Icon className="h-5 w-5 text-muted-foreground max-sm:h-4 max-sm:w-4" />
                        <span className="font-medium text-sm max-sm:text-xs flex-1 text-left">{item.title}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.badgeVariant || 'default'} 
                            className="text-xs max-sm:text-[10px] max-sm:px-1.5 max-sm:py-0.5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Separator */}
              <Separator />

              {/* Footer - Déconnexion */}
              <div className="p-3 max-sm:p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50 max-sm:text-xs transition-colors"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2 max-sm:h-3.5 max-sm:w-3.5" />
                  Déconnexion
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserAccountPanel;

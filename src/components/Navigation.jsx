import React from 'react';

import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Home, Wrench, Bot } from 'lucide-react';
import { useAssistant } from '@/contexts/AssistantContext';
import ManagedComponent from '@/components/ManagedComponent';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import UserAccountPanel from '@/components/UserAccountPanel';

const NavItem = ({ to, children, componentKey, onClick }) => {
  const commonClasses = "relative text-sm font-medium transition-colors hover:text-primary";
  const activeClasses = "text-primary";

  const navLinkContent = (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `${commonClasses} ${isActive ? activeClasses : 'text-foreground/80'}`}
    >
      {children}
      <motion.div
        className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-primary"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </NavLink>
  );

  if (componentKey) {
    return (
      <ManagedComponent componentKey={componentKey}>
        {navLinkContent}
      </ManagedComponent>
    );
  }
  return navLinkContent;
};

const Navigation = () => {
  const { user, signOut, authReady } = useAuth();
  const { toggleDrawer: toggleAssistantDrawer, callState: assistantCallState } = useAssistant();
  const assistantActive = ['connected', 'connecting', 'reconnecting'].includes(assistantCallState);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminDashboard = location.pathname.startsWith('/admin/dashboard');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isAdmin = user && ['admin', 'prof', 'owner'].includes(user.profile?.user_type);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm"
    >
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/48f2550880a00112af4a099100dbb649.png" alt="Yann Vallotton Logo" className="h-[55.016px]" />
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          {isAdminDashboard ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Retour à la Home Page
            </Button>
          ) : (
            <>
              <NavItem to="/formations" componentKey="nav:formations">Formations</NavItem>
              <NavItem to="/mes-systemes" componentKey="nav:life_os">Life OS system</NavItem>
              <NavItem to="/qui-suis-je" componentKey="nav:about_me">Qui suis-je ?</NavItem>
            </>
          )}
        </nav>
        <div className="flex items-center space-x-2">

          <ManagedComponent componentKey="nav:client_forum">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="default" onClick={() => navigate('/forum')}>
                  Forum
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Forum</p></TooltipContent>
            </Tooltip>
          </ManagedComponent>
        
          <ManagedComponent componentKey="nav:client_builder" disabledTooltip="Connectez-vous pour utiliser le builder">
             <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => navigate('/formation-builder')}>
                  <Wrench className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Builder</p></TooltipContent>
            </Tooltip>
          </ManagedComponent>

          <ManagedComponent componentKey="nav:assistant">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={assistantActive ? 'default' : 'ghost'}
                  size="default"
                  onClick={toggleAssistantDrawer}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Assistant
                  {assistantActive && <span className="ml-2 inline-flex h-2 w-2 items-center justify-center"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden /></span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Ouvrir l'assistant IA</p></TooltipContent>
            </Tooltip>
          </ManagedComponent>

          <ManagedComponent componentKey="nav:dashboard" disabledTooltip="Connectez-vous pour voir votre tableau de bord">
            <UserAccountPanel />
          </ManagedComponent>

          {/* Afficher Connexion uniquement quand l'auth est prête et qu'aucun user n'est présent */}
          {authReady && !user && (
            <ManagedComponent componentKey="nav:login">
              <Button variant="outline" size="sm" onClick={() => navigate('/connexion')}>
                Connexion
              </Button>
            </ManagedComponent>
          )}

          {/* Afficher Inscription uniquement quand l'auth est prête et qu'aucun user n'est présent */}
          {authReady && !user && (
            <ManagedComponent componentKey="nav:register">
              <Button size="sm" onClick={() => navigate('/inscription')}>
                Inscription
              </Button>
            </ManagedComponent>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Navigation;

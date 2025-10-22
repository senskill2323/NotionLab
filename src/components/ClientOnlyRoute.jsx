import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Loader2 } from 'lucide-react';

const ClientOnlyRoute = ({ children }) => {
  const { user, authReady, sessionReady } = useAuth();
  const location = useLocation();
  const { hasPermission, loading: permsLoading, ready: permsReady } = usePermissions();

  // Only gate by auth readiness to avoid transient loading flips on tab changes
  if (!authReady || !sessionReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  const isClient = user.profile?.user_type === 'client' || user.profile?.user_type === 'vip';
  const isAdmin = user.profile?.user_type === 'admin' || user.profile?.user_type === 'owner' || user.profile?.user_type === 'prof';

  // New rule: block access for users who are not yet activated
  if (user?.profile?.status && user.profile.status !== 'active') {
    return <Navigate to="/connexion" state={{ from: location, reason: 'pending_validation' }} replace />;
  }
  
  if (isAdmin) {
    // Wait for permissions readiness to avoid incorrect redirects on tab focus events
    if (!permsReady && permsLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    return hasPermission('admin:access_dashboard')
      ? <Navigate to="/admin/dashboard" replace />
      : <Navigate to="/" replace />;
  }

  if (isClient) {
    return children;
  }

  return <Navigate to="/connexion" replace />;
};

export default ClientOnlyRoute;

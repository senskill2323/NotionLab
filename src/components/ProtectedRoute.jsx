import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedUserTypes, requiredPermission }) => {
  const { user, loading: authLoading, authReady } = useAuth();
  const { hasPermission, loading: permsLoading, ready: permsReady, usingFallback } = usePermissions();
  const location = useLocation();

  // Avoid blocking on permissions loading for routes that can self-guard safely
  const isNonBlockingPermRoute = (perm) => {
    if (!perm) return false;
    return perm === 'tickets:view_own' || perm.startsWith('builder:');
  };

  // Consider permissions 'loading' until they are ready for blocking routes
  const effectivePermsLoading =
    permsLoading ||
    (!permsReady && !isNonBlockingPermRoute(requiredPermission)) ||
    (usingFallback && !isNonBlockingPermRoute(requiredPermission));
  const isLoading = authLoading || !authReady || effectivePermsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }
  
  if (allowedUserTypes && !allowedUserTypes.includes(user.profile.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (requiredPermission && !effectivePermsLoading && !hasPermission(requiredPermission)) {
    // Allow specific non-blocking routes to render and self-guard (RLS + component logic)
    if (isNonBlockingPermRoute(requiredPermission)) {
      return children;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
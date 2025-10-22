import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedUserTypes, requiredPermission }) => {
  const { user, authReady, sessionReady } = useAuth();
  const { hasPermission, loading: permsLoading, ready: permsReady, usingFallback } = usePermissions();
  const location = useLocation();

  // Avoid blocking on permissions loading for routes that can self-guard safely
  const isNonBlockingPermRoute = (perm) => {
    if (!perm) return false;
    // Allow UI to render for admin routes; RLS will still enforce data-level security
    if (perm.startsWith('admin:')) return true;
    return perm === 'tickets:view_own' || perm.startsWith('builder:') || perm.startsWith('client_blueprints:');
  };

  // Consider permissions 'loading' until they are ready for blocking routes
  const userType = user?.profile?.user_type;
  const nonBlocking = isNonBlockingPermRoute(requiredPermission);
  const effectivePermsLoading =
    userType === 'owner'
      ? false
      : (
          (!nonBlocking && permsLoading) ||
          (!permsReady && !nonBlocking) ||
          (usingFallback && !nonBlocking)
        );
  // Only gate by authReady (true means auth is settled). Avoid using transient 'loading' state
  // which can flip during tab visibility changes, causing infinite spinners.
  const isLoading = !authReady || !sessionReady || effectivePermsLoading;

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
  
  // New rule: block access for users who are not yet activated
  if (user?.profile?.status && user.profile.status !== 'active') {
    return <Navigate to="/connexion" state={{ from: location, reason: 'pending_validation' }} replace />;
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


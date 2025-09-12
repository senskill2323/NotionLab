import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedUserTypes, requiredPermission }) => {
  const { user, loading: authLoading, authReady } = useAuth();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const location = useLocation();

  const isLoading = authLoading || permsLoading || !authReady;

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
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // For specific cases like builder, a user might not have perms *yet* but can access the page.
    // The component itself will handle the logic. This prevents redirection loops.
    if (requiredPermission.startsWith('builder:')) {
        return children;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
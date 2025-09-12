import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Loader2 } from 'lucide-react';

const ClientOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { hasPermission, loading: permsLoading } = usePermissions();

  if (loading || permsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  const isClient = user.profile?.user_type === 'client' || user.profile?.user_type === 'vip' || user.profile?.user_type === 'guest';
  const isAdmin = user.profile?.user_type === 'admin' || user.profile?.user_type === 'owner' || user.profile?.user_type === 'prof';
  
  if (isAdmin) {
    // Redirect to admin dashboard only if the user has access; otherwise avoid loop by sending to home
    if (hasPermission('admin:access_dashboard')) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (isClient) {
    return children;
  }

  return <Navigate to="/connexion" replace />;
};

export default ClientOnlyRoute;
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  // After loading is complete, if a user object (with profile) exists, redirect.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // If no user, render the public page (e.g., Login).
  return children;
};

export default PublicOnlyRoute;
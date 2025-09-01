import React from 'react';
    import { Helmet } from 'react-helmet';
    import { Loader2 } from 'lucide-react';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import AdminDashboardContent from '@/components/dashboard/AdminDashboardContent';
    import ClientDashboardContent from '@/components/dashboard/ClientDashboardContent';

    const DashboardPage = () => {
      const { user, loading } = useAuth();

      if (loading) {
        return (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
      }

      const isAdmin = user?.profile?.user_type === 'owner' || user?.profile?.user_type === 'admin' || user?.profile?.user_type === 'prof';

      return (
        <>
          <Helmet>
            <title>{isAdmin ? 'Tableau de bord Admin' : 'Mon Tableau de bord'} | NotionLab</title>
            <meta name="description" content={`Tableau de bord ${isAdmin ? 'administrateur' : 'client'}.`} />
          </Helmet>
          {isAdmin ? <AdminDashboardContent /> : <ClientDashboardContent />}
        </>
      );
    };

    export default DashboardPage;
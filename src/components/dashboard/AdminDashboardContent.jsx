import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Ticket, GitBranch, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon, link, color }) => {
  const Icon = icon;
  return (
    <Card className="glass-effect overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-muted-foreground ${color}`} />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        <Link to={link} className="text-xs text-muted-foreground flex items-center hover:text-primary transition-colors">
          Voir plus <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
};

const AdminDashboardContent = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({
    open_tickets: 0,
    created_parcours: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchKpis = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_admin_dashboard_kpis');
    if (error) {
      console.error('Error fetching KPIs:', error);
    } else {
      setKpis({
        open_tickets: data?.open_tickets ?? 0,
        created_parcours: data?.created_parcours ?? 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKpis();

    const ticketsChannel = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchKpis)
      .subscribe();


    const parcoursChannel = supabase
      .channel('public:courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchKpis)
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(parcoursChannel);
    };
  }, [fetchKpis]);

  return (
    <div className="min-h-screen">
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Tableau de bord Administrateur
            </h1>
            <p className="text-base text-foreground/80">Vue d'ensemble de l'activité de la plateforme.</p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                title="Tickets Ouverts"
                value={kpis.open_tickets}
                icon={Ticket}
                link="/admin/dashboard?tab=tickets"
                color="text-orange-500"
              />
              <StatCard
                title="Parcours Crees"
                value={kpis.created_parcours}
                icon={GitBranch}
                link="/admin/dashboard?tab=formations"
                color="text-green-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const StatCard = ({ icon: Icon, value, label, color }) => (
  <motion.div
    className="bg-card/50 glass-effect p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg"
    whileHover={{ y: -5, scale: 1.05 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className={`mb-4 rounded-full p-4`} style={{ backgroundColor: color, color: '#fff' }}>
      <Icon className="h-8 w-8" />
    </div>
    <p className="text-4xl font-bold gradient-text">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </motion.div>
);

const StatsSection = ({ content = {} }) => {
  const [stats, setStats] = useState({ users: 0, tickets: 0, formations: 0 });
  const title = content.title || "La force d'une communauté";
  const subtitle = content.subtitle || "Rejoignez une communauté grandissante et profitez d'un catalogue de formations riche et évolutif.";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_stats');

        if (error) throw error;

        setStats({
          users: data.users || 0,
          tickets: data.tickets || 0,
          formations: data.formations || 0
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StatCard icon={Users} value={stats.users} label="Utilisateurs" color="#6366F1" />
            <StatCard icon={MessageSquare} value={stats.tickets} label="Tickets Ouverts" color="#EC4899" />
            <StatCard icon={BookOpen} value={stats.formations} label="Formations" color="#10B981" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
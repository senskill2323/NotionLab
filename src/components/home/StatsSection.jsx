import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const DEFAULT_SOLID = '#0f172a';
const DEFAULT_GRADIENT =
  'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #111827 100%)';

const StatCard = ({ icon: Icon, value, label, color, labelClass }) => (
  <motion.div
    className="bg-card/50 glass-effect p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg"
    whileHover={{ y: -5, scale: 1.05 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div
      className="mb-4 rounded-full p-4"
      style={{ backgroundColor: color, color: '#fff' }}
    >
      <Icon className="h-8 w-8" />
    </div>
    <p className="text-4xl font-bold gradient-text">{value}</p>
    <p className={labelClass}>{label}</p>
  </motion.div>
);

const StatsSection = ({ content = {} }) => {
  const [stats, setStats] = useState({ users: 0, tickets: 0, formations: 0 });
  const title =
    content.title ||
    "La force d'une communaute";
  const subtitle =
    content.subtitle ||
    "Rejoignez une communaute grandissante et profitez d'un catalogue de formations riche et evolutif.";

  const useDefaultBackground = content.useDefaultBackground !== false;
  const backgroundMode =
    content.backgroundMode === 'solid' || content.backgroundMode === 'gradient'
      ? content.backgroundMode
      : 'gradient';
  const solidColor =
    content.solidColor ||
    content.backgroundColor ||
    DEFAULT_SOLID;
  const gradient =
    content.gradient ||
    content.backgroundGradient ||
    DEFAULT_GRADIENT;

  const sectionStyle = useDefaultBackground
    ? undefined
    : backgroundMode === 'solid'
      ? {
          backgroundColor: solidColor || DEFAULT_SOLID,
          backgroundImage: 'none',
        }
      : {
          background: gradient,
          backgroundColor: solidColor || DEFAULT_SOLID,
        };

  const sectionClassNames = ['py-16', 'sm:py-24', 'transition-colors'];
  if (useDefaultBackground) {
    sectionClassNames.push('bg-background');
  } else {
    sectionClassNames.push('text-white');
  }

  const subtitleClassName = useDefaultBackground
    ? 'mt-4 text-lg text-muted-foreground max-w-2xl mx-auto'
    : 'mt-4 text-lg text-white/80 max-w-2xl mx-auto';

  const labelClassName = useDefaultBackground
    ? 'text-sm text-muted-foreground mt-1'
    : 'text-sm text-white/80 mt-1';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_stats');

        if (error) throw error;

        setStats({
          users: data?.users || 0,
          tickets: data?.tickets || 0,
          formations: data?.formations || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <section
      className={sectionClassNames.join(' ')}
      style={sectionStyle}
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-12 text-center">
            <h2
              className={`text-3xl md:text-4xl font-bold ${
                useDefaultBackground ? '' : 'text-white'
              }`}
            >
              {title}
            </h2>
            <p className={subtitleClassName}>{subtitle}</p>
          </div>

          <div className="grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3 mx-auto">
            <StatCard
              icon={Users}
              value={stats.users}
              label="Utilisateurs"
              color="#6366F1"
              labelClass={labelClassName}
            />
            <StatCard
              icon={MessageSquare}
              value={stats.tickets}
              label="Tickets Ouverts"
              color="#EC4899"
              labelClass={labelClassName}
            />
            <StatCard
              icon={BookOpen}
              value={stats.formations}
              label="Formations"
              color="#10B981"
              labelClass={labelClassName}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;



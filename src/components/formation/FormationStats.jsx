import React from 'react';
import { Clock, BookOpen, Target } from 'lucide-react';

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="text-center glass-effect rounded-lg p-4">
    <Icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
    <div className="text-2xl font-bold text-foreground">{value}</div>
    <div className="text-sm text-foreground">{label}</div>
  </div>
);

const FormationStats = ({ duration, modules, level }) => {
  return (
    <div className="grid grid-cols-3 gap-6 mb-12">
      <StatCard icon={Clock} value={duration} label="Durée totale" />
      <StatCard icon={BookOpen} value={modules} label="Modules" />
      <StatCard icon={Target} value={level} label="Niveau" />
    </div>
  );
};

export default FormationStats;
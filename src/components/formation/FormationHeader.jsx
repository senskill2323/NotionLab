import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const FormationHeader = ({ title, description, level, color }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center", color)}>
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div>
          {level && <Badge variant="secondary" className="mb-2">{level}</Badge>}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">{title}</h1>
        </div>
      </div>
      <p className="text-xl text-foreground/80">{description}</p>
    </div>
  );
};

export default FormationHeader;
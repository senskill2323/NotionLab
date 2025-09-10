import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const FormationHeader = ({ title, description, level, coverImageUrl, totalModules, totalHours }) => {
  const fallbackImage = "https://images.unsplash.com/photo-1526554779127-cef759318656";
  
  return (
    <div className="relative mb-8 rounded-2xl overflow-hidden">
      {/* Hero Image */}
      <div className="h-[105px] md:h-[142px] relative">
        <img 
          src={coverImageUrl || fallbackImage}
          alt={`Image de couverture pour la formation ${title}`}
          className="w-full h-full object-cover"
        />
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        
        {/* KPIs en haut à droite */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4">
          <div className="flex items-center gap-4 text-sm text-white/90 bg-background/20 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{totalModules} modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{totalHours}h</span>
            </div>
          </div>
        </div>
        
        {/* Content overlay */}
        <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4">
          {level && (
            <Badge variant="secondary" className="mb-2 bg-background/80 backdrop-blur-sm text-xs">
              {level}
            </Badge>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
            {title}
          </h1>
          <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-4xl">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormationHeader;
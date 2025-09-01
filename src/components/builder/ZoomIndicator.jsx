import React from 'react';
import { useViewport } from 'reactflow';
import { ZoomIn } from 'lucide-react';

const ZoomIndicator = () => {
  const { zoom } = useViewport();
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm p-2 rounded-lg border shadow-lg text-sm font-medium text-muted-foreground">
        <ZoomIn className="w-4 h-4" />
        <span>{zoomPercentage}%</span>
      </div>
    </div>
  );
};

export default ZoomIndicator;
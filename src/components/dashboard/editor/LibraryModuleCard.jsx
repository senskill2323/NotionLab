import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const LibraryModuleCard = React.forwardRef(({ module, isDragging, ...props }, ref) => {
  return (
    <div ref={ref} {...props}>
      <Card className={cn(
        "bg-card/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-grab",
        isDragging && 'opacity-50'
      )}>
        <CardHeader className="p-4 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{module.name}</CardTitle>
            <CardDescription className="text-sm mt-1">{module.description}</CardDescription>
          </div>
          <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
        </CardHeader>
      </Card>
    </div>
  );
});

export default LibraryModuleCard;
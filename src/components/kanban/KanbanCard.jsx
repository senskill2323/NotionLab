import React from 'react';
    import { useSortable } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Clock } from 'lucide-react';
    import { cn } from '@/lib/utils';

    const KanbanCard = React.forwardRef(({ card, isOverlay, ...props }, ref) => {
      const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({
        id: card?.status_id || 'temp-id',
        data: {
          type: 'Card',
          card,
        },
        disabled: !card,
      });

      if (!card) {
        return <div ref={setNodeRef} style={{ display: 'none' }} />;
      }

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      };
      
      const truncateText = (text, maxLength) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
      };

      return (
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...props}
          className={cn(
            'mb-4 touch-manipulation',
            isDragging && 'opacity-50 z-50',
            isOverlay && 'shadow-2xl'
          )}
        >
            <Card 
              className="bg-gray-700/70 border-gray-600 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-grab"
              {...listeners}
            >
                <CardHeader className="p-3">
                    <CardTitle className="text-base font-semibold text-gray-100">{card.title}</CardTitle>
                </CardHeader>
                {card.description && (
                  <CardContent className="p-3 pt-0">
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {truncateText(card.description, 100)}
                      </p>
                  </CardContent>
                )}
                <CardFooter className="p-3 pt-0 flex justify-between items-center text-xs text-gray-400">
                    <div className="flex flex-wrap gap-2">
                        {card.family_name && <Badge variant="secondary">{card.family_name}</Badge>}
                        {card.subfamily_name && <Badge variant="outline">{card.subfamily_name}</Badge>}
                    </div>
                    {card.duration && (
                      <div className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{card.duration} min</span>
                      </div>
                    )}
                </CardFooter>
            </Card>
        </div>
      );
    });

    export default KanbanCard;
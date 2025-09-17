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

      // Try to detect bullet-like content and render as a list for readability
      const getBulletItems = (text) => {
        if (!text) return null;
        // Normalize potential separators and collapse spaces
        const normalized = String(text).replace(/\s*•\s*/g, '\n• ').trim();
        const lines = normalized.split(/\n+/).map(s => s.trim()).filter(Boolean);
        // If multiple lines start with bullet markers, treat as list
        const bulletLines = lines.filter(l => /^•\s+|^-\s+|^\*\s+/.test(l));
        if (bulletLines.length >= 2) {
          return bulletLines.map(l => l.replace(/^([•\-*])\s+/, '').trim()).filter(Boolean);
        }
        return null;
      };

      const bulletItems = getBulletItems(card.description);

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
              className="bg-gray-800/70 border-gray-700 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-grab rounded-lg"
              {...listeners}
            >
                <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-base font-semibold text-gray-100 leading-snug line-clamp-2">{card.title}</CardTitle>
                    {card.formation_name && (
                      <p className="text-xs text-gray-400/80 mt-1 leading-tight">{card.formation_name}</p>
                    )}
                </CardHeader>
                {card.description && (
                  <CardContent className="p-3 pt-0">
                    {bulletItems ? (
                      <ul className="list-disc pl-5 text-xs text-gray-300/80 space-y-0.5 marker:text-gray-500">
                        {bulletItems.slice(0, 5).map((it, idx) => (
                          <li key={idx} className="leading-4">{it}</li>
                        ))}
                        {bulletItems.length > 5 && (
                          <li className="text-gray-400">…</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-300/80 leading-5 line-clamp-3 whitespace-pre-line">
                        {String(card.description).replace(/\s*•\s*/g, '\n• ')}
                      </p>
                    )}
                  </CardContent>
                )}
                <CardFooter className="p-3 pt-0 flex justify-between items-center text-xs text-gray-400">
                    <div className="flex flex-wrap gap-2 min-w-0">
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
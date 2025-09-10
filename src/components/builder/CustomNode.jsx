import React from 'react';
    import { Handle, Position } from 'reactflow';
    import { BrainCircuit, Construction, BookOpen } from 'lucide-react';
    import { cn } from '@/lib/utils';

    const iconMap = {
        BrainCircuit: <BrainCircuit className="w-5 h-5 text-primary" />,
        Construction: <Construction className="w-5 h-5 text-blue-500" />,
        BookOpen: <BookOpen className="w-5 h-5 text-emerald-500" />,
    };

    const familyColorMap = {
        'Apprendre': 'border-primary',
        'Construire': 'border-blue-500',
        'Théorie': 'border-emerald-500',
    };

    const CustomNode = ({ data, isConnectable, selected }) => {
      const familyColor = familyColorMap[data.family_name] || 'border-muted';

      return (
        <div className={cn(
          "bg-card rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-t-4 min-w-[225px] max-w-[400px] w-auto",
          familyColor,
          selected ? 'shadow-2xl ring-2 ring-primary' : ''
        )}>
          <Handle
            type="target"
            position={Position.Left}
            isConnectable={isConnectable}
            className="!bg-primary !w-3 !h-3"
          />
          <div className="p-3">
            <div className="flex items-center gap-3 mb-2">
              {iconMap[data.family_icon] || <BrainCircuit className="w-5 h-5 text-primary" />}
              <h3 className="font-bold text-sm text-foreground m-0 flex-1">{data.title}</h3>
            </div>
            <div className="text-muted-foreground text-xs mb-3 whitespace-pre-wrap">
              {data.description}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-xs font-semibold">{data.duration} min</span>
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            className="!bg-primary !w-3 !h-3"
          />
        </div>
      );
    };

    export default CustomNode;
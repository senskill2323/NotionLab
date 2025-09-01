import React from 'react';
import { Handle, Position } from 'reactflow';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const StartNode = ({ data, isConnectable }) => {
  return (
    <div
      className={cn(
        "bg-primary/80 text-primary-foreground rounded-lg shadow-lg border-2 border-primary-foreground/50",
        "w-[225px] h-[75px] flex items-center justify-center"
      )}
    >
      <div className="flex items-center gap-3">
        <Flag className="w-6 h-6" />
        <h3 className="font-bold text-lg m-0">{data.label}</h3>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="!bg-primary-foreground !w-4 !h-4"
      />
    </div>
  );
};

export default StartNode;
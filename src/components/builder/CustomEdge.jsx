import React from 'react';
import { BaseEdge, getStraightPath, useReactFlow, EdgeLabelRenderer } from 'reactflow';
import { Trash2 } from 'lucide-react';

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY }) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const onEdgeClick = (evt) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group"
        >
          <button
            className="w-24 h-24 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={onEdgeClick}
          >
            <Trash2 className="w-12 h-12" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
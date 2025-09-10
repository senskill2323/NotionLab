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
            zIndex: 1000,
          }}
          className="nodrag nopan group"
        >
          <button
            className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100"
            onClick={onEdgeClick}
            title="Supprimer la connexion"
            style={{ pointerEvents: 'all' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
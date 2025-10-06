import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath, useReactFlow } from 'reactflow';
import { Trash2 } from 'lucide-react';

const BlueprintEdge = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    markerEnd,
    style,
    data,
    selected,
  } = props;

  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (event) => {
    event.stopPropagation();
    if (typeof data?.onDeleteEdge === 'function') {
      data.onDeleteEdge(id);
    } else {
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    }
  };

  const showDelete = isHovered || selected;

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const edgeStyle = {
    stroke: 'hsl(var(--primary))',
    strokeWidth: 1.5,
    ...(style ?? {}),
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={(edgeStyle.strokeWidth ?? 1.5) + 20}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            zIndex: 40,
          }}
        >
          <button
            type="button"
            aria-label="Supprimer la connexion"
            onClick={handleDelete}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600/70 text-white shadow-xl transition-all duration-150 ${
              showDelete ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'
            }`}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default BlueprintEdge;

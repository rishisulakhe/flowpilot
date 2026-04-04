"use client";

import { getBezierPath, type EdgeProps } from "@xyflow/react";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <g>
      {/* Shadow / glow for selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth={4}
          strokeOpacity={0.25}
          strokeLinecap="round"
        />
      )}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={selected ? "#6366f1" : "#52525b"}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
}

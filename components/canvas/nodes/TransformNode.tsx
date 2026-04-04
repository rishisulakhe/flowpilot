"use client";

import { Code2 } from "lucide-react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNodeData } from "@/stores/workflow-store";

export function TransformNode(props: NodeProps<WorkflowNodeData>) {
  const { expression = "" } = props.data.config as { expression?: string };

  return (
    <BaseNode
      nodeProps={props}
      accentColor="#F97316"
      typeLabel="Transform"
      icon={<Code2 className="w-3 h-3 inline" />}
    >
      {expression && (
        <div className="bg-black/30 rounded px-2 py-1 font-mono text-[10px] text-orange-300 truncate">
          {expression.slice(0, 30)}
        </div>
      )}
    </BaseNode>
  );
}

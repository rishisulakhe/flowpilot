"use client";

import { Flag } from "lucide-react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNodeData } from "@/stores/workflow-store";

export function OutputNode(props: NodeProps<WorkflowNodeData>) {
  const { format = "text" } = props.data.config as { format?: string };

  return (
    <BaseNode
      nodeProps={props}
      accentColor="#EF4444"
      typeLabel="Output"
      icon={<Flag className="w-3 h-3 inline" />}
      hasOutput={false}
    >
      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-red-500/20 text-red-300 border border-red-500/30">
        {format}
      </span>
    </BaseNode>
  );
}

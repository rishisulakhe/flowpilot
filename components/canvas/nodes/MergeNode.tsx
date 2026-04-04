"use client";

import { Merge } from "lucide-react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNodeData } from "@/stores/workflow-store";

export function MergeNode(props: NodeProps<WorkflowNodeData>) {
  const { strategy = "combine" } = props.data.config as { strategy?: string };

  return (
    <BaseNode
      nodeProps={props}
      accentColor="#14B8A6"
      typeLabel="Merge"
      icon={<Merge className="w-3 h-3 inline" />}
    >
      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-teal-500/20 text-teal-300 border border-teal-500/30">
        {strategy}
      </span>
    </BaseNode>
  );
}

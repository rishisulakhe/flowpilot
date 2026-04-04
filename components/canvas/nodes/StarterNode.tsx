"use client";

import { Zap } from "lucide-react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNodeData } from "@/stores/workflow-store";

export function StarterNode(props: NodeProps<WorkflowNodeData>) {
  return (
    <BaseNode
      nodeProps={props}
      accentColor="#22C55E"
      typeLabel="Trigger"
      icon={<Zap className="w-3 h-3 inline" />}
      hasInput={false}
    />
  );
}

"use client";

import { Globe } from "lucide-react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNodeData } from "@/stores/workflow-store";

export function HttpNode(props: NodeProps<WorkflowNodeData>) {
  const { method = "GET", url = "" } = props.data.config as { method?: string; url?: string };
  const preview = `${method} ${url || "{{url}}"}`.slice(0, 28);

  return (
    <BaseNode
      nodeProps={props}
      accentColor="#3B82F6"
      typeLabel="HTTP Request"
      icon={<Globe className="w-3 h-3 inline" />}
    >
      <div className="bg-black/30 rounded px-2 py-1 font-mono text-[10px] text-blue-300 truncate">
        {preview}
      </div>
    </BaseNode>
  );
}

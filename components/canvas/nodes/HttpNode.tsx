"use client";

import { memo } from "react";
import { Globe } from "lucide-react";
import type { AnyNodeProps } from "./BaseNode";
import { BaseNode } from "./BaseNode";

export const HttpNode = memo(function HttpNode(props: AnyNodeProps) {
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
});

"use client";

import { Code2 } from "lucide-react";
import type { AnyNodeProps } from "./BaseNode";
import { BaseNode } from "./BaseNode";

export function TransformNode(props: AnyNodeProps) {
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

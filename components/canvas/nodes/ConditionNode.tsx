"use client";

import { GitBranch } from "lucide-react";
import type { AnyNodeProps } from "./BaseNode";
import { BaseNode } from "./BaseNode";

export function ConditionNode(props: AnyNodeProps) {
  const { expression = "" } = props.data.config as { expression?: string };

  return (
    <BaseNode
      nodeProps={props}
      accentColor="#EAB308"
      typeLabel="Condition"
      icon={<GitBranch className="w-3 h-3 inline" />}
      outputHandles={[
        { id: "true", label: "TRUE", position: 30 },
        { id: "false", label: "FALSE", position: 70 },
      ]}
    >
      {expression && (
        <div className="bg-black/30 rounded px-2 py-1 font-mono text-[10px] text-yellow-300 truncate">
          {expression.slice(0, 30)}
        </div>
      )}
      <div className="flex justify-end gap-2 text-[8px] font-semibold">
        <span className="text-emerald-400 uppercase tracking-wide">True ↑</span>
        <span className="text-red-400 uppercase tracking-wide">False ↓</span>
      </div>
    </BaseNode>
  );
}

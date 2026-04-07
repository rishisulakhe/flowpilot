"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";
import type { AnyNodeProps } from "./BaseNode";
import { BaseNode } from "./BaseNode";

export const LLMNode = memo(function LLMNode(props: AnyNodeProps) {
  const { provider, model } = props.data.config as { provider?: string; model?: string };

  return (
    <BaseNode
      nodeProps={props}
      accentColor="#8B5CF6"
      typeLabel="LLM Generation"
      icon={<Sparkles className="w-3 h-3 inline" />}
      isLLM
    >
      {(provider || model) && (
        <div className="flex flex-wrap gap-1">
          {provider && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {provider}
            </span>
          )}
          {model && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-700/60 text-zinc-300 border border-zinc-600/40 max-w-[120px] truncate">
              {model}
            </span>
          )}
        </div>
      )}
    </BaseNode>
  );
});

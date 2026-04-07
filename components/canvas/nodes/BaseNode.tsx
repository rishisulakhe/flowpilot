"use client";

import { type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useExecutionStore } from "@/stores/execution-store";
import type { WorkflowNodeData } from "@/stores/workflow-store";
import { CheckCircle, XCircle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNodeProps = NodeProps<any>;

interface BaseNodeProps {
  nodeProps: AnyNodeProps;
  accentColor: string;
  typeLabel: string;
  icon: ReactNode;
  children?: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  outputHandles?: { id: string; label: string; position: number }[];
  /** Pass true from LLMNode so streaming content gets expanded treatment */
  isLLM?: boolean;
}

const GLOW_CLASS: Record<string, string> = {
  "#22C55E": "node-running-green",
  "#8B5CF6": "node-running-purple",
  "#3B82F6": "node-running-blue",
  "#EAB308": "node-running-yellow",
  "#F97316": "node-running-orange",
  "#14B8A6": "node-running-teal",
  "#EF4444": "node-running-red",
};

export function BaseNode({
  nodeProps,
  accentColor,
  typeLabel,
  icon,
  children,
  hasInput = true,
  hasOutput = true,
  outputHandles,
  isLLM = false,
}: BaseNodeProps) {
  const { id, selected } = nodeProps;
  const data = nodeProps.data as WorkflowNodeData;
  const { blockStatuses, streamingTokens, isRunning } = useExecutionStore();
  const blockState = blockStatuses[id];
  const status = blockState?.status;
  const streaming = streamingTokens[id] ?? "";

  const isPending = isRunning && !status;
  const glowClass = GLOW_CLASS[accentColor] ?? "node-running-purple";

  const borderStyle =
    status === "running"
      ? { borderColor: accentColor }
      : status === "completed"
        ? { borderColor: "#22C55E", boxShadow: "0 0 10px rgba(34,197,94,0.25)" }
        : status === "failed"
          ? { borderColor: "#EF4444", boxShadow: "0 0 10px rgba(239,68,68,0.25)" }
          : status === "skipped"
            ? { borderColor: "#3f3f46", opacity: 0.45 }
            : selected
              ? { borderColor: "#6366f1", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }
              : {};

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-[#13131f] min-w-[200px] max-w-[240px] overflow-hidden transition-colors duration-200",
        status === "running" && glowClass,
        isPending && "opacity-50",
        !status && !selected && "border-border hover:border-zinc-600",
        status === "skipped" && "border-dashed",
      )}
      style={borderStyle}
    >
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      {/* Status badge */}
      {status === "completed" && (
        <span className="absolute top-2 right-2 z-10">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        </span>
      )}
      {status === "failed" && (
        <span className="absolute top-2 right-2 z-10">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
        </span>
      )}

      {/* Header */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px]" style={{ color: accentColor }}>{icon}</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
            {typeLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground leading-tight">{data.label}</p>
      </div>

      {/* Content */}
      {(children || (status === "running" && streaming)) && (
        <div className="px-3 pb-3 space-y-2">
          {children}

          {/* LLM streaming area */}
          {isLLM && status === "running" && streaming && (
            <div className="mt-1 bg-black/40 rounded-lg p-2 border border-violet-500/20">
              <p className="font-mono text-[10px] text-violet-200 leading-relaxed whitespace-pre-wrap break-words max-h-[120px] overflow-hidden">
                {streaming.slice(0, 200)}
                {streaming.length > 200 && "…"}
                <span className="streaming-cursor ml-0.5 text-violet-400">█</span>
              </p>
              <p className="text-[9px] text-violet-400/70 mt-1.5 font-mono">
                ~{Math.round(streaming.length / 4)} tokens
              </p>
            </div>
          )}

          {/* Non-LLM streaming preview */}
          {!isLLM && status === "running" && streaming && (
            <div className="text-[10px] text-muted-foreground bg-black/30 rounded p-1.5 max-h-10 overflow-hidden font-mono leading-relaxed">
              {streaming.slice(-80)}
              <span className="streaming-cursor">▊</span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {status === "failed" && blockState?.error && (
        <div className="px-3 pb-3">
          <p className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1 font-mono truncate">
            {blockState.error}
          </p>
        </div>
      )}

      {/* Completed bottom bar */}
      {status === "completed" && (
        <div className="h-0.5 w-full bg-emerald-500/60" />
      )}

      {/* Handles */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-primary"
        />
      )}

      {outputHandles ? (
        outputHandles.map((h) => (
          <Handle
            key={h.id}
            type="source"
            position={Position.Right}
            id={h.id}
            style={{ top: `${h.position}%` }}
            className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-primary"
          />
        ))
      ) : hasOutput ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-primary"
        />
      ) : null}
    </div>
  );
}

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
}

export function BaseNode({
  nodeProps,
  accentColor,
  typeLabel,
  icon,
  children,
  hasInput = true,
  hasOutput = true,
  outputHandles,
}: BaseNodeProps) {
  const { id, selected } = nodeProps;
  const data = nodeProps.data as WorkflowNodeData;
  const { blockStatuses, streamingTokens } = useExecutionStore();
  const blockState = blockStatuses[id];
  const status = blockState?.status;
  const streaming = streamingTokens[id];

  const borderClass =
    status === "running"
      ? "border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)] animate-pulse"
      : status === "completed"
        ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        : status === "failed"
          ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          : status === "skipped"
            ? "border-zinc-600 opacity-60"
            : selected
              ? "border-primary shadow-[0_0_12px_rgba(99,102,241,0.3)]"
              : "border-border hover:border-zinc-600";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-[#13131f] min-w-[200px] max-w-[220px] overflow-hidden transition-all duration-200",
        borderClass
      )}
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
          {status === "running" && streaming && (
            <div className="text-[10px] text-muted-foreground bg-black/30 rounded p-1.5 max-h-10 overflow-hidden font-mono leading-relaxed">
              {streaming.slice(-80)}
              <span className="animate-pulse">▊</span>
            </div>
          )}
        </div>
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

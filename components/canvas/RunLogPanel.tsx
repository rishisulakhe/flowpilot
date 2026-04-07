"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExecutionStore } from "@/stores/execution-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { Button } from "@/components/ui/button";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusDot({ status }: { status?: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />;
  if (status === "skipped") return <div className="w-4 h-4 rounded-full border border-zinc-600 shrink-0" />;
  // pending
  return <div className="w-4 h-4 rounded-full border border-zinc-700 bg-zinc-800 shrink-0" />;
}

function StepRow({
  blockId,
  label,
}: {
  blockId: string;
  label: string;
}) {
  const { blockStatuses, streamingTokens } = useExecutionStore();
  const [expanded, setExpanded] = useState(false);
  const blockState = blockStatuses[blockId];
  const streaming = streamingTokens[blockId];
  const status = blockState?.status;

  const outputPreview = blockState?.output
    ? JSON.stringify(blockState.output).slice(0, 200)
    : null;

  return (
    <div
      className={cn(
        "border-b border-border/50 transition-opacity",
        !status && "opacity-40",
      )}
    >
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => status === "completed" && outputPreview && setExpanded((p) => !p)}
      >
        <div className="mt-0.5">
          <StatusDot status={status} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", !status && "text-muted-foreground")}>{label}</p>

          {status === "running" && (
            <p className="text-[10px] text-violet-400 mt-0.5">
              {streaming
                ? `Streaming… ~${Math.round(streaming.length / 4)} tokens`
                : "running…"}
            </p>
          )}
          {status === "failed" && blockState?.error && (
            <p className="text-[10px] text-red-400 mt-0.5 font-mono truncate">{blockState.error}</p>
          )}
          {status === "completed" && outputPreview && !expanded && (
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{outputPreview}</p>
          )}
          {status === "skipped" && (
            <p className="text-[10px] text-zinc-500 mt-0.5">skipped</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {status === "completed" && blockState?.durationMs !== undefined && (
            <span className="text-[10px] text-emerald-400 font-mono">
              {formatMs(blockState.durationMs)}
            </span>
          )}
          {status === "running" && (
            <span className="text-[10px] text-violet-400 font-mono">running…</span>
          )}
          {status === "completed" && outputPreview && (
            expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && outputPreview && (
        <div className="px-4 pb-3">
          <pre className="bg-black/40 rounded-lg p-3 text-[10px] font-mono text-zinc-300 overflow-auto max-h-[160px] whitespace-pre-wrap break-words border border-border/40">
            {JSON.stringify(blockState?.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function RunLogPanel() {
  const { isRunning, runId, startTime, blockStatuses, blockOrder, executionResult } = useExecutionStore();
  const { nodes } = useWorkflowStore();
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live timer
  useEffect(() => {
    if (!isRunning || !startTime) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(id);
  }, [isRunning, startTime]);

  // Scroll to bottom when a new block becomes active
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [blockOrder.length]);

  // Build display list: blockOrder first, then remaining nodes in their original order
  const seenIds = new Set(blockOrder);
  const remaining = nodes.filter((n) => !seenIds.has(n.id)).map((n) => n.id);
  const displayIds = [...blockOrder, ...remaining];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const totalDuration = executionResult?.durationMs ?? (isRunning && startTime ? elapsed : null);

  return (
    <aside className="flex flex-col h-full w-[300px] border-l border-border bg-[#0d0d14] shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Run Log</p>
          {runId && runId !== "pending" && (
            <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{runId}</p>
          )}
        </div>
        {totalDuration !== null && (
          <div className="flex items-center gap-1 shrink-0 text-[11px] font-mono">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className={cn(
              executionResult?.status === "failed" ? "text-red-400" : "text-emerald-400"
            )}>
              {formatMs(Math.round(typeof totalDuration === "number" ? totalDuration : elapsed))}
            </span>
          </div>
        )}
      </div>

      {/* Status bar */}
      {isRunning && (
        <div className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20 flex items-center gap-2 shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
          <span className="text-[11px] text-violet-300">Executing workflow…</span>
        </div>
      )}
      {executionResult && !isRunning && (
        <div className={cn(
          "px-4 py-2 border-b flex items-center gap-2 shrink-0",
          executionResult.status === "completed"
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-red-500/10 border-red-500/20"
        )}>
          {executionResult.status === "completed"
            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            : <XCircle className="w-3.5 h-3.5 text-red-400" />
          }
          <span className={cn("text-[11px]", executionResult.status === "completed" ? "text-emerald-300" : "text-red-300")}>
            {executionResult.status === "completed" ? "Completed" : `Failed: ${executionResult.error ?? ""}`}
          </span>
        </div>
      )}

      {/* Steps */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {displayIds.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-2" />
            <p className="text-xs text-muted-foreground">Starting execution…</p>
          </div>
        )}
        {displayIds.map((id) => {
          const node = nodeMap.get(id);
          const isActive = !!blockStatuses[id];
          return (
            <StepRow
              key={id}
              blockId={id}
              label={node?.data?.label ?? id}
            />
          );
        })}
      </div>

      {/* Final output */}
      {executionResult?.status === "completed" && executionResult.output !== undefined && (
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Final Output</p>
          <pre className="bg-black/40 rounded-lg p-2.5 text-[10px] font-mono text-zinc-300 overflow-auto max-h-[100px] whitespace-pre-wrap break-words border border-border/40">
            {typeof executionResult.output === "string"
              ? executionResult.output
              : JSON.stringify(executionResult.output, null, 2)}
          </pre>
        </div>
      )}
    </aside>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Copy, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Workflow } from "@/db/schema";

// Badge color config per block type
const BLOCK_BADGE: Record<string, { dot: string; label: string }> = {
  starter:   { dot: "bg-emerald-500", label: "STARTER" },
  llm:       { dot: "bg-violet-500",  label: "LLM" },
  http:      { dot: "bg-blue-500",    label: "HTTP" },
  condition: { dot: "bg-yellow-500",  label: "CONDITION" },
  transform: { dot: "bg-orange-500",  label: "TRANSFORM" },
  merge:     { dot: "bg-pink-500",    label: "MERGE" },
  output:    { dot: "bg-teal-500",    label: "OUTPUT" },
};

function getBlockTypes(graph: unknown): string[] {
  try {
    const g = typeof graph === "string" ? JSON.parse(graph) : graph;
    const types = (g?.nodes ?? []).map((n: { type: string }) => n.type) as string[];
    return [...new Set(types)].filter((t) => t !== "starter");
  } catch {
    return [];
  }
}

interface WorkflowCardProps {
  workflow: Workflow & { graph: unknown };
  onDeleted: () => void;
  onDuplicated: () => void;
}

export function WorkflowCard({ workflow, onDeleted, onDuplicated }: WorkflowCardProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const blockTypes = getBlockTypes(workflow.graph);
  const timeAgo = formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true });

  async function handleDuplicate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        onDuplicated();
        router.push(`/workflow/${json.data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div
        onClick={() => router.push(`/workflow/${workflow.id}`)}
        className="group relative flex flex-col gap-3 p-5 rounded-xl border border-border bg-card cursor-pointer
          hover:border-primary/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-200"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-1">{workflow.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground -mt-0.5 -mr-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); router.push(`/workflow/${workflow.id}`); }}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={loading}
                onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
              >
                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {workflow.description || <span className="italic opacity-50">No description</span>}
        </p>

        {/* Block type badges */}
        {blockTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {blockTypes.map((type) => {
              const badge = BLOCK_BADGE[type];
              if (!badge) return null;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium tracking-wide uppercase"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mt-auto pt-1">
          Last edited {timeAgo}
        </p>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete <span className="text-foreground font-medium">"{workflow.name}"</span> and all its run history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

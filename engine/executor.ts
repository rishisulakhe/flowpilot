import type { WorkflowGraph, StepStatus } from "@/types/workflow";
import type { ExecutionContext, ExecutionResult, BlockResult } from "./types";
import { detectCycle } from "./cycle-detector";
import { topologicalSort } from "./topological-sort";
import { resolveTemplates } from "./template-resolver";
import { blockHandlers } from "./blocks/registry";

interface ExecuteCallbacks {
  onBlockStatusChange?: (blockId: string, status: StepStatus, data?: unknown) => void;
  onBlockStream?: (blockId: string, token: string) => void;
}

export async function executeWorkflow(
  graph: WorkflowGraph,
  input: unknown,
  callbacks?: ExecuteCallbacks
): Promise<ExecutionResult> {
  const wallStart = Date.now();

  // ── Validate ────────────────────────────────────────────────────────────────

  if (graph.nodes.length === 0) {
    return failed("Workflow has no nodes", wallStart);
  }

  const starterNodes = graph.nodes.filter((n) => n.type === "starter");
  if (starterNodes.length !== 1) {
    return failed(
      `Workflow must have exactly one Starter block (found ${starterNodes.length})`,
      wallStart
    );
  }

  const { hasCycle, cycle } = detectCycle(graph.nodes, graph.edges);
  if (hasCycle) {
    return failed(`Cycle detected: ${cycle?.join(" → ")}`, wallStart);
  }

  // ── Build plan ──────────────────────────────────────────────────────────────

  const plan = topologicalSort(graph.nodes, graph.edges);

  // ── Execution context ───────────────────────────────────────────────────────

  const context: ExecutionContext = {
    results: {},
    workflowInput: input,
    onBlockStatusChange: callbacks?.onBlockStatusChange,
    onBlockStream: callbacks?.onBlockStream,
  };

  // ── Pre-compute: which nodes are in the skipped set ─────────────────────────
  // We resolve this lazily as we go, since condition results aren't known upfront.
  const skippedNodes = new Set<string>();

  // ── Execute level by level ──────────────────────────────────────────────────

  for (const level of plan.levels) {
    // Determine skipped nodes for this level based on already-executed conditions
    for (const nodeId of level) {
      if (isSkipped(nodeId, plan, context, skippedNodes)) {
        skippedNodes.add(nodeId);
      }
    }

    // Split level into active and skipped
    const activeIds = level.filter((id) => !skippedNodes.has(id));
    const skippedIds = level.filter((id) => skippedNodes.has(id));

    // Register skipped
    for (const nodeId of skippedIds) {
      context.results[nodeId] = { output: null, status: "skipped", durationMs: 0 };
      context.onBlockStatusChange?.(nodeId, "skipped");
    }

    // Execute active nodes in parallel
    await Promise.all(
      activeIds.map((nodeId) => executeNode(nodeId, plan, context))
    );
  }

  // ── Collect output ──────────────────────────────────────────────────────────

  const outputNodes = graph.nodes.filter((n) => n.type === "output");
  const completedOutputs = outputNodes.filter(
    (n) => context.results[n.id]?.status === "completed"
  );

  let finalOutput: unknown = null;
  if (completedOutputs.length === 1) {
    finalOutput = context.results[completedOutputs[0].id].output;
  } else if (completedOutputs.length > 1) {
    finalOutput = Object.fromEntries(
      completedOutputs.map((n) => [n.id, context.results[n.id].output])
    );
  }

  // ── Overall status ──────────────────────────────────────────────────────────

  const anyFailed = Object.values(context.results).some(
    (r) => r.status === "failed"
  );

  return {
    status: anyFailed ? "failed" : "completed",
    results: context.results,
    output: finalOutput,
    durationMs: Date.now() - wallStart,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function executeNode(
  nodeId: string,
  plan: ReturnType<typeof topologicalSort>,
  context: ExecutionContext
): Promise<void> {
  const node = plan.nodeMap[nodeId];
  const blockStart = Date.now();

  context.onBlockStatusChange?.(nodeId, "running");

  // Collect input from upstream nodes
  const upstreamIds = plan.reverseAdj[nodeId] ?? [];
  let blockInput: unknown;

  if (upstreamIds.length === 0) {
    blockInput = context.workflowInput;
  } else if (upstreamIds.length === 1) {
    blockInput = context.results[upstreamIds[0]]?.output ?? null;
  } else {
    // Multiple upstreams (merge scenario) → keyed object
    blockInput = Object.fromEntries(
      upstreamIds.map((uid) => [uid, context.results[uid]?.output ?? null])
    );
  }

  // Deep-resolve templates in the block config
  const resolvedConfig = resolveTemplates(
    node.data.config,
    context
  ) as Record<string, unknown>;

  const handler = blockHandlers[node.type];

  try {
    const output = await handler(blockInput, resolvedConfig, context);
    const durationMs = Date.now() - blockStart;
    context.results[nodeId] = { output, status: "completed", durationMs };
    context.onBlockStatusChange?.(nodeId, "completed", { output, durationMs });
  } catch (err: unknown) {
    const durationMs = Date.now() - blockStart;
    const error = err instanceof Error ? err.message : String(err);
    context.results[nodeId] = { output: null, status: "failed", error, durationMs };
    context.onBlockStatusChange?.(nodeId, "failed", { error, durationMs });
  }
}

/**
 * A node should be skipped if:
 * 1. Any of its direct upstream nodes was skipped.
 * 2. It is downstream of a condition block via the non-selected branch.
 */
function isSkipped(
  nodeId: string,
  plan: ReturnType<typeof topologicalSort>,
  context: ExecutionContext,
  skippedNodes: Set<string>
): boolean {
  const upstreamIds = plan.reverseAdj[nodeId] ?? [];

  for (const upstreamId of upstreamIds) {
    // Transitively skipped — upstream was already skipped
    if (skippedNodes.has(upstreamId)) return true;

    const upstreamNode = plan.nodeMap[upstreamId];
    if (upstreamNode?.type === "condition") {
      const condResult = context.results[upstreamId];
      if (!condResult || condResult.status !== "completed") continue;

      const selectedBranch = (condResult.output as { selectedBranch: string })
        ?.selectedBranch;
      if (!selectedBranch) continue;

      // Find the edge connecting this condition to nodeId
      const connectingEdge = plan.edges.find(
        (e) => e.source === upstreamId && e.target === nodeId
      );
      if (!connectingEdge) continue;

      // If the edge's sourceHandle doesn't match the selected branch, skip
      if (
        connectingEdge.sourceHandle !== undefined &&
        connectingEdge.sourceHandle !== selectedBranch
      ) {
        return true;
      }
    }
  }

  return false;
}

function failed(error: string, wallStart: number): ExecutionResult {
  return {
    status: "failed",
    results: {},
    output: null,
    durationMs: Date.now() - wallStart,
    error,
  };
}

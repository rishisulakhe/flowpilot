import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workflows, workflowRuns, workflowRunSteps } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { SSEStream } from "@/lib/sse";
import { executeWorkflow } from "@/engine";
import type { WorkflowGraph } from "@/types/workflow";

const executeSchema = z.object({
  workflowId: z.string().min(1),
  input: z.any().optional(),
});

export async function POST(request: NextRequest) {
  // ── Parse & validate ────────────────────────────────────────────────────────

  let body: z.infer<typeof executeSchema>;
  try {
    body = executeSchema.parse(await request.json());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Load workflow ───────────────────────────────────────────────────────────

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, body.workflowId));

  if (!workflow) {
    return new Response(
      JSON.stringify({ success: false, error: "Workflow not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Parse graph ─────────────────────────────────────────────────────────────

  let graph: WorkflowGraph;
  try {
    graph = JSON.parse(workflow.graph) as WorkflowGraph;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid workflow graph" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Create run record ───────────────────────────────────────────────────────

  const runId = generateId();
  const now = Date.now();

  await db.insert(workflowRuns).values({
    id: runId,
    workflowId: body.workflowId,
    status: "running",
    input: body.input !== undefined ? JSON.stringify(body.input) : null,
    output: null,
    durationMs: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  });

  // ── Pre-create step records ─────────────────────────────────────────────────

  const stepMap: Record<string, string> = {}; // blockId → stepId

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    const stepId = generateId();
    stepMap[node.id] = stepId;
    await db.insert(workflowRunSteps).values({
      id: stepId,
      runId,
      blockId: node.id,
      blockType: node.type,
      status: "pending",
      input: null,
      output: null,
      error: null,
      durationMs: null,
      executionOrder: i,
      createdAt: now,
    });
  }

  // ── Set up SSE stream ───────────────────────────────────────────────────────

  const sse = new SSEStream();

  sse.send("execution_start", {
    runId,
    workflowId: body.workflowId,
    totalBlocks: graph.nodes.length,
  });

  // ── Execute in background ───────────────────────────────────────────────────

  const executionStart = Date.now();

  (async () => {
    try {
      const result = await executeWorkflow(graph, body.input ?? null, {
        onBlockStatusChange: async (blockId, status, data) => {
          // SSE event
          sse.send("block_status", {
            blockId,
            blockType: graph.nodes.find((n) => n.id === blockId)?.type,
            status,
            input: (data as Record<string, unknown> | undefined)?.input,
            output: (data as Record<string, unknown> | undefined)?.output,
            error: (data as Record<string, unknown> | undefined)?.error,
            durationMs: (data as Record<string, unknown> | undefined)?.durationMs,
          });

          // DB update
          const stepId = stepMap[blockId];
          if (!stepId) return;

          const d = (data ?? {}) as Record<string, unknown>;
          const patch: Partial<typeof workflowRunSteps.$inferInsert> = { status };
          if (d.input !== undefined) patch.input = JSON.stringify(d.input);
          if (d.output !== undefined) patch.output = JSON.stringify(d.output);
          if (d.error !== undefined) patch.error = d.error as string;
          if (d.durationMs !== undefined) patch.durationMs = d.durationMs as number;

          await db
            .update(workflowRunSteps)
            .set(patch)
            .where(eq(workflowRunSteps.id, stepId));
        },

        onBlockStream: (blockId, token) => {
          sse.send("block_stream", { blockId, token });
        },
      });

      const totalDuration = Date.now() - executionStart;

      await db
        .update(workflowRuns)
        .set({
          status: result.status,
          output: result.output !== null ? JSON.stringify(result.output) : null,
          durationMs: totalDuration,
          error: result.error ?? null,
          updatedAt: Date.now(),
        })
        .where(eq(workflowRuns.id, runId));

      sse.send("execution_complete", {
        runId,
        status: result.status,
        output: result.output,
        durationMs: totalDuration,
        error: result.error,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const totalDuration = Date.now() - executionStart;

      await db
        .update(workflowRuns)
        .set({
          status: "failed",
          error: message,
          durationMs: totalDuration,
          updatedAt: Date.now(),
        })
        .where(eq(workflowRuns.id, runId));

      sse.send("execution_error", { runId, error: message });
    } finally {
      sse.close();
    }
  })();

  // ── Return stream immediately ───────────────────────────────────────────────

  return new Response(sse.readable, { headers: sse.headers });
}

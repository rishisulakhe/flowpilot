import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workflows, workflowRuns, workflowRunSteps } from "@/db/schema";
import { updateWorkflowSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { WorkflowGraph } from "@/types/workflow";

type Params = { params: Promise<{ id: string }> };

function parseWorkflow(w: typeof workflows.$inferSelect) {
  return { ...w, graph: JSON.parse(w.graph) as WorkflowGraph };
}

// ─── GET /api/workflows/[id] ───────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) return errorResponse("Workflow not found", 404);

    return successResponse(parseWorkflow(workflow));
  } catch (err) {
    console.error("[GET /api/workflows/[id]]", err);
    return errorResponse("Failed to fetch workflow", 500);
  }
}

// ─── PUT /api/workflows/[id] ───────────────────────────────────────────────────

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) return errorResponse("Workflow not found", 404);

    const body = await request.json();
    const result = updateWorkflowSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues.map((i) => i.message).join(", "), 400);
    }

    const { name, description, graph } = result.data;

    const updates: Partial<typeof workflows.$inferInsert> = {
      updatedAt: Date.now(),
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (graph !== undefined) updates.graph = JSON.stringify(graph);

    await db.update(workflows).set(updates).where(eq(workflows.id, id));

    const [updated] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    return successResponse(parseWorkflow(updated));
  } catch (err) {
    console.error("[PUT /api/workflows/[id]]", err);
    return errorResponse("Failed to update workflow", 500);
  }
}

// ─── DELETE /api/workflows/[id] ────────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) return errorResponse("Workflow not found", 404);

    await db.transaction(async (tx) => {
      const runs = await tx
        .select({ id: workflowRuns.id })
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, id));

      const runIds = runs.map((r) => r.id);
      if (runIds.length > 0) {
        await tx
          .delete(workflowRunSteps)
          .where(inArray(workflowRunSteps.runId, runIds));
      }

      await tx.delete(workflowRuns).where(eq(workflowRuns.workflowId, id));
      await tx.delete(workflows).where(eq(workflows.id, id));
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/workflows/[id]]", err);
    return errorResponse("Failed to delete workflow", 500);
  }
}

import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workflowRuns, workflowRunSteps } from "@/db/schema";
import { updateRunSchema } from "@/lib/validators";
import { parseJsonFields } from "@/lib/utils";
import { successResponse, errorResponse } from "@/lib/api-response";

type Params = { params: Promise<{ runId: string }> };

// ─── GET /api/runs/[runId] ─────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  try {
    const { runId } = await params;

    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId));

    if (!run) return errorResponse("Run not found", 404);

    const stepRows = await db
      .select()
      .from(workflowRunSteps)
      .where(eq(workflowRunSteps.runId, runId))
      .orderBy(asc(workflowRunSteps.executionOrder));

    const steps = stepRows.map((s) =>
      parseJsonFields(s, ["input", "output"])
    );

    return successResponse({
      ...parseJsonFields(run, ["input", "output"]),
      steps,
    });
  } catch (err) {
    console.error("[GET /api/runs/[runId]]", err);
    return errorResponse("Failed to fetch run", 500);
  }
}

// ─── PUT /api/runs/[runId] ─────────────────────────────────────────────────────

export async function PUT(request: Request, { params }: Params) {
  try {
    const { runId } = await params;

    const [existing] = await db
      .select({ id: workflowRuns.id })
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId));

    if (!existing) return errorResponse("Run not found", 404);

    const body = await request.json();
    const result = updateRunSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        result.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { status, output, durationMs, error } = result.data;

    const updates: Partial<typeof workflowRuns.$inferInsert> = {
      updatedAt: Date.now(),
    };
    if (status !== undefined) updates.status = status;
    if (output !== undefined) updates.output = JSON.stringify(output);
    if (durationMs !== undefined) updates.durationMs = durationMs;
    if (error !== undefined) updates.error = error;

    await db.update(workflowRuns).set(updates).where(eq(workflowRuns.id, runId));

    const [updated] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId));

    return successResponse(parseJsonFields(updated, ["input", "output"]));
  } catch (err) {
    console.error("[PUT /api/runs/[runId]]", err);
    return errorResponse("Failed to update run", 500);
  }
}

// ─── DELETE /api/runs/[runId] ──────────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { runId } = await params;

    const [existing] = await db
      .select({ id: workflowRuns.id })
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId));

    if (!existing) return errorResponse("Run not found", 404);

    await db.transaction(async (tx) => {
      await tx
        .delete(workflowRunSteps)
        .where(eq(workflowRunSteps.runId, runId));
      await tx.delete(workflowRuns).where(eq(workflowRuns.id, runId));
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/runs/[runId]]", err);
    return errorResponse("Failed to delete run", 500);
  }
}

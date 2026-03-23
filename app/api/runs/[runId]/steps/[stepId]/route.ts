import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workflowRunSteps } from "@/db/schema";
import { updateStepSchema } from "@/lib/validators";
import { parseJsonFields } from "@/lib/utils";
import { successResponse, errorResponse } from "@/lib/api-response";

type Params = { params: Promise<{ runId: string; stepId: string }> };

// ─── PUT /api/runs/[runId]/steps/[stepId] ─────────────────────────────────────

export async function PUT(request: Request, { params }: Params) {
  try {
    const { runId, stepId } = await params;

    const [existing] = await db
      .select()
      .from(workflowRunSteps)
      .where(
        and(
          eq(workflowRunSteps.id, stepId),
          eq(workflowRunSteps.runId, runId)
        )
      );

    if (!existing) return errorResponse("Step not found", 404);

    const body = await request.json();
    const result = updateStepSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        result.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { status, input, output, error, durationMs } = result.data;

    const updates: Partial<typeof workflowRunSteps.$inferInsert> = {};
    if (status !== undefined) updates.status = status;
    if (input !== undefined) updates.input = JSON.stringify(input);
    if (output !== undefined) updates.output = JSON.stringify(output);
    if (error !== undefined) updates.error = error;
    if (durationMs !== undefined) updates.durationMs = durationMs;

    await db
      .update(workflowRunSteps)
      .set(updates)
      .where(
        and(
          eq(workflowRunSteps.id, stepId),
          eq(workflowRunSteps.runId, runId)
        )
      );

    const [updated] = await db
      .select()
      .from(workflowRunSteps)
      .where(eq(workflowRunSteps.id, stepId));

    return successResponse(parseJsonFields(updated, ["input", "output"]));
  } catch (err) {
    console.error("[PUT /api/runs/[runId]/steps/[stepId]]", err);
    return errorResponse("Failed to update step", 500);
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workflowRuns, workflowRunSteps } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { createStepSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

type Params = { params: Promise<{ runId: string }> };

// ─── POST /api/runs/[runId]/steps ──────────────────────────────────────────────

export async function POST(request: Request, { params }: Params) {
  try {
    const { runId } = await params;

    const [run] = await db
      .select({ id: workflowRuns.id })
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId));

    if (!run) return errorResponse("Run not found", 404);

    const body = await request.json();
    const result = createStepSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        result.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { blockId, blockType, executionOrder } = result.data;
    const id = generateId();
    const now = Date.now();

    await db.insert(workflowRunSteps).values({
      id,
      runId,
      blockId,
      blockType,
      status: "pending",
      input: null,
      output: null,
      error: null,
      durationMs: null,
      executionOrder,
      createdAt: now,
    });

    const [created] = await db
      .select()
      .from(workflowRunSteps)
      .where(eq(workflowRunSteps.id, id));

    return successResponse(created, 201);
  } catch (err) {
    console.error("[POST /api/runs/[runId]/steps]", err);
    return errorResponse("Failed to create step", 500);
  }
}

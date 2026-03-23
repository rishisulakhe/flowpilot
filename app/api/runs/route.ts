import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workflows, workflowRuns } from "@/db/schema";
import { generateId, parseJsonFields } from "@/lib/utils";
import { createRunSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

// ─── POST /api/runs ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createRunSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        result.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { workflowId, input } = result.data;

    const [workflow] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(eq(workflows.id, workflowId));

    if (!workflow) return errorResponse("Workflow not found", 404);

    const now = Date.now();
    const id = generateId();

    await db.insert(workflowRuns).values({
      id,
      workflowId,
      status: "running",
      input: input !== undefined ? JSON.stringify(input) : null,
      output: null,
      durationMs: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, id));

    return successResponse(parseJsonFields(created, ["input", "output"]), 201);
  } catch (err) {
    console.error("[POST /api/runs]", err);
    return errorResponse("Failed to create run", 500);
  }
}

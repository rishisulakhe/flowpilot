import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { WorkflowGraph } from "@/types/workflow";

type Params = { params: Promise<{ id: string }> };

// ─── POST /api/workflows/[id]/duplicate ────────────────────────────────────────

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [original] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!original) return errorResponse("Workflow not found", 404);

    const now = Date.now();
    const newId = generateId();

    await db.insert(workflows).values({
      id: newId,
      name: `${original.name} (Copy)`,
      description: original.description,
      graph: original.graph,
      isTemplate: false,
      templateCategory: null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, newId));

    return successResponse(
      { ...created, graph: JSON.parse(created.graph) as WorkflowGraph },
      201
    );
  } catch (err) {
    console.error("[POST /api/workflows/[id]/duplicate]", err);
    return errorResponse("Failed to duplicate workflow", 500);
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { createDefaultGraph } from "@/lib/default-graph";
import { createWorkflowSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { WorkflowGraph } from "@/types/workflow";

// ─── GET /api/workflows ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateParam = searchParams.get("template");

    const rows = await db
      .select()
      .from(workflows)
      .where(
        templateParam === "true"
          ? eq(workflows.isTemplate, true)
          : eq(workflows.isTemplate, false)
      )
      .orderBy(workflows.updatedAt);

    const data = rows.map((w) => ({
      ...w,
      graph: JSON.parse(w.graph) as WorkflowGraph,
    }));

    return successResponse(data);
  } catch (err) {
    console.error("[GET /api/workflows]", err);
    return errorResponse("Failed to fetch workflows", 500);
  }
}

// ─── POST /api/workflows ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createWorkflowSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues.map((i) => i.message).join(", "), 400);
    }

    const { name, description, graph } = result.data;
    const now = Date.now();
    const id = generateId();
    const graphData = graph ?? createDefaultGraph();

    await db.insert(workflows).values({
      id,
      name,
      description: description ?? null,
      graph: JSON.stringify(graphData),
      isTemplate: false,
      templateCategory: null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    return successResponse(
      { ...created, graph: JSON.parse(created.graph) as WorkflowGraph },
      201
    );
  } catch (err) {
    console.error("[POST /api/workflows]", err);
    return errorResponse("Failed to create workflow", 500);
  }
}

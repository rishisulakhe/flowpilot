import { eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { workflows, workflowRuns } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { parseJsonFields } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/workflows/[id]/runs ─────────────────────────────────────────────

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const [workflow] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) return errorResponse("Workflow not found", 404);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, id))
        .orderBy(desc(workflowRuns.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, id)),
    ]);

    const runs = rows.map((r) => parseJsonFields(r, ["input", "output"]));

    return successResponse({ runs, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/workflows/[id]/runs]", err);
    return errorResponse("Failed to fetch runs", 500);
  }
}

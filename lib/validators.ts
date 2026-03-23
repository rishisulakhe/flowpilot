import { z } from "zod";

const graphSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  graph: graphSchema.optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  graph: graphSchema.optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

// ─── Runs ──────────────────────────────────────────────────────────────────────

export const createRunSchema = z.object({
  workflowId: z.string().min(1),
  input: z.any().optional(),
});

export const updateRunSchema = z.object({
  status: z.enum(["running", "completed", "failed"]).optional(),
  output: z.any().optional(),
  durationMs: z.number().int().positive().optional(),
  error: z.string().optional(),
});

// ─── Steps ─────────────────────────────────────────────────────────────────────

export const createStepSchema = z.object({
  blockId: z.string().min(1),
  blockType: z.enum([
    "starter",
    "llm",
    "http",
    "condition",
    "transform",
    "merge",
    "output",
  ]),
  executionOrder: z.number().int().min(0),
});

export const updateStepSchema = z.object({
  status: z
    .enum(["pending", "running", "completed", "failed", "skipped"])
    .optional(),
  input: z.any().optional(),
  output: z.any().optional(),
  error: z.string().optional(),
  durationMs: z.number().int().positive().optional(),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;
export type UpdateRunInput = z.infer<typeof updateRunSchema>;
export type CreateStepInput = z.infer<typeof createStepSchema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;

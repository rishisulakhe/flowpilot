import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ─── workflows ────────────────────────────────────────────────────────────────

export const workflows = pgTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  graph: text("graph").notNull(), // JSON string: { nodes, edges }
  isTemplate: boolean("is_template").default(false).notNull(),
  templateCategory: text("template_category"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;

// ─── workflow_runs ─────────────────────────────────────────────────────────────

export const workflowRuns = pgTable("workflow_runs", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  status: text("status").notNull(), // "running" | "completed" | "failed"
  input: text("input"), // nullable JSON string
  output: text("output"), // nullable JSON string
  durationMs: integer("duration_ms"),
  error: text("error"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type WorkflowRun = InferSelectModel<typeof workflowRuns>;
export type NewWorkflowRun = InferInsertModel<typeof workflowRuns>;

// ─── workflow_run_steps ────────────────────────────────────────────────────────

export const workflowRunSteps = pgTable("workflow_run_steps", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => workflowRuns.id),
  blockId: text("block_id").notNull(),
  blockType: text("block_type").notNull(),
  status: text("status").notNull(), // "pending" | "running" | "completed" | "failed" | "skipped"
  input: text("input"), // nullable JSON string
  output: text("output"), // nullable JSON string
  error: text("error"),
  durationMs: integer("duration_ms"),
  executionOrder: integer("execution_order").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type WorkflowRunStep = InferSelectModel<typeof workflowRunSteps>;
export type NewWorkflowRunStep = InferInsertModel<typeof workflowRunSteps>;

// ─── api_keys ──────────────────────────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  keyEncrypted: text("key_encrypted").notNull(),
  keyHint: text("key_hint").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;

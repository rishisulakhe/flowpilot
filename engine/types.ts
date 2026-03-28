import type { BlockType, StepStatus, WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface ExecutionContext {
  /** Stores output from each block as they complete */
  results: Record<string, BlockResult>;
  /** The original user input to the workflow */
  workflowInput: unknown;
  /** Callback fired when a block's status changes */
  onBlockStatusChange?: (blockId: string, status: StepStatus, data?: unknown) => void;
  /** Callback fired when LLM streams a token */
  onBlockStream?: (blockId: string, token: string) => void;
}

export interface BlockResult {
  output: unknown;
  status: "completed" | "failed" | "skipped";
  error?: string;
  durationMs: number;
}

export interface ExecutionPlan {
  levels: string[][];
  nodeMap: Record<string, WorkflowNode>;
  adjacency: Record<string, string[]>;
  reverseAdj: Record<string, string[]>;
  edges: WorkflowEdge[];
}

export interface ExecutionResult {
  status: "completed" | "failed";
  results: Record<string, BlockResult>;
  /** Final output from Output block(s) */
  output: unknown;
  durationMs: number;
  error?: string;
}

export type BlockHandler = (
  input: unknown,
  config: Record<string, unknown>,
  context: ExecutionContext
) => Promise<unknown>;

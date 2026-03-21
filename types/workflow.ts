export type BlockType =
  | "starter"
  | "llm"
  | "http"
  | "condition"
  | "transform"
  | "merge"
  | "output";

export type RunStatus = "running" | "completed" | "failed";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type Position = {
  x: number;
  y: number;
};

export type WorkflowNode = {
  id: string;
  type: BlockType;
  position: Position;
  data: {
    label: string;
    config: Record<string, unknown>;
  };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

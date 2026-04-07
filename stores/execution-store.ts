import { create } from "zustand";

export type BlockStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface BlockState {
  status: BlockStatus;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export interface ExecutionResult {
  status: "completed" | "failed";
  output: unknown;
  durationMs: number;
  error?: string;
}

interface ExecutionState {
  isRunning: boolean;
  runId: string | null;
  startTime: number | null;
  blockStatuses: Record<string, BlockState>;
  blockOrder: string[];
  streamingTokens: Record<string, string>;
  executionResult: ExecutionResult | null;

  startExecution: (runId: string) => void;
  updateBlockStatus: (blockId: string, state: BlockState) => void;
  appendStreamToken: (blockId: string, token: string) => void;
  completeExecution: (result: ExecutionResult) => void;
  resetExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  isRunning: false,
  runId: null,
  startTime: null,
  blockStatuses: {},
  blockOrder: [],
  streamingTokens: {},
  executionResult: null,

  startExecution: (runId) =>
    set({
      isRunning: true,
      runId,
      startTime: Date.now(),
      blockStatuses: {},
      blockOrder: [],
      streamingTokens: {},
      executionResult: null,
    }),

  updateBlockStatus: (blockId, state) =>
    set((s) => ({
      blockStatuses: { ...s.blockStatuses, [blockId]: state },
      blockOrder: s.blockOrder.includes(blockId)
        ? s.blockOrder
        : [...s.blockOrder, blockId],
    })),

  appendStreamToken: (blockId, token) =>
    set((s) => ({
      streamingTokens: {
        ...s.streamingTokens,
        [blockId]: (s.streamingTokens[blockId] ?? "") + token,
      },
    })),

  completeExecution: (result) =>
    set({ isRunning: false, executionResult: result }),

  resetExecution: () =>
    set({
      isRunning: false,
      runId: null,
      startTime: null,
      blockStatuses: {},
      blockOrder: [],
      streamingTokens: {},
      executionResult: null,
    }),
}));

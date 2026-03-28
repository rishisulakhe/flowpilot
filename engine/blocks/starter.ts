import type { BlockHandler } from "../types";

export const starterHandler: BlockHandler = async (_input, _config, context) => {
  return context.workflowInput ?? _input ?? null;
};

import type { BlockHandler } from "../types";

export const mergeHandler: BlockHandler = async (input, config) => {
  const { strategy } = config as { strategy?: "combine" | "array" };

  if (strategy === "array") {
    return Array.isArray(input) ? input : Object.values(input as Record<string, unknown>);
  }

  // Default: 'combine'
  if (typeof input === "object" && input !== null) {
    return { ...(input as Record<string, unknown>) };
  }
  return input;
};

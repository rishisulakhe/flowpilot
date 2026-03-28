import type { BlockHandler } from "../types";

export const transformHandler: BlockHandler = async (input, config) => {
  const { expression } = config as { expression: string };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("input", `return (${expression})`);
    return fn(input);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Transform evaluation failed: ${message}`);
  }
};

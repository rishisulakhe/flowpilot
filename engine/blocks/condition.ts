import type { BlockHandler } from "../types";
import { resolveTemplates } from "../template-resolver";

export const conditionHandler: BlockHandler = async (input, config, context) => {
  const { expression } = config as { expression: string };

  const resolvedExpression = resolveTemplates(expression ?? "false", context) as string;

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("input", `return Boolean(${resolvedExpression})`);
    const result = fn(input) as boolean;
    return {
      result,
      selectedBranch: result ? "true" : "false",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Condition evaluation failed: ${message}`);
  }
};

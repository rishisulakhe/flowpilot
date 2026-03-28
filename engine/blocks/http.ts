import type { BlockHandler } from "../types";
import { resolveTemplates } from "../template-resolver";

export const httpHandler: BlockHandler = async (_input, config, context) => {
  const { method, url, headers, body } = config as {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };

  const resolvedUrl = resolveTemplates(url ?? "", context) as string;
  const resolvedHeaders = resolveTemplates(headers ?? {}, context) as Record<string, string>;
  const resolvedBody = resolveTemplates(body ?? "", context);

  // TODO: Replace with real fetch() in a later step
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    status: 200,
    data: `[Mock HTTP Response] ${method} ${resolvedUrl}`,
    headers: resolvedHeaders,
    body: resolvedBody,
  };
};

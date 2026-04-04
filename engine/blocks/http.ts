import { resolveTemplates } from "../template-resolver";
import type { BlockHandler } from "../types";

export const httpHandler: BlockHandler = async (_input, config, context) => {
  const { method = "GET", url, headers, body } = config as {
    method?: string;
    url: unknown;
    headers?: unknown;
    body?: unknown;
  };

  const resolvedUrl = resolveTemplates(url, context);
  const resolvedHeaders = resolveTemplates(headers ?? {}, context);
  const resolvedBody = resolveTemplates(body, context);

  if (!resolvedUrl || typeof resolvedUrl !== "string") {
    throw new Error("HTTP block requires a valid URL");
  }

  try {
    const reqHeaders: Record<string, string> =
      typeof resolvedHeaders === "object" && resolvedHeaders !== null
        ? { ...(resolvedHeaders as Record<string, string>) }
        : {};

    const fetchOptions: RequestInit = {
      method: (method as string).toUpperCase(),
      headers: reqHeaders,
    };

    if (
      ["POST", "PUT", "PATCH"].includes((method as string).toUpperCase()) &&
      resolvedBody
    ) {
      fetchOptions.body =
        typeof resolvedBody === "string"
          ? resolvedBody
          : JSON.stringify(resolvedBody);
      if (!reqHeaders["Content-Type"]) {
        reqHeaders["Content-Type"] = "application/json";
      }
    }

    const response = await fetch(resolvedUrl, fetchOptions);

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      status: response.status,
      statusText: response.statusText,
      data,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`HTTP request failed: ${message}`);
  }
};

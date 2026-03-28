import type { ExecutionContext } from "./types";

const TEMPLATE_RE = /\{\{([^}]+)\}\}/g;

function resolvePath(path: string, context: ExecutionContext): unknown {
  const segments = path.trim().split(".");
  const [blockId, ...rest] = segments;

  const blockResult = context.results[blockId];
  if (!blockResult) return `{{${path}}}`;

  // Start from the full BlockResult, then walk the remaining path
  let value: unknown = blockResult;
  for (const seg of rest) {
    if (value === null || value === undefined) return `{{${path}}}`;
    value = (value as Record<string, unknown>)[seg];
  }
  return value;
}

export function resolveTemplates(value: unknown, context: ExecutionContext): unknown {
  if (typeof value === "string") {
    const matches = [...value.matchAll(TEMPLATE_RE)];
    if (matches.length === 0) return value;

    // Single template that is the whole string → return raw value
    if (matches.length === 1 && matches[0][0] === value) {
      return resolvePath(matches[0][1], context);
    }

    // Templates embedded in larger string → stringify each substitution
    return value.replace(TEMPLATE_RE, (_, path: string) => {
      const resolved = resolvePath(path, context);
      if (resolved === null || resolved === undefined) return "";
      return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplates(item, context));
  }

  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveTemplates(v, context);
    }
    return result;
  }

  return value;
}

export function extractTemplateVariables(text: string): string[] {
  const blockIds: string[] = [];
  for (const match of text.matchAll(TEMPLATE_RE)) {
    const segments = match[1].trim().split(".");
    if (segments[0]) blockIds.push(segments[0]);
  }
  return [...new Set(blockIds)];
}

type SSEHandlers = {
  onExecutionStart?: (data: Record<string, unknown>) => void;
  onBlockStatus?: (data: Record<string, unknown>) => void;
  onBlockStream?: (data: Record<string, unknown>) => void;
  onExecutionComplete?: (data: Record<string, unknown>) => void;
  onExecutionError?: (data: Record<string, unknown>) => void;
  onDone?: () => void;
};

export async function consumeSSE(
  url: string,
  body: unknown,
  handlers: SSEHandlers,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? "Execution failed");
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          switch (currentEvent) {
            case "execution_start":   handlers.onExecutionStart?.(data);   break;
            case "block_status":      handlers.onBlockStatus?.(data);      break;
            case "block_stream":      handlers.onBlockStream?.(data);      break;
            case "execution_complete": handlers.onExecutionComplete?.(data); break;
            case "execution_error":   handlers.onExecutionError?.(data);   break;
          }
        } catch {
          // ignore malformed JSON lines
        }
      } else if (line.startsWith(": done")) {
        handlers.onDone?.();
      }
    }
  }
}

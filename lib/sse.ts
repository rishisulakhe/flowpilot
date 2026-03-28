export class SSEStream {
  private encoder: TextEncoder;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  public readable: ReadableStream<Uint8Array>;

  constructor() {
    this.encoder = new TextEncoder();
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        this.controller = null;
      },
    });
  }

  send(event: string, data: unknown): void {
    if (!this.controller) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(payload));
  }

  close(): void {
    if (!this.controller) return;
    this.controller.enqueue(this.encoder.encode(": done\n\n"));
    this.controller.close();
    this.controller = null;
  }

  error(message: string): void {
    this.send("execution_error", { error: message });
    this.close();
  }

  get headers(): HeadersInit {
    return {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };
  }
}

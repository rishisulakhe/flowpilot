import { SSEStream } from "@/lib/sse";

export async function GET() {
  const sse = new SSEStream();

  (async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      sse.send("tick", { count: i + 1, message: `Event ${i + 1} of 5` });
    }
    sse.send("done", { message: "All events sent" });
    sse.close();
  })();

  return new Response(sse.readable, { headers: sse.headers });
}

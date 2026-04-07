import { generateText } from "ai";
import { getModel } from "@/lib/ai";
import { successResponse, errorResponse } from "@/lib/api-response";

const SYSTEM_PROMPT = `You are a workflow builder AI for FlowPilot. Given a user's description, generate a workflow graph as a JSON object.

Available block types and their configs:
- starter: Entry point. Config: {}
- llm: AI model call. Config: { provider: "google"|"openai"|"anthropic", model: string, systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number }
- http: HTTP request. Config: { method: "GET"|"POST"|"PUT"|"DELETE", url: string, headers: string (JSON), body: string }
- condition: If/else branch. Config: { expression: string } — expression evaluates to true/false using \`input\` variable
- transform: Data transformation. Config: { expression: string } — expression returns a new value using \`input\`
- merge: Combine inputs. Config: { strategy: "combine"|"array" }
- output: Final result. Config: { format: "text"|"json"|"markdown" }

Graph format:
{
  "nodes": [
    { "id": "starter_1", "type": "starter", "position": {"x": 100, "y": 200}, "data": { "label": "Start", "config": {} } },
    ...
  ],
  "edges": [
    { "id": "e1", "source": "starter_1", "target": "llm_1" },
    ...
  ]
}

Layout rules:
- Place starter at x=100, y=200
- Increment x by 280 for each subsequent node left-to-right
- For condition branches: true branch goes at y=100, false branch at y=300
- For the id, use format: {type}_{number} (e.g., starter_1, llm_1, http_1)
- For condition edges, add sourceHandle: "true" or sourceHandle: "false"
- Use "google" as the default LLM provider with model "gemini-2.5-flash"

IMPORTANT: Respond with ONLY a JSON object in this exact format (no markdown, no explanation outside JSON):
{
  "graph": { "nodes": [...], "edges": [...] },
  "explanation": "Brief description of what this workflow does"
}`;

function pickProvider(): { provider: string; model: string } {
  if (process.env.GOOGLE_API_KEY) return { provider: "google", model: "gemini-2.5-flash" };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", model: "gpt-4o-mini" };
  if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", model: "claude-haiku-4-5-20251001" };
  throw new Error("No AI provider configured");
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt) return errorResponse("prompt is required");

    const { provider, model } = pickProvider();

    const { text } = await generateText({
      model: getModel(provider, model),
      system: SYSTEM_PROMPT,
      prompt,
    });

    // Extract JSON — try direct parse first, then look for JSON block
    let parsed: { graph: unknown; explanation?: string } | null = null;
    try {
      parsed = JSON.parse(text) as { graph: unknown; explanation?: string };
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
      if (match) {
        try { parsed = JSON.parse(match[1]) as { graph: unknown; explanation?: string }; } catch {}
      }
    }

    if (!parsed?.graph) {
      return errorResponse("Could not generate a valid workflow graph", 500);
    }

    return successResponse({
      graph: parsed.graph,
      explanation: parsed.explanation ?? "Workflow generated successfully.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return errorResponse(msg, 500);
  }
}

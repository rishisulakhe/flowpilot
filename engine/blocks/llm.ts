import type { BlockHandler } from "../types";
import { resolveTemplates } from "../template-resolver";

export const llmHandler: BlockHandler = async (_input, config, context) => {
  const { provider, model, systemPrompt, userPrompt } = config as {
    provider: string;
    model: string;
    systemPrompt?: string;
    userPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  };

  const resolvedUserPrompt = resolveTemplates(userPrompt ?? "", context) as string;
  const resolvedSystemPrompt = resolveTemplates(systemPrompt ?? "", context) as string;

  // TODO: Replace with real AI SDK call in Step 6
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockResponse = `[Mock LLM Response] Model: ${provider}/${model}, System: "${resolvedSystemPrompt}", Prompt: "${resolvedUserPrompt}"`;

  return {
    text: mockResponse,
    model,
    provider,
    tokensUsed: 0,
  };
};

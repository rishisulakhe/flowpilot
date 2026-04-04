import { streamText, generateText } from "ai";
import { getModel } from "@/lib/ai";
import { resolveTemplates } from "../template-resolver";
import type { BlockHandler } from "../types";

const KEY_ENV: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
};

export const llmHandler: BlockHandler = async (input, config, context) => {
  const {
    provider = "openai",
    model = "gpt-4o-mini",
    systemPrompt,
    userPrompt,
    temperature = 0.7,
    maxTokens = 1024,
  } = config as Record<string, unknown>;

  const resolvedUser = userPrompt
    ? resolveTemplates(userPrompt, context)
    : JSON.stringify(input);
  const resolvedSystem = systemPrompt
    ? resolveTemplates(systemPrompt, context)
    : undefined;

  const promptText =
    typeof resolvedUser === "string" ? resolvedUser : JSON.stringify(resolvedUser);
  const systemText =
    typeof resolvedSystem === "string"
      ? resolvedSystem
      : resolvedSystem
        ? JSON.stringify(resolvedSystem)
        : undefined;

  // Validate API key before calling
  const envVar = KEY_ENV[provider as string];
  if (envVar && !process.env[envVar]) {
    throw new Error(
      `${provider} API key is not set. Add ${envVar} to your .env.local file.`
    );
  }

  try {
    const modelInstance = getModel(provider as string, model as string);

    if (context.onBlockStream) {
      // AI SDK v6: streamText returns synchronously — NOT a promise
      // Errors don't throw — they appear as 'error' parts in fullStream
      const result = streamText({
        model: modelInstance,
        system: systemText,
        prompt: promptText,
        temperature: temperature as number,
        maxOutputTokens: maxTokens as number,
      });

      let fullText = "";
      let streamError: Error | null = null;

      // Use fullStream to catch error parts alongside text-delta parts
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            fullText += part.text;
            context.onBlockStream("", part.text);
          } else if (part.type === "error") {
            const e = part.error;
            if (e instanceof Error) {
              streamError = e;
            } else if (typeof e === "object" && e !== null && "message" in e) {
              streamError = new Error((e as { message: string }).message);
            } else {
              streamError = new Error(JSON.stringify(e));
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          streamError = err;
        } else if (typeof err === "object" && err !== null && "message" in err) {
          streamError = new Error((err as { message: string }).message);
        } else {
          streamError = new Error(JSON.stringify(err));
        }
      }

      if (streamError) throw streamError;

      if (!fullText) {
        // Fallback to generateText if streaming produced nothing
        const fb = await generateText({
          model: modelInstance,
          system: systemText,
          prompt: promptText,
          temperature: temperature as number,
          maxOutputTokens: maxTokens as number,
        });
        return {
          text: fb.text,
          model,
          provider,
          finishReason: fb.finishReason,
          tokensUsed: {
            input: fb.usage?.inputTokens ?? 0,
            output: fb.usage?.outputTokens ?? 0,
            total: (fb.usage?.inputTokens ?? 0) + (fb.usage?.outputTokens ?? 0),
          },
        };
      }

      // Get usage after stream is fully consumed
      let usage: { inputTokens?: number; outputTokens?: number } = {};
      let finishReason: string = "unknown";
      try {
        usage = await result.usage;
        finishReason = await result.finishReason;
      } catch {
        // Usage info might not be available
      }

      return {
        text: fullText,
        model,
        provider,
        finishReason,
        tokensUsed: {
          input: usage?.inputTokens ?? 0,
          output: usage?.outputTokens ?? 0,
          total: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        },
      };
    }

    // No stream callback — single response via generateText
    const result = await generateText({
      model: modelInstance,
      system: systemText,
      prompt: promptText,
      temperature: temperature as number,
      maxOutputTokens: maxTokens as number,
    });

    return {
      text: result.text,
      model,
      provider,
      finishReason: result.finishReason,
      tokensUsed: {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0,
        total:
          (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("401") ||
      msg.includes("authentication") ||
      msg.includes("invalid x-api-key")
    ) {
      throw new Error(
        `${provider} API key is invalid. Check ${envVar} in .env.local`
      );
    }
    if (msg.includes("429") || msg.includes("rate limit")) {
      throw new Error(`${provider} rate limit exceeded. Wait and try again.`);
    }
    if (msg.includes("404") || msg.includes("not found")) {
      throw new Error(`Model "${model}" not found for ${provider}. Check the model ID.`);
    }
    throw new Error(`LLM call failed (${provider}/${model}): ${msg}`);
  }
};

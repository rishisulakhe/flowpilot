import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getModel(provider: string, modelName: string) {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return openai(modelName);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      return anthropic(modelName);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
      return google(modelName);
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}. Supported: openai, anthropic, google`);
  }
}

export const availableModels = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
  google: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  ],
};

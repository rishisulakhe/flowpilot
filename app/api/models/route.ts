import { availableModels } from "@/lib/ai";
import { successResponse } from "@/lib/api-response";

export async function GET() {
  const providers = {
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      models: availableModels.openai,
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      models: availableModels.anthropic,
    },
    google: {
      configured: !!process.env.GOOGLE_API_KEY,
      models: availableModels.google,
    },
  };
  return successResponse(providers);
}

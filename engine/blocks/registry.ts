import type { BlockType } from "@/types/workflow";
import type { BlockHandler } from "../types";
import { starterHandler } from "./starter";
import { llmHandler } from "./llm";
import { httpHandler } from "./http";
import { conditionHandler } from "./condition";
import { transformHandler } from "./transform";
import { mergeHandler } from "./merge";
import { outputHandler } from "./output";

export const blockHandlers: Record<BlockType, BlockHandler> = {
  starter: starterHandler,
  llm: llmHandler,
  http: httpHandler,
  condition: conditionHandler,
  transform: transformHandler,
  merge: mergeHandler,
  output: outputHandler,
};

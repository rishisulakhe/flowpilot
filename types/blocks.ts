export type StarterConfig = Record<string, never>;

export type LLMConfig = {
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  structuredOutput?: Record<string, unknown>;
};

export type HttpConfig = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export type ConditionConfig = {
  expression: string;
};

export type TransformConfig = {
  expression: string;
};

export type MergeConfig = {
  strategy: "combine" | "array";
};

export type OutputConfig = {
  format: "text" | "json" | "markdown";
};

export type BlockConfig =
  | ({ type: "starter" } & StarterConfig)
  | ({ type: "llm" } & LLMConfig)
  | ({ type: "http" } & HttpConfig)
  | ({ type: "condition" } & ConditionConfig)
  | ({ type: "transform" } & TransformConfig)
  | ({ type: "merge" } & MergeConfig)
  | ({ type: "output" } & OutputConfig);

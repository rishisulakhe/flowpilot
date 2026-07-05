/**
 * Seed 4 template workflows into the database.
 * Run with: bunx tsx scripts/seed-templates.ts
 */
import { db } from "../db";
import { workflows } from "../db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

function wid() { return nanoid(21); }
const now = () => Date.now();

const TEMPLATES = [
  // ── Template 1: URL Summarizer ────────────────────────────────────────────
  {
    id: wid(),
    name: "URL Summarizer",
    description: "Fetch any URL and get an AI-powered summary",
    isTemplate: true,
    templateCategory: "ai",
    graph: {
      nodes: [
        {
          id: "starter_1", type: "starter",
          position: { x: 80, y: 200 },
          data: { label: "URL Input", config: {} },
        },
        {
          id: "http_1", type: "http",
          position: { x: 360, y: 200 },
          data: { label: "Fetch URL", config: { method: "GET", url: "{{starter_1.output}}", headers: "{}", body: "" } },
        },
        {
          id: "llm_1", type: "llm",
          position: { x: 640, y: 200 },
          data: {
            label: "Summarize",
            config: {
              provider: "anthropic", model: "claude-haiku-4-5-20251001",
              systemPrompt: "Summarize the following content concisely in 3-5 sentences.",
              userPrompt: "{{http_1.output.data}}",
              temperature: 0.5, maxTokens: 512,
            },
          },
        },
        {
          id: "output_1", type: "output",
          position: { x: 920, y: 200 },
          data: { label: "Summary", config: { format: "text" } },
        },
      ],
      edges: [
        { id: "e1", source: "starter_1", target: "http_1",  type: "custom" },
        { id: "e2", source: "http_1",    target: "llm_1",   type: "custom" },
        { id: "e3", source: "llm_1",     target: "output_1",type: "custom" },
      ],
    },
  },

  // ── Template 2: Content Classifier ───────────────────────────────────────
  {
    id: wid(),
    name: "Content Classifier",
    description: "Classify text content into categories using AI",
    isTemplate: true,
    templateCategory: "ai",
    graph: {
      nodes: [
        {
          id: "starter_1", type: "starter",
          position: { x: 80, y: 240 },
          data: { label: "Text Input", config: {} },
        },
        {
          id: "llm_1", type: "llm",
          position: { x: 360, y: 240 },
          data: {
            label: "Classify",
            config: {
              provider: "google", model: "gemini-2.5-flash",
              systemPrompt: "Classify the input as exactly one of: tech, business, science, other. Respond with only the category word in lowercase.",
              userPrompt: "{{starter_1.output}}",
              temperature: 0, maxTokens: 50,
            },
          },
        },
        {
          id: "condition_1", type: "condition",
          position: { x: 640, y: 240 },
          data: { label: "Is Tech?", config: { expression: "input.text === 'tech'" } },
        },
        {
          id: "output_1", type: "output",
          position: { x: 920, y: 120 },
          data: { label: "Tech Content", config: { format: "text" } },
        },
        {
          id: "output_2", type: "output",
          position: { x: 920, y: 360 },
          data: { label: "Non-Tech Content", config: { format: "text" } },
        },
      ],
      edges: [
        { id: "e1", source: "starter_1",   target: "llm_1",     type: "custom" },
        { id: "e2", source: "llm_1",        target: "condition_1", type: "custom" },
        { id: "e3", source: "condition_1",  target: "output_1",  type: "custom", sourceHandle: "true" },
        { id: "e4", source: "condition_1",  target: "output_2",  type: "custom", sourceHandle: "false" },
      ],
    },
  },

  // ── Template 3: Multi-Model Compare ──────────────────────────────────────
  {
    id: wid(),
    name: "Multi-Model Compare",
    description: "Compare responses from multiple AI models side by side",
    isTemplate: true,
    templateCategory: "ai",
    graph: {
      nodes: [
        {
          id: "starter_1", type: "starter",
          position: { x: 80, y: 240 },
          data: { label: "Question", config: {} },
        },
        {
          id: "llm_1", type: "llm",
          position: { x: 360, y: 120 },
          data: {
            label: "GPT-4o Mini",
            config: {
              provider: "openai", model: "gpt-4o-mini",
              systemPrompt: "Answer the question clearly and concisely.",
              userPrompt: "{{starter_1.output}}",
              temperature: 0.7, maxTokens: 512,
            },
          },
        },
        {
          id: "llm_2", type: "llm",
          position: { x: 360, y: 360 },
          data: {
            label: "Claude Haiku",
            config: {
              provider: "anthropic", model: "claude-haiku-4-5-20251001",
              systemPrompt: "Answer the question clearly and concisely.",
              userPrompt: "{{starter_1.output}}",
              temperature: 0.7, maxTokens: 512,
            },
          },
        },
        {
          id: "merge_1", type: "merge",
          position: { x: 640, y: 240 },
          data: { label: "Combine Results", config: { strategy: "combine" } },
        },
        {
          id: "output_1", type: "output",
          position: { x: 920, y: 240 },
          data: { label: "Comparison", config: { format: "json" } },
        },
      ],
      edges: [
        { id: "e1", source: "starter_1", target: "llm_1",   type: "custom" },
        { id: "e2", source: "starter_1", target: "llm_2",   type: "custom" },
        { id: "e3", source: "llm_1",     target: "merge_1", type: "custom" },
        { id: "e4", source: "llm_2",     target: "merge_1", type: "custom" },
        { id: "e5", source: "merge_1",   target: "output_1",type: "custom" },
      ],
    },
  },

  // ── Template 4: Webhook Processor ────────────────────────────────────────
  {
    id: wid(),
    name: "Webhook Processor",
    description: "Process incoming webhook data with conditional routing",
    isTemplate: true,
    templateCategory: "automation",
    graph: {
      nodes: [
        {
          id: "starter_1", type: "starter",
          position: { x: 80, y: 240 },
          data: { label: "Webhook Input", config: {} },
        },
        {
          id: "transform_1", type: "transform",
          position: { x: 360, y: 240 },
          data: {
            label: "Extract Fields",
            config: { expression: "({ id: input.id, priority: input.priority, payload: input.payload })" },
          },
        },
        {
          id: "condition_1", type: "condition",
          position: { x: 640, y: 240 },
          data: { label: "High Priority?", config: { expression: "input.priority === 'high'" } },
        },
        {
          id: "http_1", type: "http",
          position: { x: 920, y: 120 },
          data: {
            label: "Forward to Webhook",
            config: {
              method: "POST",
              url: "https://hooks.example.com/alerts",
              headers: '{"Content-Type":"application/json"}',
              body: "{{condition_1.output}}",
            },
          },
        },
        {
          id: "output_1", type: "output",
          position: { x: 920, y: 360 },
          data: { label: "Discard", config: { format: "text" } },
        },
      ],
      edges: [
        { id: "e1", source: "starter_1",   target: "transform_1", type: "custom" },
        { id: "e2", source: "transform_1", target: "condition_1",  type: "custom" },
        { id: "e3", source: "condition_1", target: "http_1",       type: "custom", sourceHandle: "true" },
        { id: "e4", source: "condition_1", target: "output_1",     type: "custom", sourceHandle: "false" },
      ],
    },
  },
];

async function main() {
  console.log("Seeding template workflows…");

  // Skip if templates already exist
  const existing = await db.select().from(workflows).where(eq(workflows.isTemplate, true));
  if (existing.length > 0) {
    console.log(`  → ${existing.length} templates already exist. Skipping.`);
    console.log("     (Delete them first if you want to re-seed.)");
    process.exit(0);
  }

  for (const tpl of TEMPLATES) {
    const ts = now();
    await db.insert(workflows).values({
      id: tpl.id,
      userId: "system_migration",
      name: tpl.name,
      description: tpl.description,
      graph: JSON.stringify(tpl.graph),
      isTemplate: tpl.isTemplate,
      templateCategory: tpl.templateCategory,
      createdAt: ts,
      updatedAt: ts,
    });
    console.log(`  ✓ Inserted "${tpl.name}"`);
  }

  console.log(`\nDone! ${TEMPLATES.length} templates seeded.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

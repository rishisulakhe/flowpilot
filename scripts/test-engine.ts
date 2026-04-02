import { executeWorkflow } from "../engine";
import type { WorkflowGraph } from "../types/workflow";

// Test 1: Simple linear workflow — Starter → LLM → Output
const linearGraph: WorkflowGraph = {
  nodes: [
    { id: "starter_1", type: "starter", position: { x: 0, y: 0 }, data: { label: "Start", config: {} } },
    { id: "llm_1", type: "llm", position: { x: 300, y: 0 }, data: { label: "Summarize", config: { provider: "openai", model: "gpt-4o", systemPrompt: "You are helpful", userPrompt: "{{starter_1.output}}", temperature: 0.7, maxTokens: 100 } } },
    { id: "output_1", type: "output", position: { x: 600, y: 0 }, data: { label: "Result", config: { format: "text" } } },
  ],
  edges: [
    { id: "e1", source: "starter_1", target: "llm_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "llm_1", target: "output_1", sourceHandle: "output", targetHandle: "input" },
  ],
};

// Test 2: Branching workflow — Starter → Condition → Output_True / Output_False
const branchGraph: WorkflowGraph = {
  nodes: [
    { id: "starter_1", type: "starter", position: { x: 0, y: 0 }, data: { label: "Start", config: {} } },
    { id: "condition_1", type: "condition", position: { x: 300, y: 0 }, data: { label: "Check", config: { expression: "input.value > 10" } } },
    { id: "output_true", type: "output", position: { x: 600, y: -100 }, data: { label: "Greater", config: { format: "text" } } },
    { id: "output_false", type: "output", position: { x: 600, y: 100 }, data: { label: "Smaller", config: { format: "text" } } },
  ],
  edges: [
    { id: "e1", source: "starter_1", target: "condition_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "condition_1", target: "output_true", sourceHandle: "true", targetHandle: "input" },
    { id: "e3", source: "condition_1", target: "output_false", sourceHandle: "false", targetHandle: "input" },
  ],
};

// Test 3: Cycle detection — Starter → A → B → A (should fail)
const cycleGraph: WorkflowGraph = {
  nodes: [
    { id: "starter_1", type: "starter", position: { x: 0, y: 0 }, data: { label: "Start", config: {} } },
    { id: "a", type: "transform", position: { x: 300, y: 0 }, data: { label: "A", config: { expression: "input" } } },
    { id: "b", type: "transform", position: { x: 600, y: 0 }, data: { label: "B", config: { expression: "input" } } },
  ],
  edges: [
    { id: "e1", source: "starter_1", target: "a" },
    { id: "e2", source: "a", target: "b" },
    { id: "e3", source: "b", target: "a" }, // CYCLE!
  ],
};

async function runTests() {
  console.log("=== Test 1: Linear Workflow ===");
  const result1 = await executeWorkflow(linearGraph, "Hello, summarize AI news");
  console.log("Status:", result1.status);
  console.log("Duration:", result1.durationMs, "ms");
  console.log("Output:", JSON.stringify(result1.output, null, 2));
  console.log("Block results:", Object.keys(result1.results).map((k) => `${k}: ${result1.results[k].status}`));
  console.log("");

  console.log("=== Test 2: Branching (value=15, should go TRUE) ===");
  const result2a = await executeWorkflow(branchGraph, { value: 15 });
  console.log("Status:", result2a.status);
  console.log("Block results:", Object.keys(result2a.results).map((k) => `${k}: ${result2a.results[k].status}`));
  console.log("Output true should be completed, output false should be skipped");
  console.log("");

  console.log("=== Test 2b: Branching (value=5, should go FALSE) ===");
  const result2b = await executeWorkflow(branchGraph, { value: 5 });
  console.log("Status:", result2b.status);
  console.log("Block results:", Object.keys(result2b.results).map((k) => `${k}: ${result2b.results[k].status}`));
  console.log("Output true should be skipped, output false should be completed");
  console.log("");

  console.log("=== Test 3: Cycle Detection ===");
  const result3 = await executeWorkflow(cycleGraph, "test");
  console.log("Status:", result3.status);
  console.log("Error:", result3.error);
  console.log("Should be failed with cycle error");
}

runTests().catch(console.error);

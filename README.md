# FlowPilot

**Visual AI Workflow Builder & Orchestration Engine**

FlowPilot is a full-stack visual workflow builder that lets you design, execute, and monitor AI-powered data pipelines in a drag-and-drop canvas. Connect LLM blocks, HTTP requests, conditionals, and transforms into multi-step workflows — then run them with real-time SSE streaming and watch every node light up as it executes.

---

## Features

- **Visual canvas editor** — drag-and-drop 7 block types onto a React Flow canvas with auto-save
- **7 block types** — Starter, LLM, HTTP Request, Condition (if/else), Transform, Merge, Output
- **Real-time execution** — SSE streaming shows each node's status live; LLM tokens stream character-by-character into the node
- **Multi-provider LLM support** — OpenAI, Anthropic, and Google Gemini via AI SDK v6
- **Condition branching** — `true`/`false` handles route execution down different paths with transitive skip propagation
- **AI Copilot** — describe a workflow in plain English and have it generated and applied to the canvas instantly
- **Run Log panel** — live execution timeline with expandable per-step input/output JSON, elapsed timer, and final output
- **Template library** — 4 pre-built templates (URL Summarizer, Content Classifier, Multi-Model Compare, Webhook Processor)
- **Keyboard shortcuts** — `⌘S` save, `⌘Enter` run, `⌘D` duplicate, `Del` delete, `Space` fit view
- **Workflow persistence** — all graphs saved to PostgreSQL via Drizzle ORM with debounced auto-save

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router, TypeScript |
| Runtime | Bun |
| Styling | Tailwind CSS v4, shadcn/ui |
| Canvas | React Flow v12 (`@xyflow/react`) |
| State | Zustand v5 |
| Database | PostgreSQL (Neon), Drizzle ORM |
| AI | AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| Streaming | Server-Sent Events (SSE) via `ReadableStream` |
| Validation | Zod v4 |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- A PostgreSQL database (e.g. [Neon](https://neon.tech) free tier)
- At least one AI API key: [Google AI Studio](https://aistudio.google.com), [OpenAI](https://platform.openai.com), or [Anthropic](https://console.anthropic.com)

### Installation

```bash
git clone https://github.com/yourusername/flowpilot.git
cd flowpilot
bun install

cp .env.example .env.local
# Fill in your DATABASE_URL and at least one AI key
```

### Environment Variables

```env
DATABASE_URL=postgresql://...

# Add at least one:
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### Database Setup

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate

# Optional: seed 4 template workflows
bunx tsx --env-file=.env.local scripts/seed-templates.ts
```

### Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
flowpilot/
├── app/
│   ├── api/
│   │   ├── copilot/        # AI Copilot endpoint
│   │   ├── execute/        # SSE workflow execution
│   │   ├── models/         # Available AI models
│   │   ├── runs/           # Run history CRUD
│   │   └── workflows/      # Workflow CRUD
│   ├── workflow/[id]/      # Canvas editor page
│   └── page.tsx            # Dashboard
├── components/
│   ├── canvas/
│   │   ├── nodes/          # 7 custom React Flow node components
│   │   ├── edges/          # Custom edge with glow
│   │   ├── BlockLibrary    # Left panel
│   │   ├── BlockConfigPanel # Right config panel
│   │   ├── RunLogPanel     # Live execution log panel
│   │   └── CopilotPanel    # AI Copilot chat panel
│   └── dashboard/          # Workflow + template cards
├── engine/
│   ├── blocks/             # LLM, HTTP, condition, transform, merge, output handlers
│   ├── cycle-detector.ts   # DFS three-color cycle detection
│   ├── topological-sort.ts # Kahn's algorithm for parallel execution levels
│   ├── template-resolver.ts# {{blockId.output.field}} template interpolation
│   └── executor.ts         # Main execution orchestrator
├── stores/
│   ├── workflow-store.ts   # Zustand: nodes, edges, selection
│   └── execution-store.ts  # Zustand: run status, streaming tokens
├── lib/
│   ├── ai.ts               # AI provider factory
│   ├── sse.ts              # SSEStream class
│   └── sse-client.ts       # Frontend SSE consumer
├── db/
│   ├── schema.ts           # Drizzle schema
│   └── index.ts            # DB client
└── scripts/
    └── seed-templates.ts   # Template seeder
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘S` / `Ctrl+S` | Save workflow |
| `⌘Enter` / `Ctrl+Enter` | Open run dialog |
| `⌘D` / `Ctrl+D` | Duplicate selected node |
| `Delete` / `Backspace` | Delete selected node |
| `Space` | Fit canvas to view |
| `Escape` | Deselect / close panels |

---

## License

MIT

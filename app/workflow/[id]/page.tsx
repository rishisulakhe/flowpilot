"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Settings, History, Share2, Play, Save, Search, ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { BlockLibrary } from "@/components/canvas/BlockLibrary";
import { BlockConfigPanel } from "@/components/canvas/BlockConfigPanel";
import { StarterNode } from "@/components/canvas/nodes/StarterNode";
import { LLMNode } from "@/components/canvas/nodes/LLMNode";
import { HttpNode } from "@/components/canvas/nodes/HttpNode";
import { ConditionNode } from "@/components/canvas/nodes/ConditionNode";
import { TransformNode } from "@/components/canvas/nodes/TransformNode";
import { MergeNode } from "@/components/canvas/nodes/MergeNode";
import { OutputNode } from "@/components/canvas/nodes/OutputNode";
import { CustomEdge } from "@/components/canvas/edges/CustomEdge";

import { useWorkflowStore } from "@/stores/workflow-store";
import { useExecutionStore } from "@/stores/execution-store";
import { generateBlockId } from "@/lib/utils";
import type { BlockType } from "@/types/workflow";

// Node/edge type registries — must be stable (outside component or useMemo)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NODE_TYPES: NodeTypes = {
  starter: StarterNode as any,
  llm: LLMNode as any,
  http: HttpNode as any,
  condition: ConditionNode as any,
  transform: TransformNode as any,
  merge: MergeNode as any,
  output: OutputNode as any,
};

const EDGE_TYPES: EdgeTypes = {
  custom: CustomEdge,
};

const DEFAULT_CONFIGS: Record<BlockType, Record<string, unknown>> = {
  starter:   {},
  llm:       { provider: "openai", model: "gpt-4o-mini", systemPrompt: "", userPrompt: "", temperature: 0.7, maxTokens: 1024 },
  http:      { method: "GET", url: "", headers: "{}", body: "" },
  condition: { expression: "" },
  transform: { expression: "" },
  merge:     { strategy: "combine" },
  output:    { format: "text" },
};

const BLOCK_LABELS: Record<BlockType, string> = {
  starter: "Start", llm: "LLM", http: "HTTP Request",
  condition: "Condition", transform: "Transform", merge: "Merge", output: "Output",
};

// ─── Inner canvas (needs ReactFlowProvider context) ─────────────────────────

function CanvasInner({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();

  const {
    workflowId: storeId, workflowName, nodes, edges, selectedNodeId, isSaved,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNode, setWorkflowName, setSaved, loadWorkflow,
  } = useWorkflowStore();

  const { isRunning, startExecution, updateBlockStatus, appendStreamToken, completeExecution } = useExecutionStore();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Auto-save debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load workflow ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (storeId === workflowId) { setLoading(false); return; }
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) { setNotFound(true); return; }
        loadWorkflow(j.data.id, j.data.name, j.data.graph);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // ── Auto-save when store changes ──────────────────────────────────────────

  useEffect(() => {
    if (isSaved || storeId !== workflowId) return;
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { handleSave(true); }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, workflowName, isSaved]);

  // ── Save handler ──────────────────────────────────────────────────────────

  async function handleSave(auto = false) {
    if (!auto) setSaveStatus("saving");
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workflowName, graph: { nodes, edges } }),
    });
    if (res.ok) { setSaved(true); setSaveStatus("saved"); }
  }

  // ── Run workflow ──────────────────────────────────────────────────────────

  async function handleRun() {
    setRunDialogOpen(false);
    startExecution("pending");

    const res = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId, input: runInput || null }),
    });

    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const eventLine = part.split("\n").find((l) => l.startsWith("event:"));
        const dataLine  = part.split("\n").find((l) => l.startsWith("data:"));
        if (!eventLine || !dataLine) continue;

        const event = eventLine.replace("event:", "").trim();
        let data: Record<string, unknown>;
        try { data = JSON.parse(dataLine.replace("data:", "").trim()); } catch { continue; }

        if (event === "execution_start") {
          startExecution(data.runId as string);
        } else if (event === "block_status") {
          updateBlockStatus(data.blockId as string, {
            status: data.status as "pending" | "running" | "completed" | "failed" | "skipped",
            output: data.output,
            error: data.error as string | undefined,
            durationMs: data.durationMs as number | undefined,
          });
        } else if (event === "block_stream") {
          appendStreamToken(data.blockId as string, data.token as string);
        } else if (event === "execution_complete") {
          completeExecution({
            status: data.status as "completed" | "failed",
            output: data.output,
            durationMs: data.durationMs as number,
            error: data.error as string | undefined,
          });
        }
      }
    }
  }

  // ── Drag-and-drop onto canvas ─────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData("application/flowpilot-block-type") as BlockType;
    if (!blockType) return;

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = generateBlockId(blockType);
    addNode({
      id,
      type: blockType,
      position,
      data: { label: BLOCK_LABELS[blockType], config: DEFAULT_CONFIGS[blockType] },
    });
  }, [screenToFlowPosition, addNode]);

  // ── Node click ────────────────────────────────────────────────────────────

  const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string }) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-muted-foreground">Workflow not found.</p>
        <Link href="/" className="text-primary text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const saveLabel =
    saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save";

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-background z-20 shrink-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground font-bold text-xs">F</div>
          <span className="font-semibold text-sm text-foreground">FlowPilot</span>
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 border-b-0">
          {["Canvas", "Datasets", "Deployment"].map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab === "Canvas"
                  ? "text-foreground font-medium border-b-2 border-primary rounded-none pb-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Center search */}
        <div className="flex-1 max-w-xs mx-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search workflow..."
            className="pl-8 h-8 bg-secondary border-border text-sm focus-visible:ring-primary"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            className="h-8 px-3 border-border bg-secondary text-foreground hover:bg-accent gap-1.5 text-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saveLabel}
          </Button>
          <Button
            size="sm"
            onClick={() => setRunDialogOpen(true)}
            disabled={isRunning}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-sm"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Running…" : "Run Workflow"}
          </Button>
          {[Settings, History, Share2].map((Icon, i) => (
            <Button key={i} variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
              <Icon className="w-4 h-4" />
            </Button>
          ))}
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold select-none">R</div>
        </div>
      </header>

      {/* ── Three-panel body ── */}
      <div className="flex flex-1 overflow-hidden">
        <BlockLibrary />

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden bg-[#0a0a10]">
          {/* Workflow name badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#13131f]/90 border border-border rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground outline-none min-w-0 w-40 text-center"
            />
            {isSaved && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Saved
              </span>
            )}
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            defaultEdgeOptions={{ type: "custom" }}
            fitView
            className="!bg-transparent"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#27272f"
            />
            <MiniMap
              position="bottom-left"
              style={{ background: "#0d0d14", border: "1px solid #27272f" }}
              nodeColor="#27272f"
              maskColor="rgba(0,0,0,0.5)"
            />
            <Controls
              position="bottom-center"
              style={{ display: "flex", flexDirection: "row", gap: "4px", background: "#13131f", border: "1px solid #27272f", borderRadius: "8px", padding: "4px" }}
              showInteractive={false}
            />
          </ReactFlow>
        </main>

        {selectedNodeId && <BlockConfigPanel />}
      </div>

      {/* ── Run dialog ── */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide input text for the Starter node. This will be passed as the workflow&apos;s initial input.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Enter your input here..."
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
            className="bg-input border-border focus-visible:ring-primary resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRunDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRun} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
              <Play className="w-3.5 h-3.5" /> Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Outer page wraps with ReactFlowProvider ─────────────────────────────────

export default function WorkflowPage() {
  const params = useParams<{ id: string }>();
  return (
    <ReactFlowProvider>
      <CanvasInner workflowId={params.id} />
    </ReactFlowProvider>
  );
}

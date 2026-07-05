"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
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

import { Settings, History, Share2, Play, Save, Search, ArrowLeft, Sparkles, Keyboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";
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
import { RunLogPanel } from "@/components/canvas/RunLogPanel";
import { CopilotPanel } from "@/components/canvas/CopilotPanel";
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
import { consumeSSE } from "@/lib/sse-client";
import type { BlockType } from "@/types/workflow";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NODE_TYPES: NodeTypes = {
  starter:   StarterNode as any,
  llm:       LLMNode as any,
  http:      HttpNode as any,
  condition: ConditionNode as any,
  transform: TransformNode as any,
  merge:     MergeNode as any,
  output:    OutputNode as any,
};

const EDGE_TYPES: EdgeTypes = { custom: CustomEdge };

const DEFAULT_CONFIGS: Record<BlockType, Record<string, unknown>> = {
  starter:   {},
  llm:       { provider: "google", model: "gemini-2.5-flash", systemPrompt: "", userPrompt: "", temperature: 0.7, maxTokens: 1024 },
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

// ─── Inner canvas ────────────────────────────────────────────────────────────

function CanvasInner({ workflowId }: { workflowId: string }) {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const {
    workflowId: storeId, workflowName, nodes, edges, selectedNodeId, isSaved,
    onNodesChange, onEdgesChange, onConnect,
    addNode, removeNode, setSelectedNode, setWorkflowName, setSaved, loadWorkflow,
  } = useWorkflowStore();

  const {
    isRunning,
    startExecution, updateBlockStatus, appendStreamToken, completeExecution, resetExecution,
  } = useExecutionStore();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { data: session } = useSession();
  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Show run log when we have an active or just-completed execution
  const { executionResult } = useExecutionStore();
  const showRunLog = isRunning || !!executionResult;

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + S → Save
      if (meta && e.key === "s") {
        e.preventDefault();
        handleSave(false);
        return;
      }
      // Cmd/Ctrl + Enter → Run dialog
      if (meta && e.key === "Enter") {
        e.preventDefault();
        if (!isRunning) setRunDialogOpen(true);
        return;
      }
      // Escape → deselect / close panels
      if (e.key === "Escape") {
        if (copilotOpen) { setCopilotOpen(false); return; }
        setSelectedNode(null);
        return;
      }
      if (inInput) return;
      // Delete / Backspace → delete selected node
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        removeNode(selectedNodeId);
        return;
      }
      // Cmd/Ctrl + D → duplicate selected node
      if (meta && e.key === "d" && selectedNodeId) {
        e.preventDefault();
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (node) {
          addNode({
            ...node,
            id: generateBlockId(node.type as BlockType),
            position: { x: node.position.x + 30, y: node.position.y + 30 },
          });
        }
        return;
      }
      // Space → fit view
      if (e.key === " ") {
        e.preventDefault();
        fitView({ padding: 0.2 });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, isRunning, copilotOpen, nodes]);

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

  // ── Auto-save ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isSaved || storeId !== workflowId) return;
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { handleSave(true); }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, workflowName, isSaved]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(auto = false) {
    if (!auto) setSaveStatus("saving");
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workflowName, graph: { nodes, edges } }),
    });
    if (res.ok) { setSaved(true); setSaveStatus("saved"); }
  }

  // ── Run ───────────────────────────────────────────────────────────────────

  async function handleRun() {
    setRunDialogOpen(false);
    resetExecution();
    startExecution("pending");

    try {
      await consumeSSE(
        "/api/execute",
        { workflowId, input: runInput || null },
        {
          onExecutionStart: (data) => startExecution(data.runId as string),
          onBlockStatus: (data) =>
            updateBlockStatus(data.blockId as string, {
              status: data.status as "pending" | "running" | "completed" | "failed" | "skipped",
              output: data.output,
              error: data.error as string | undefined,
              durationMs: data.durationMs as number | undefined,
            }),
          onBlockStream: (data) =>
            appendStreamToken(data.blockId as string, data.token as string),
          onExecutionComplete: (data) =>
            completeExecution({
              status: data.status as "completed" | "failed",
              output: data.output,
              durationMs: data.durationMs as number,
              error: data.error as string | undefined,
            }),
          onExecutionError: (data) =>
            completeExecution({
              status: "failed",
              output: null,
              durationMs: 0,
              error: data.error as string,
            }),
        },
      );
    } catch (e) {
      completeExecution({
        status: "failed",
        output: null,
        durationMs: 0,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData("application/flowpilot-block-type") as BlockType;
    if (!blockType) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode({
      id: generateBlockId(blockType),
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
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground font-bold text-xs">F</div>
          <span className="font-semibold text-sm text-foreground">FlowPilot</span>
        </Link>

        <nav className="flex items-center gap-1">
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

        <div className="flex-1 max-w-xs mx-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search workflow..."
            className="pl-8 h-8 bg-secondary border-border text-sm focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Running indicator */}
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-violet-500/15 border border-violet-500/30">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs text-violet-300 font-medium">Running…</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCopilotOpen((o) => !o)}
            className={`h-8 px-3 gap-1.5 text-sm ${copilotOpen ? "text-violet-400 bg-violet-500/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Copilot
          </Button>

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
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold select-none">
            {userInitials}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="w-7 h-7 text-muted-foreground hover:text-red-400"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
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
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272f" />
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

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
              <p className="text-muted-foreground/40 text-sm font-medium tracking-wide">
                Drag blocks from the left panel or use the{" "}
                <span className="text-violet-400/60">AI Copilot</span> to get started
              </p>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-3 right-3 z-10">
            <button
              onClick={() => setShortcutsOpen((o) => !o)}
              className="w-7 h-7 rounded-full border border-border bg-[#13131f]/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-zinc-500 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
            {shortcutsOpen && (
              <div className="absolute bottom-9 right-0 bg-[#13131f] border border-border rounded-xl p-3 w-56 shadow-xl text-[11px] space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Keyboard Shortcuts</p>
                {[
                  ["⌘S", "Save"],
                  ["⌘Enter", "Run workflow"],
                  ["⌘D", "Duplicate node"],
                  ["Del", "Delete node"],
                  ["Space", "Fit view"],
                  ["Esc", "Deselect / close"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-foreground font-mono">{key}</kbd>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Copilot panel — slides up from bottom of canvas */}
          {copilotOpen && <CopilotPanel onClose={() => setCopilotOpen(false)} />}
        </main>

        {/* Right panel: run log during/after execution, config panel otherwise */}
        {showRunLog
          ? <RunLogPanel />
          : selectedNodeId && <BlockConfigPanel />
        }
      </div>

      {/* ── Run dialog ── */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide input text for the Starter node.
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

// ─── Outer page ───────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const params = useParams<{ id: string }>();
  return (
    <ReactFlowProvider>
      <CanvasInner workflowId={params.id} />
    </ReactFlowProvider>
  );
}

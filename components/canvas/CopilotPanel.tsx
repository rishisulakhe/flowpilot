"use client";

import { useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { WorkflowNode, WorkflowEdge } from "@/stores/workflow-store";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
  graph?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
}

interface CopilotPanelProps {
  onClose: () => void;
}

export function CopilotPanel({ onClose }: CopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setNodes, setEdges } = useWorkflowStore();

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Copilot failed");

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: json.data.explanation || "Here's a workflow I generated for you.",
          graph: json.data.graph,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${e instanceof Error ? e.message : "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  }

  function applyGraph(graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    onClose();
  }

  return (
    <div className="copilot-slide-up absolute bottom-0 left-0 right-0 h-[40%] bg-[#0d0d14] border-t border-border flex flex-col z-30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-foreground flex-1">AI Copilot</span>
        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <Wand2 className="w-8 h-8 text-violet-400/50" />
            <p className="text-sm text-muted-foreground">Describe the workflow you want to build</p>
            <p className="text-[11px] text-muted-foreground/60">e.g. "Fetch a URL, summarize it with AI, then output the result"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex flex-col gap-1.5", msg.role === "user" ? "items-end" : "items-start")}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-primary/20 text-foreground border border-primary/30"
                : "bg-secondary text-foreground border border-border"
            )}>
              {msg.text}
            </div>
            {msg.graph && (
              <Button
                size="sm"
                onClick={() => applyGraph(msg.graph!)}
                className="h-7 px-3 bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5"
              >
                <Wand2 className="w-3 h-3" /> Apply to Canvas
              </Button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="bg-secondary border border-border rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              <span className="text-sm text-muted-foreground">Generating workflow…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-border shrink-0">
        <Textarea
          rows={1}
          placeholder="Describe the workflow you want to build…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          className="flex-1 bg-input border-border text-sm resize-none focus-visible:ring-primary min-h-[36px] max-h-[80px]"
        />
        <Button
          size="icon"
          disabled={!input.trim() || loading}
          onClick={handleSend}
          className="h-9 w-9 shrink-0 bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

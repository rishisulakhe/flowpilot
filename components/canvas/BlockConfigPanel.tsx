"use client";

import { useEffect, useState } from "react";
import { X, Zap, Sparkles, Globe, GitBranch, Code2, Merge, Flag, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { BlockType } from "@/types/workflow";

const TYPE_META: Record<BlockType, { label: string; icon: React.ReactNode; color: string }> = {
  starter:   { label: "Trigger",     icon: <Zap className="w-4 h-4" />,       color: "#22C55E" },
  llm:       { label: "LLM",         icon: <Sparkles className="w-4 h-4" />,  color: "#8B5CF6" },
  http:      { label: "HTTP",        icon: <Globe className="w-4 h-4" />,      color: "#3B82F6" },
  condition: { label: "Condition",   icon: <GitBranch className="w-4 h-4" />, color: "#EAB308" },
  transform: { label: "Transform",   icon: <Code2 className="w-4 h-4" />,     color: "#F97316" },
  merge:     { label: "Merge",       icon: <Merge className="w-4 h-4" />,     color: "#14B8A6" },
  output:    { label: "Output",      icon: <Flag className="w-4 h-4" />,      color: "#EF4444" },
};

interface ModelInfo { id: string; name: string; }
interface ProviderInfo { configured: boolean; models: ModelInfo[]; }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{children}</p>;
}

export function BlockConfigPanel() {
  const { selectedNodeId, nodes, updateNodeData, setSelectedNode } = useWorkflowStore();
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});

  const node = nodes.find((n) => n.id === selectedNodeId);
  const type = node?.type as BlockType | undefined;
  const config = (node?.data?.config ?? {}) as Record<string, unknown>;

  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((j) => {
      if (j.success) setProviders(j.data);
    });
  }, []);

  function set(key: string, value: unknown) {
    if (!selectedNodeId) return;
    updateNodeData(selectedNodeId, { config: { ...config, [key]: value } });
  }

  function setLabel(value: string) {
    if (!selectedNodeId) return;
    updateNodeData(selectedNodeId, { label: value });
  }

  if (!node || !type) return null;

  const meta = TYPE_META[type];
  const currentProvider = (config.provider as string) ?? "openai";
  const providerModels = providers[currentProvider]?.models ?? [];

  return (
    <aside className="flex flex-col h-full w-[300px] border-l border-border bg-[#0d0d14] shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{node.data.label}</p>
          <p className="text-[10px] text-muted-foreground truncate">Node ID: {node.id}</p>
        </div>
        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSelectedNode(null)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Node label (all types) */}
        <div>
          <SectionLabel>Label</SectionLabel>
          <Input
            value={node.data.label}
            onChange={(e) => setLabel(e.target.value)}
            className="bg-input border-border text-sm focus-visible:ring-primary h-8"
          />
        </div>

        {/* ── Starter ── */}
        {type === "starter" && (
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 leading-relaxed">
            This is the entry point. The input you provide when running the workflow will be passed as this node&apos;s output.
          </p>
        )}

        {/* ── LLM ── */}
        {type === "llm" && (
          <>
            <div>
              <SectionLabel>Provider</SectionLabel>
              <Select value={currentProvider} onValueChange={(v) => { set("provider", v); set("model", providers[v]?.models[0]?.id ?? ""); }}>
                <SelectTrigger className="bg-input border-border h-9 text-sm focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.keys(providers).map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <SectionLabel>Model</SectionLabel>
              <Select value={(config.model as string) ?? ""} onValueChange={(v) => set("model", v)}>
                <SelectTrigger className="bg-input border-border h-9 text-sm focus:ring-primary">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {providerModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <SectionLabel>System Prompt</SectionLabel>
              <Textarea
                rows={3}
                value={(config.systemPrompt as string) ?? ""}
                onChange={(e) => set("systemPrompt", e.target.value)}
                placeholder="You are a helpful assistant..."
                className="bg-input border-border text-sm resize-none focus-visible:ring-primary"
              />
            </div>
            <div>
              <SectionLabel>User Message</SectionLabel>
              <Textarea
                rows={3}
                value={(config.userPrompt as string) ?? ""}
                onChange={(e) => set("userPrompt", e.target.value)}
                placeholder="{{starter_1.output}}"
                className="bg-input border-border text-sm resize-none focus-visible:ring-primary font-mono"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <SectionLabel>Temperature</SectionLabel>
                <span className="text-xs text-muted-foreground">{((config.temperature as number) ?? 0.7).toFixed(1)}</span>
              </div>
              <Slider
                min={0} max={1} step={0.1}
                value={[(config.temperature as number) ?? 0.7]}
                onValueChange={([v]) => set("temperature", v)}
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <SectionLabel>Max Tokens</SectionLabel>
                <span className="text-xs text-muted-foreground">{(config.maxTokens as number) ?? 1024}</span>
              </div>
              <Slider
                min={100} max={4096} step={100}
                value={[(config.maxTokens as number) ?? 1024]}
                onValueChange={([v]) => set("maxTokens", v)}
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
              />
            </div>
          </>
        )}

        {/* ── HTTP ── */}
        {type === "http" && (
          <>
            <div>
              <SectionLabel>Method</SectionLabel>
              <Select value={(config.method as string) ?? "GET"} onValueChange={(v) => set("method", v)}>
                <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <SectionLabel>URL</SectionLabel>
              <Input value={(config.url as string) ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://api.example.com/data" className="bg-input border-border text-sm font-mono h-8" />
            </div>
            <div>
              <SectionLabel>Headers (JSON)</SectionLabel>
              <Textarea rows={3} value={(config.headers as string) ?? "{}"} onChange={(e) => set("headers", e.target.value)} className="bg-input border-border text-sm resize-none font-mono focus-visible:ring-primary" />
            </div>
            <div>
              <SectionLabel>Body (JSON)</SectionLabel>
              <Textarea rows={3} value={(config.body as string) ?? ""} onChange={(e) => set("body", e.target.value)} disabled={config.method === "GET"} placeholder={config.method === "GET" ? "Not applicable for GET" : "{ ... }"} className="bg-input border-border text-sm resize-none font-mono focus-visible:ring-primary disabled:opacity-40" />
            </div>
          </>
        )}

        {/* ── Condition ── */}
        {type === "condition" && (
          <div>
            <SectionLabel>Expression</SectionLabel>
            <Textarea rows={4} value={(config.expression as string) ?? ""} onChange={(e) => set("expression", e.target.value)} placeholder="input.value > 10" className="bg-input border-border text-sm resize-none font-mono focus-visible:ring-primary" />
            <p className="text-[10px] text-muted-foreground mt-1.5">Use <code className="text-primary bg-primary/10 px-1 rounded">input</code> to reference incoming data.</p>
          </div>
        )}

        {/* ── Transform ── */}
        {type === "transform" && (
          <div>
            <SectionLabel>Expression</SectionLabel>
            <Textarea rows={4} value={(config.expression as string) ?? ""} onChange={(e) => set("expression", e.target.value)} placeholder="input.text.toUpperCase()" className="bg-input border-border text-sm resize-none font-mono focus-visible:ring-primary" />
            <p className="text-[10px] text-muted-foreground mt-1.5">Return a value. <code className="text-primary bg-primary/10 px-1 rounded">input</code> contains incoming data.</p>
          </div>
        )}

        {/* ── Merge ── */}
        {type === "merge" && (
          <div>
            <SectionLabel>Strategy</SectionLabel>
            <Select value={(config.strategy as string) ?? "combine"} onValueChange={(v) => set("strategy", v)}>
              <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="combine">Combine (object)</SelectItem>
                <SelectItem value="array">Array</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Output ── */}
        {type === "output" && (
          <div>
            <SectionLabel>Format</SectionLabel>
            <Select value={(config.format as string) ?? "text"} onValueChange={(v) => set("format", v)}>
              <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Test Node button */}
      <div className="p-4 border-t border-border">
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Play className="w-3.5 h-3.5" /> Test Node
        </Button>
      </div>
    </aside>
  );
}

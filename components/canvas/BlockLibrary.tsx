"use client";

import { Zap, GitBranch, Sparkles, Wrench, Flag, Code2, Merge, FileText, HeadphonesIcon } from "lucide-react";
import type { BlockType } from "@/types/workflow";

interface LibraryItem {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
}

const SECTIONS: { title: string; items: LibraryItem[] }[] = [
  {
    title: "Triggers",
    items: [
      { type: "starter", label: "Trigger", icon: <Zap className="w-3.5 h-3.5" />, accentColor: "#22C55E" },
    ],
  },
  {
    title: "Logic",
    items: [
      { type: "condition", label: "Logic", icon: <GitBranch className="w-3.5 h-3.5" />, accentColor: "#EAB308" },
      { type: "llm", label: "LLM", icon: <Sparkles className="w-3.5 h-3.5" />, accentColor: "#8B5CF6" },
      { type: "http", label: "Tool", icon: <Wrench className="w-3.5 h-3.5" />, accentColor: "#3B82F6" },
    ],
  },
  {
    title: "Execution",
    items: [
      { type: "output", label: "Output", icon: <Flag className="w-3.5 h-3.5" />, accentColor: "#EF4444" },
      { type: "transform", label: "Transform", icon: <Code2 className="w-3.5 h-3.5" />, accentColor: "#F97316" },
      { type: "merge", label: "Merge", icon: <Merge className="w-3.5 h-3.5" />, accentColor: "#14B8A6" },
    ],
  },
];

function DraggableItem({ item }: { item: LibraryItem }) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/flowpilot-block-type", item.type);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing
        border border-transparent hover:border-border hover:bg-secondary/60 transition-all duration-150 group select-none"
    >
      <div
        className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
        style={{ backgroundColor: `${item.accentColor}25`, color: item.accentColor }}
      >
        {item.icon}
      </div>
      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
    </div>
  );
}

export function BlockLibrary() {
  return (
    <aside className="flex flex-col h-full w-[220px] border-r border-border bg-[#0d0d14] shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Library</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Drag to canvas</p>
      </div>

      {/* Import Node button */}
      <div className="px-3 py-3 border-b border-border">
        <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
          <span className="text-base leading-none">+</span> Import Node
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <DraggableItem key={item.type} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer links */}
      <div className="px-4 py-3 border-t border-border space-y-1">
        {[
          { label: "Docs", icon: <FileText className="w-3.5 h-3.5" /> },
          { label: "Support", icon: <HeadphonesIcon className="w-3.5 h-3.5" /> },
        ].map(({ label, icon }) => (
          <button key={label} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            {icon} {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

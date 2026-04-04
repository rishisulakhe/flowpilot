"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { Workflow } from "@/db/schema";

interface TemplateCardProps {
  template: Workflow & { graph: unknown };
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUse() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${template.id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        router.push(`/workflow/${json.data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group relative flex flex-col gap-2 p-5 rounded-xl border border-dashed border-border bg-card/40
      hover:border-primary/40 hover:bg-card transition-all duration-200">
      {/* TEMPLATE badge */}
      <span className="self-start px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase bg-secondary text-muted-foreground">
        Template
      </span>

      {/* Clone button */}
      <button
        onClick={handleUse}
        disabled={loading}
        className="absolute top-4 right-4 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center
          text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
        title="Use template"
      >
        <Plus className="w-4 h-4" />
      </button>

      <h3 className="font-semibold text-foreground text-sm leading-snug mt-1">{template.name}</h3>
      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
        {template.description || <span className="italic opacity-50">No description</span>}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Search, ChevronDown, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Navbar } from "@/components/navbar";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { TemplateCard } from "@/components/dashboard/template-card";
import { CreateWorkflowDialog } from "@/components/dashboard/create-workflow-dialog";
import type { Workflow as WorkflowType } from "@/db/schema";

type WorkflowWithGraph = WorkflowType & { graph: unknown };

type Filter = "All" | "Recent";

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<WorkflowWithGraph[]>([]);
  const [templates, setTemplates] = useState<WorkflowWithGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [createOpen, setCreateOpen] = useState(false);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([
        fetch("/api/workflows?template=false"),
        fetch("/api/workflows?template=true"),
      ]);
      const [wJson, tJson] = await Promise.all([wRes.json(), tRes.json()]);
      if (wJson.success) setWorkflows(wJson.data);
      if (tJson.success) setTemplates(tJson.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWorkflows(); }, []);

  // Filter + search
  const filtered = workflows
    .filter((w) => {
      const q = search.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        (w.description ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      filter === "Recent" ? b.updatedAt - a.updatedAt : 0
    );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">My Workflows</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and monitor your automated LLM chains and data pipelines.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border focus-visible:ring-primary"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5 border-border bg-secondary text-foreground hover:bg-accent">
                {filter}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              {(["All", "Recent"] as Filter[]).map((f) => (
                <DropdownMenuItem
                  key={f}
                  className="cursor-pointer"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Workflow grid */}
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onCreateClick={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((wf) => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onDeleted={fetchWorkflows}
                onDuplicated={fetchWorkflows}
              />
            ))}
          </div>
        )}

        {/* Templates section */}
        {templates.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-0.5 w-5 h-5 opacity-70">
                {[0,1,2,3].map(i => <div key={i} className="rounded-sm bg-primary" />)}
              </div>
              <h2 className="text-base font-semibold text-foreground">Recommended Templates</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-muted-foreground/50 uppercase tracking-wide">
          <div className="flex items-center gap-6">
            {["Documentation", "Security", "Changelog"].map((l) => (
              <a key={l} href="#" className="hover:text-muted-foreground transition-colors">{l}</a>
            ))}
          </div>
          <span>© 2024 FlowPilot AI</span>
        </div>
      </footer>

      <CreateWorkflowDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-44 rounded-xl border border-border bg-card animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ search, onCreateClick }: { search: string; onCreateClick: () => void }) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No workflows match <span className="text-foreground">"{search}"</span></p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Workflow className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">No workflows yet</p>
        <p className="text-muted-foreground text-sm mt-1">Create your first workflow to get started.</p>
      </div>
      <Button onClick={onCreateClick} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 mt-1">
        <Plus className="w-4 h-4" /> New Workflow
      </Button>
    </div>
  );
}

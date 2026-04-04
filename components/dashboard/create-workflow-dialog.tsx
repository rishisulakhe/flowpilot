"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkflowDialog({ open, onOpenChange }: CreateWorkflowDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        onOpenChange(false);
        setName("");
        setDescription("");
        router.push(`/workflow/${json.data.id}`);
      } else {
        setError(json.error ?? "Failed to create workflow");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Workflow</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Give your workflow a name to get started. You can edit everything on the canvas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name" className="text-sm text-foreground">Name <span className="text-destructive">*</span></Label>
            <Input
              id="wf-name"
              placeholder="e.g. URL Summarizer"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              className="bg-input border-border focus-visible:ring-primary"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wf-desc" className="text-sm text-foreground">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="wf-desc"
              placeholder="What does this workflow do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border focus-visible:ring-primary"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Creating…" : "Create Workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

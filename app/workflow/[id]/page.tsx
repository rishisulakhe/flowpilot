import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Canvas Editor</h1>
        <p className="text-muted-foreground mt-1 text-sm">Coming Soon — workflow <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">{id}</code></p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
    </div>
  );
}

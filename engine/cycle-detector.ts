import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

const WHITE = 0; // unvisited
const GRAY = 1;  // in current DFS path
const BLACK = 2; // fully visited

export function detectCycle(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { hasCycle: boolean; cycle?: string[] } {
  const adj: Record<string, string[]> = {};
  for (const node of nodes) adj[node.id] = [];
  for (const edge of edges) {
    if (adj[edge.source]) adj[edge.source].push(edge.target);
  }

  const color: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  for (const node of nodes) {
    color[node.id] = WHITE;
    parent[node.id] = null;
  }

  let cycleStart: string | null = null;
  let cycleEnd: string | null = null;

  function dfs(u: string): boolean {
    color[u] = GRAY;
    for (const v of (adj[u] ?? [])) {
      if (color[v] === GRAY) {
        // Found a back edge u → v (v is ancestor of u)
        cycleStart = v;
        cycleEnd = u;
        return true;
      }
      if (color[v] === WHITE) {
        parent[v] = u;
        if (dfs(v)) return true;
      }
    }
    color[u] = BLACK;
    return false;
  }

  for (const node of nodes) {
    if (color[node.id] === WHITE) {
      if (dfs(node.id)) break;
    }
  }

  if (cycleStart === null) return { hasCycle: false };

  // Reconstruct cycle path: walk parent pointers from cycleEnd back to cycleStart
  const path: string[] = [];
  let cur: string | null = cycleEnd;
  while (cur !== null && cur !== cycleStart) {
    path.push(cur);
    cur = parent[cur] ?? null;
  }
  path.push(cycleStart);
  path.reverse();
  path.push(cycleStart); // close the cycle

  return { hasCycle: true, cycle: path };
}

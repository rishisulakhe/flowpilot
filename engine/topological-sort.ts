import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import type { ExecutionPlan } from "./types";

export function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ExecutionPlan {
  const adjacency: Record<string, string[]> = {};
  const reverseAdj: Record<string, string[]> = {};
  const nodeMap: Record<string, WorkflowNode> = {};
  const inDegree: Record<string, number> = {};

  for (const node of nodes) {
    nodeMap[node.id] = node;
    adjacency[node.id] = [];
    reverseAdj[node.id] = [];
    inDegree[node.id] = 0;
  }

  for (const edge of edges) {
    adjacency[edge.source]?.push(edge.target);
    reverseAdj[edge.target]?.push(edge.source);
    inDegree[edge.target] = (inDegree[edge.target] ?? 0) + 1;
  }

  // Kahn's algorithm — process level by level
  const levels: string[][] = [];
  let currentQueue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);

  while (currentQueue.length > 0) {
    levels.push([...currentQueue]);
    const nextQueue: string[] = [];
    for (const id of currentQueue) {
      for (const neighbor of adjacency[id] ?? []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) nextQueue.push(neighbor);
      }
    }
    currentQueue = nextQueue;
  }

  return { levels, nodeMap, adjacency, reverseAdj, edges };
}

import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";

export interface WorkflowNodeData {
  label: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

interface WorkflowState {
  workflowId: string | null;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isSaved: boolean;

  // React Flow callbacks
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setWorkflowName: (name: string) => void;
  setSaved: (saved: boolean) => void;
  loadWorkflow: (id: string, name: string, graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  workflowName: "Untitled Workflow",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isSaved: true,

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), isSaved: false })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges), isSaved: false })),

  onConnect: (connection) =>
    set((s) => ({ edges: addEdge({ ...connection, type: "custom" }, s.edges), isSaved: false })),

  setNodes: (nodes) => set({ nodes, isSaved: false }),
  setEdges: (edges) => set({ edges, isSaved: false }),

  addNode: (node) =>
    set((s) => ({ nodes: [...s.nodes, node], isSaved: false })),

  removeNode: (nodeId) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      isSaved: false,
    })),

  updateNodeData: (nodeId, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data, config: { ...n.data.config, ...(data.config ?? {}) } } } : n
      ),
      isSaved: false,
    })),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setWorkflowName: (name) => set({ workflowName: name, isSaved: false }),
  setSaved: (saved) => set({ isSaved: saved }),

  loadWorkflow: (id, name, graph) =>
    set({
      workflowId: id,
      workflowName: name,
      nodes: graph.nodes,
      edges: graph.edges,
      selectedNodeId: null,
      isSaved: true,
    }),
}));

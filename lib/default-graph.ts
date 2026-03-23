import { generateBlockId } from "./utils";
import type { WorkflowGraph } from "@/types/workflow";

export function createDefaultGraph(): WorkflowGraph {
  const starterId = generateBlockId("starter");
  return {
    nodes: [
      {
        id: starterId,
        type: "starter",
        position: { x: 250, y: 300 },
        data: {
          label: "Start",
          config: {},
        },
      },
    ],
    edges: [],
  };
}

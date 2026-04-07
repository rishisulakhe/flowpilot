"use client";

import { memo } from "react";
import { Zap } from "lucide-react";
import type { AnyNodeProps } from "./BaseNode";
import { BaseNode } from "./BaseNode";

export const StarterNode = memo(function StarterNode(props: AnyNodeProps) {
  return (
    <BaseNode
      nodeProps={props}
      accentColor="#22C55E"
      typeLabel="Trigger"
      icon={<Zap className="w-3 h-3 inline" />}
      hasInput={false}
    />
  );
});

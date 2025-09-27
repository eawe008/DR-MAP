"use client";

import { useEffect, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"; // ← update if your path differs

export default function DiagnosticMapPage() {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);

  // Only these nodes will show a hover card (example)
  const HOVERABLE_NODES = useRef(new Set(["b"]));

  // HoverCard controlled state
  const [hover, setHover] = useState({
    open: false,
    x: 0,
    y: 0,
    nodeId: null,
    nodeLabel: "",
  });

  useEffect(() => {
    const nodes = new DataSet([
      { id: "a", label: "A", shape: "dot", size: 20, x: -150, y: 0 },
      { id: "b", label: "B", shape: "dot", size: 20, x: 150, y: 0 },
    ]);
    const edges = new DataSet([
      { id: "e1", from: "a", to: "b", label: "", arrows: "", color: "#888" },
    ]);
    nodesRef.current = nodes;

    const options = {
      physics: { enabled: false },
      interaction: { hover: true, dragView: true, zoomView: true },
      nodes: {
        borderWidth: 1,
        color: { border: "#333", background: "#e5e7eb" },
      },
      edges: {
        arrows: "to",
        color: "#666",
        smooth: false,
        font: { align: "horizontal" },
      },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;
    network.fit({ animation: false });

    // Show card when hovering specific nodes
    network.on("hoverNode", (params) => {
      const nodeId = params.node;
      if (!HOVERABLE_NODES.current.has(nodeId)) return;

      const { x, y } = params.pointer.DOM; // DOM px relative to container
      const node = nodesRef.current.get(nodeId);

      setHover({
        open: true,
        x,
        y,
        nodeId,
        nodeLabel: node?.label ?? String(nodeId),
      });
    });

    // Hide when leaving node
    network.on("blurNode", (params) => {
      if (!HOVERABLE_NODES.current.has(params.node)) return;
      setHover((h) => ({ ...h, open: false }));
    });

    // Optional: click logging
    network.on("click", (params) => {
      if (params.nodes.length) console.log("Clicked node:", params.nodes[0]);
      if (params.edges.length) console.log("Clicked edge:", params.edges[0]);
    });

    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      {/* Relative wrapper so we can absolutely position the HoverCard anchor */}
      <div ref={wrapperRef} style={{ position: "relative", height: "95vh" }}>
        {/* vis-network canvas */}
        <div
          ref={containerRef}
          style={{ position: "absolute", inset: 0 }}
          aria-label="graph-canvas"
        />

        {/* HoverCard anchor positioned at the hovered node's DOM coords */}
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            width: 1,
            height: 1,
            // don't set pointer-events: none; we want to interact with the card
          }}
        >
          <HoverCard open={hover.open}>
            <HoverCardTrigger asChild>
              {/* a tiny anchor element; Radix positions content relative to this */}
              <div style={{ width: 1, height: 1 }} />
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="w-64">
              <div className="text-sm">
                <div className="font-semibold mb-1">
                  Node: <span className="font-mono">{hover.nodeLabel}</span>
                </div>
                <p className="text-muted-foreground">
                  This is a hover card anchored to the canvas position of node{" "}
                  <span className="font-mono">{hover.nodeId ?? ""}</span>.
                </p>
                {/* You can fetch/render richer details here (symptoms, test, etc.) */}
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
    </div>
  );
}
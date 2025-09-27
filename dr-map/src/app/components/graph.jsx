"use client";

import { useEffect, useRef } from "react";
import { DataSet, Network } from "vis-network/standalone";

export default function DiagnosticMapPage() {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    const nodes = new DataSet([
      { id: "a", label: "A", shape: "dot", size: 20, x: -150, y: 0 },
      { id: "b", label: "B", shape: "dot", size: 20, x: 150,  y: 0 },
    ]);

    const edges = new DataSet([
      { id: "e1", from: "a", to: "b", label: "", arrows: "", color: "#888" },
    ]);

    const options = {
      physics: { enabled: false },
      interaction: { hover: true, dragView: true, zoomView: true },
      nodes: { borderWidth: 1, color: { border: "#333", background: "#e5e7eb" } },
      edges: { arrows: "to", color: "#666", smooth: false, font: { align: "horizontal" } },
    };

    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current.fit({ animation: false });

    networkRef.current.on("click", (params) => {
      if (params.nodes.length) console.log("Clicked node:", params.nodes[0]);
      if (params.edges.length) console.log("Clicked edge:", params.edges[0]);
    });

    return () => { networkRef.current?.destroy(); };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 8, fontSize: 18 }}>Simple Graph (A → B)</h1>
      <div
        ref={containerRef}
        style={{ height: "75vh", border: "1px solid #e5e7eb", borderRadius: 8, background: "#000" }}
      />
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ---------- tiny “factories” for node types ---------- */
function makeSymptomNode(id, x, y, symptoms = []) {
  return {
    id,
    type: "S",
    label: "S",
    shape: "circle",
    x, y,
    color: { border: "#334155", background: "#e2e8f0" },

    widthConstraint: 64,                 
    heightConstraint: { minimum: 64, valign: "middle" }, 
    margin: 10, 
    font: { size: 30, vadjust: 0 },      

    labelHighlightBold: false,
    chosen: { label: false },

    meta: { symptoms },
  };
}
function makeDiagnosisNode(id, x, y, diagnosis = { label: "Dx", confidence: 0.5 }) {
  return {
    id,
    type: "D",
    label: "D",
    shape: "circle",
    x, y,
    color: { border: "#334155", background: "#e2e8f0" },

    widthConstraint: 64,                 
    heightConstraint: { minimum: 64, valign: "middle" }, 
    margin: 10, 
    font: { size: 30, vadjust: 0 },      

    labelHighlightBold: false,
    chosen: { label: false },
    meta: { diagnosis },
  };
}
function makeTestNode(id, x, y, test = { name: "Test", notes: "" }) {
  return {
    id,
    type: "T",
    label: "T",
    shape: "circle",
    x, y,
    color: { border: "#334155", background: "#e2e8f0" },

    widthConstraint: 64,                 
    heightConstraint: { minimum: 64, valign: "middle" }, 
    margin: 10, 
    font: { size: 30, vadjust: 0 },      

    labelHighlightBold: false,
    chosen: { label: false },
    meta: { test },
  };
}

export default function DiagnosticMapPage() {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);
  const idCounters = useRef({ S: 1, D: 1, T: 1 });

  // which nodes show a hover card? (you can make this dynamic later)
  const HOVERABLE = useRef(new Set(["S", "D", "T"])); // by type; we’ll check per-node

  // HoverCard state
  const [hover, setHover] = useState({
    open: false,
    x: 0,
    y: 0,
    nodeId: null,
    nodeType: null,
    data: null,
  });

  // Test dialog state
  const [testDialog, setTestDialog] = useState({
    open: false,
    nodeId: null,
    testName: "",
    doctorInput: "",
  });

  // simple id helper
  const nextId = (type) => {
    idCounters.current[type] += 1;
    return `${type}-${idCounters.current[type]}`;
  };

  // layout helpers (relative placement)
  const GAP_Y = 140;
  const GAP_X = 140;
  const placeBelow = (parentId, dy = GAP_Y, dx = 0) => {
    const pos = networkRef.current?.getPositions([parentId])?.[parentId] ?? { x: 0, y: 0 };
    return { x: pos.x + dx, y: pos.y + dy };
  };

  // spawn a new S-D-T “triangle” under a Test node
  const spawnTriangleUnderTest = (testNodeId, { testResultNote = "" } = {}) => {
    const sId = nextId("S");
    const dId = nextId("D");
    const tId = nextId("T");

    const sPos = placeBelow(testNodeId, GAP_Y, 0);
    const dPos = { x: sPos.x - GAP_X / 1.3, y: sPos.y + GAP_Y };
    const tPos = { x: sPos.x + GAP_X / 1.3, y: sPos.y + GAP_Y };

    // Demo payloads — replace with real data from your API later
    const sNode = makeSymptomNode(sId, sPos.x, sPos.y, ["new symptom A", "new symptom B"]);
    const dNode = makeDiagnosisNode(dId, dPos.x, dPos.y, { label: "New Dx", confidence: 0.42 });
    const tNode = makeTestNode(tId, tPos.x, tPos.y, { name: "Next Test", notes: testResultNote });

    nodesRef.current.add([sNode, dNode, tNode]);
    edgesRef.current.add([
      { id: `${testNodeId}->${sId}`, from: testNodeId, to: sId, color: "#525252", },
      { id: `${sId}->${dId}`, from: sId, to: dId},
      { id: `${sId}->${tId}`, from: sId, to: tId},
    ]);

    networkRef.current?.fit({ animation: { duration: 300, easingFunction: "easeInOutCubic" } });
  };

  useEffect(() => {
    // initial triangle
    const S1 = `S-${idCounters.current.S}`;
    const D1 = `D-${idCounters.current.D}`;
    const T1 = `T-${idCounters.current.T}`;

    const nodes = new DataSet([
      makeSymptomNode(S1, 0, 0, ["fever", "cough"]),
      makeDiagnosisNode(D1, -120, 140, { label: "Influenza", confidence: 0.72 }),
      makeTestNode(T1, 120, 140, { name: "Rapid antigen", notes: "Nasal swab ~15m" }),
    ]);
    const edges = new DataSet([
      { id: `${S1}->${D1}`, from: S1, to: D1 },
      { id: `${S1}->${T1}`, from: S1, to: T1 },
    ]);

    nodesRef.current = nodes;
    edgesRef.current = edges;

    const options = {
      physics: { enabled: false },
      interaction: { hover: true, dragView: true, zoomView: true },
      nodes: { borderWidth: 1, font: { size: 14 } },
      edges: { smooth: false, font: { align: "horizontal" } },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;
    network.fit({ animation: false });

    // HOVER
    network.on("hoverNode", (params) => {
      const nodeId = params.node;
      const node = nodesRef.current.get(nodeId);
      if (!node) return;
      if (!HOVERABLE.current.has(node.type)) return;

      const { x, y } = params.pointer.DOM;
      setHover({
        open: true,
        x,
        y,
        nodeId,
        nodeType: node.type,
        data: node.meta,
      });
    });
    network.on("blurNode", (params) => {
      setHover((h) => ({ ...h, open: false }));
    });

    // CLICK (tests open dialog)
    network.on("click", (params) => {
      if (!params.nodes.length) return;
      const id = params.nodes[0];
      const node = nodesRef.current.get(id);
      if (!node) return;

      if (node.type === "T") {
        setTestDialog({
          open: true,
          nodeId: id,
          testName: node.meta?.test?.name ?? "Test",
          doctorInput: "",
        });
      }
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, []);

  // Submit doctor input → spawn new triangle
  const handleCompleteTest = () => {
    if (!testDialog.nodeId) return;
    spawnTriangleUnderTest(testDialog.nodeId, { testResultNote: testDialog.doctorInput.trim() });
    setTestDialog({ open: false, nodeId: null, testName: "", doctorInput: "" });
  };

  return (
    <div>
        `<div className="px-16 py-8">
        {/* Relative wrapper so we can absolutely position overlays */}
        <div ref={wrapperRef} style={{ position: "relative", height: "82vh" }}>
            {/* vis-network canvas */}
            <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-label="graph-canvas" />

            {/* Hover anchor at node coordinates */}
            <div
            style={{
                position: "absolute",
                left: hover.x,
                top: hover.y,
                width: 1,
                height: 1,
            }}
            >
            <HoverCard open={hover.open}>
                <HoverCardTrigger asChild>
                <div style={{ width: 1, height: 1 }} />
                </HoverCardTrigger>
                <HoverCardContent side="top" align="center" className="w-72">
                <HoverContent nodeType={hover.nodeType} data={hover.data} />
                </HoverCardContent>
            </HoverCard>
            </div>
        </div>

        {/* Test completion dialog */}
        <Dialog open={testDialog.open} onOpenChange={(o) => setTestDialog((s) => ({ ...s, open: o }))}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Complete Test: {testDialog.testName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                Enter doctor notes or the key result (this will annotate the next triangle).
                </p>
                <Input
                placeholder="e.g., Positive flu antigen; mild hypoxia"
                value={testDialog.doctorInput}
                onChange={(e) => setTestDialog((s) => ({ ...s, doctorInput: e.target.value }))}
                />
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setTestDialog({ open: false, nodeId: null, testName: "", doctorInput: "" })}>
                Cancel
                </Button>
                <Button onClick={handleCompleteTest}>Complete Test</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
        </div>
        <div className="w-full h-10 flex justify-between px-4">
            <div>
                <Button>Print</Button>
            </div>
            <div className="flex justify-end gap-4">
                <Button>Force Diagnosis</Button>
                <Button>Complete Tests</Button>
            </div>  
        </div>
    </div>
  );
}

/* ---------- Hover content per node type ---------- */
function HoverContent({ nodeType, data }) {
  if (nodeType === "S") {
    const symptoms = data?.symptoms ?? [];
    return (
      <div className="text-sm">
        <div className="font-semibold mb-1">Symptoms</div>
        {symptoms.length ? (
          <ul className="list-disc pl-4 space-y-0.5">
            {symptoms.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No symptoms recorded.</p>
        )}
      </div>
    );
  }
  if (nodeType === "D") {
    const dx = data?.diagnosis ?? { label: "Diagnosis", confidence: null };
    return (
      <div className="text-sm">
        <div className="font-semibold mb-1">Diagnosis</div>
        <p>
          {dx.label}
          {typeof dx.confidence === "number" ? (
            <span className="text-muted-foreground"> ({Math.round(dx.confidence * 100)}%)</span>
          ) : null}
        </p>
      </div>
    );
  }
  if (nodeType === "T") {
    const t = data?.test ?? { name: "Test", notes: "" };
    return (
      <div className="text-sm">
        <div className="font-semibold mb-1">Test</div>
        <p className="font-medium">{t.name}</p>
        {t.notes ? <p className="text-muted-foreground">{t.notes}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">Click node to complete test.</p>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Node</div>;
}
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
function makeAddDiagnosisNode(id, x, y, parentSymptomId) {
  return {
    id,
    type: "AD",
    label: "+",
    shape: "circle",
    x, y,
    color: { border: "#334155", background: "#e2e8f0" },

    widthConstraint: 64,                 
    heightConstraint: { minimum: 64, valign: "middle" }, 
    margin: 10, 
    font: { size: 30, vadjust: 0 },      

    labelHighlightBold: false,
    chosen: { label: false },
    meta: { parentSymptomId },
  };
}

export default function DiagnosticMapPage() {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);
  const idCounters = useRef({ S: 1, D: 1, T: 1, AD: 0 });

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

  // Add-diagnosis dialog
  const [diagDialog, setDiagDialog] = useState({
    open: false,
    addNodeId: null,          // the "+" node we're converting
    parentSymptomId: null,    // S node id
    label: "",
    confidence: "",           // optional, 0–100 or 0–1
  });

  // simple id helper
  const nextId = (type) => {
    const map = idCounters.current;
    const curr = Number.isFinite(map[type]) ? map[type] : 0;
    const next = curr + 1;
    map[type] = next;
    return `${type}-${next}`;
  };

  const ensurePlusForAllSymptoms = () => {
    const allS = nodesRef.current?.get({ filter: (n) => n.type === "S" }) ?? [];
    allS.forEach((n) => attachOrRepositionAddDiagnosis(n.id));
    };

  // layout helpers (relative placement)
  const GAP_Y = 140;
  const GAP_X = 140;
  const placeBelow = (parentId, dy = GAP_Y, dx = 0) => {
    const pos = networkRef.current?.getPositions([parentId])?.[parentId] ?? { x: 0, y: 0 };
    return { x: pos.x + dx, y: pos.y + dy };
  };

  // Place/add a "+" node for a symptom; keep it left of all existing D children
  const attachOrRepositionAddDiagnosis = (symptomId) => {
    const sPos = networkRef.current?.getPositions([symptomId])?.[symptomId];
    if (!sPos) return;

    // count D children
    const edgesFromS = edgesRef.current.get({
      filter: (e) => e.from === symptomId,
    });
    const dChildren = edgesFromS.filter((e) => {
      const n = nodesRef.current.get(e.to);
      return n?.type === "D";
    }).length;

    // target position for "+" (one slot further left than current leftmost D)
    const targetX = sPos.x - GAP_X * (dChildren + 1);
    const targetY = sPos.y + GAP_Y;

    // find existing "+" for this symptom
    const addNodes = nodesRef.current.get({
      filter: (n) => n.type === "AD" && n.meta?.parentSymptomId === symptomId,
    });

    if (addNodes.length) {
      // reposition existing "+"
      nodesRef.current.update({ id: addNodes[0].id, x: targetX, y: targetY });
    } else {
      // create new "+" and link from S
      const adId = nextId("AD");
      nodesRef.current.add(makeAddDiagnosisNode(adId, targetX, targetY, symptomId));
      edgesRef.current.add({
        id: `${symptomId}->${adId}`,
        from: symptomId,
        to: adId,
      });
    }
  };

  // Convert a "+" node into a real Diagnosis, keep its id/edge, and add a new "+" further left
  const convertPlusToDiagnosis = (addNodeId, parentSymptomId, label, confidenceInput) => {
    // parse confidence (accept "72" or "0.72")
    let conf = parseFloat(String(confidenceInput).trim());
    if (!isFinite(conf)) conf = undefined;
    if (conf > 1) conf = conf / 100;

    // turn '+' node into a D node (in-place)
    nodesRef.current.update({
      id: addNodeId,
      type: "D",
      label: "D",
      color: { border: "#166534", background: "#dcfce7" },
      meta: { diagnosis: { label, confidence: conf } },
    });

    // then attach/reposition the next '+' for this symptom
    attachOrRepositionAddDiagnosis(parentSymptomId);

    // keep view tidy
    networkRef.current?.redraw();
    networkRef.current?.fit({ animation: { duration: 250, easingFunction: "easeInOutCubic" } });
  };

  // spawn S-D-T under test; also attach a "+" to the new S
  const spawnTriangleUnderTest = (testNodeId, { testResultNote = "" } = {}) => {
    const sId = nextId("S");
    const dId = nextId("D");
    const tId = nextId("T");

    const sPos = placeBelow(testNodeId, GAP_Y, 0);
    const dPos = { x: sPos.x - GAP_X / 1.3, y: sPos.y + GAP_Y };
    const tPos = { x: sPos.x + GAP_X / 1.3, y: sPos.y + GAP_Y };

    const sNode = makeSymptomNode(sId, sPos.x, sPos.y, ["new symptom A", "new symptom B"]);
    const dNode = makeDiagnosisNode(dId, dPos.x, dPos.y, { label: "New Dx", confidence: 0.42 });
    const tNode = makeTestNode(tId, tPos.x, tPos.y, { name: "Next Test", notes: testResultNote });

    nodesRef.current.add([sNode, dNode, tNode]);
    edgesRef.current.add([
      { id: `${testNodeId}->${sId}`, from: testNodeId, to: sId},
      { id: `${sId}->${dId}`, from: sId, to: dId},
      { id: `${sId}->${tId}`, from: sId, to: tId},
    ]);

    // attach the '+' to the new symptom
    ensurePlusForAllSymptoms();

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
      { id: `${S1}->${D1}`, from: S1, to: D1},
      { id: `${S1}->${T1}`, from: S1, to: T1},
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

    // ensure '+' node for every existing Symptom
    ensurePlusForAllSymptoms();

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
    network.on("blurNode", () => setHover((h) => ({ ...h, open: false })));

    // CLICK
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
        return;
      }
      if (node.type === "AD") {
        setDiagDialog({
          open: true,
          addNodeId: id,
          parentSymptomId: node.meta?.parentSymptomId,
          label: "",
          confidence: "",
        });
        return;
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

  // Submit add-diagnosis
  const handleAddDiagnosis = () => {
    const { addNodeId, parentSymptomId, label, confidence } = diagDialog;
    if (!addNodeId || !parentSymptomId || !label.trim()) {
      setDiagDialog((s) => ({ ...s, open: false })); // nothing to do
      return;
    }
    convertPlusToDiagnosis(addNodeId, parentSymptomId, label.trim(), confidence);
    setDiagDialog({ open: false, addNodeId: null, parentSymptomId: null, label: "", confidence: "" });
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Relative wrapper so we can absolutely position overlays */}
      <div ref={wrapperRef} style={{ position: "relative", height: "95vh" }}>
        {/* vis-network canvas */}
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-label="graph-canvas" />

        {/* Hover anchor at node coordinates */}
        <div style={{ position: "absolute", left: hover.x, top: hover.y, width: 1, height: 1 }}>
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
            <Button onClick={handleCompleteTest}>Add Next Triangle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-diagnosis dialog */}
      <Dialog open={diagDialog.open} onOpenChange={(o) => setDiagDialog((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add your own diagnosis</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Diagnosis label (e.g., Bacterial pneumonia)"
              value={diagDialog.label}
              onChange={(e) => setDiagDialog((s) => ({ ...s, label: e.target.value }))}
            />
            <Input
              placeholder="Confidence (e.g., 0.7 or 70)"
              value={diagDialog.confidence}
              onChange={(e) => setDiagDialog((s) => ({ ...s, confidence: e.target.value }))}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="secondary" onClick={() => setDiagDialog({ open: false, addNodeId: null, parentSymptomId: null, label: "", confidence: "" })}>
              Cancel
            </Button>
            <Button onClick={handleAddDiagnosis}>Add Diagnosis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            {symptoms.map((s, i) => <li key={i}>{s}</li>)}
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
  if (nodeType === "AD") {
    return (
      <div className="text-sm">
        <div className="font-semibold mb-1">Add your own diagnosis</div>
        <p className="text-muted-foreground">Click to enter a diagnosis linked to this symptom.</p>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Node</div>;
}
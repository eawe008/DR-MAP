"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataSet, Network } from "vis-network/standalone";
import { fetchDiagnosis } from "@/lib/diagnosisApi";
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
import { ButtonLoading } from "@/components/ui/simple_load";
import LegendKey from "@/components/LegendKey";

/* ---------- tiny “factories” for node types ---------- */
function makeSymptomNode(id, x, y, symptoms = []) {
  return {
    id,
    type: "S",
    label: "S",
    shape: "circle",
    x,
    y,
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
function makeDiagnosisNode(
  id,
  x,
  y,
  diagnosis = { label: "Dx", confidence: 0.5 }
) {
  return {
    id,
    type: "D",
    label: "D",
    shape: "circle",
    x,
    y,
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
    x,
    y,
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
function makeAggregatorNode(id, x, y, pending = []) {
  return {
    id,
    type: "P",                    // Pending aggregator
    label: "+",
    shape: "circle",
    x, y,
    color: { border: "#166534", background: "#dcfce7" }, // green hint
    widthConstraint: 64,
    heightConstraint: { minimum: 64, valign: "middle" },
    margin: 8,
    font: { size: 30, vadjust: 0 },
    labelHighlightBold: false,
    chosen: { label: false },
    meta: { pending },           // array of { testId, note }
  };
}

export default function DiagnosticMapPage() {
  const searchParams = useSearchParams();
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);
  const idCounters = useRef({ S: 1, D: 1, T: 1 });
  const router = useRouter();
  // aggregatorId -> { symptomId, tests: Map<testId, note> }
  const pendingByAggRef = useRef(new Map());
  // testId -> aggregatorId (so 2nd test links to same +)
  const testToAggRef = useRef(new Map());

  // Parse API data from URL parameters
  const getApiData = () => {
    try {
      const dataParam = searchParams.get("data");
      if (dataParam) {
        return JSON.parse(decodeURIComponent(dataParam));
      }
    } catch (error) {
      console.error("Error parsing API data from URL:", error);
    }
    // Fallback data if no URL params or parsing fails
    return {
      allSymptoms: ["fever", "cough"],
      diseases: ["Influenza"],
      tests: [
        {
          test_name: "Rapid antigen",
          test_description: "Nasal swab ~15m",
          cost_weight: 10,
        },
      ],
    };
  };

  // which nodes show a hover card? (you can make this dynamic later)
  const HOVERABLE = useRef(new Set(["S", "D", "T", "P"])); // by type; we’ll check per-node

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

  // Loading state for aggregator "+" button clicks
  const [isLoadingAggregator, setIsLoadingAggregator] = useState(false);
  const [loadingNodePosition, setLoadingNodePosition] = useState({ x: 0, y: 0 });
  const isLoadingRef = useRef(false);

  const [forceOpen, setForceOpen] = useState(false);
  const [forceDxText, setForceDxText] = useState("");

  const openForceDialog = () => {
    setForceDialog({ open: true, text: "" });
  };

  const [forceDialog, setForceDialog] = useState({
    open: false,
    text: "",
  });

  // simple id helper
  const nextId = (type) => {
    idCounters.current[type] += 1;
    return `${type}-${idCounters.current[type]}`;
  };

  // layout helpers (relative placement)
  const GAP_Y = 140;
  const GAP_X = 140;
  const NODE_SPACING = 150; // Minimum spacing between nodes to prevent overlap

  // Helper function to check if a position is too close to existing nodes
  const isPositionSafe = (x, y, minDistance = NODE_SPACING) => {
    if (!nodesRef.current) return true;

    const nodes = nodesRef.current.get();
    return !nodes.some((node) => {
      const distance = Math.sqrt(
        Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)
      );
      return distance < minDistance;
    });
  };

  const getParentSymptomIdForTest = (testId) => {
    const edges = edgesRef.current?.get() ?? [];
    for (const e of edges) {
      if (e.to === testId) {
        const n = nodesRef.current.get(e.from);
        if (n?.type === "S") return n.id;
      }
    }
    return null;
  };

  const handleForceDiagnose = (dxOverride) => {
    let dx = (dxOverride || "").trim();

    if (!dx) {
      try {
        const nodes = nodesRef.current?.get?.() ?? [];
        const firstDx = nodes.find(
          (n) => n.type === "D" && n.meta?.diagnosis?.label
        );
        dx = firstDx?.meta?.diagnosis?.label || "";
      } catch {}
    }

    const url = dx ? `/articles?dx=${encodeURIComponent(dx)}` : "/articles";
    router.push(url);
  };

  const ensureAggregatorForSymptom = (symptomId) => {
    for (const [aggId, meta] of pendingByAggRef.current.entries()) {
      if (meta.symptomId === symptomId) return aggId;
    }

    // ---- placement: bottom-left of tests (with right-bias if crowded) ----
    const tests = getTestsForSymptom(symptomId);
    // offsets: tune these to taste (px). Positive Y goes downward in vis-network.
    const OFFSET_X = 60;   // how far left from the leftmost test
    const OFFSET_Y = 60;   // how far below the lowest test


    let baseX, baseY;

    if (tests.length > 0) {
      const xs = tests.map(t => t.pos.x);
      const ys = tests.map(t => t.pos.y);
      const minX = Math.min(...xs);
      const maxY = Math.max(...ys);

      baseX = minX - OFFSET_X;   // left of the leftmost test
      baseY = maxY + OFFSET_Y;   // below the lowest test

    } else {
      // Fallback if no tests found
      const fallback = placeBelow(symptomId, GAP_Y, 0);
      baseX = fallback.x + 40;
      baseY = fallback.y + 40;
    }

    const safe = findSafePosition(baseX, baseY, "right");
    const aggId = `P-${Date.now()}`;
    const aggNode = makeAggregatorNode(aggId, safe.x, safe.y, []);

    nodesRef.current.add(aggNode);
    pendingByAggRef.current.set(aggId, { symptomId, tests: new Map() });

    networkRef.current?.fit({ animation: { duration: 250, easingFunction: "easeInOutCubic" } });
    return aggId;
  };
  
  // Helper function to find safe position for a node
  const findSafePosition = (baseX, baseY, side = 'right') => {
    let x = baseX;
    let y = baseY;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!isPositionSafe(x, y) && attempts < maxAttempts) {
      if (side === 'left') {
        x -= NODE_SPACING * 0.4;
        y += NODE_SPACING * 0.3;
      } else if (side === 'right') {
        x += NODE_SPACING * 0.4;
        y += NODE_SPACING * 0.3;
      } else if (side === 'center') {
        // For symptom nodes, try different positions in a spiral pattern
        const angle = (attempts * Math.PI) / 4; // 45-degree increments
        const radius = NODE_SPACING * (0.5 + attempts * 0.3);
        x = baseX + Math.cos(angle) * radius;
        y = baseY + Math.sin(angle) * radius;
      }
      attempts++;
    }
    
    return { x, y };
  };
  
  const placeBelow = (parentId, dy = GAP_Y, dx = 0) => {
    const pos = networkRef.current?.getPositions([parentId])?.[parentId] ?? { x: 0, y: 0 };
    const baseX = pos.x - dx;
    const baseY = pos.y - dy;

    // Check if the position is safe, if not find a safe alternative
    if (isPositionSafe(baseX, baseY)) {
      return { x: baseX, y: baseY };
    } else {
      // Find a safe position nearby
      return findSafePosition(baseX, baseY, 'center');
    }
  };


  // spawn a new S-D-T “triangle” under a Test node
  const spawnTriangleUnderTest = (
    testNodeId,
    { testResultNote = "", apiData = null } = {}
  ) => {
    const sId = nextId("S");

    const sPos = placeBelow(testNodeId, GAP_Y, 0);

    // Create symptom node with updated symptoms (including test result)
    const allSymptoms = getAllSymptomsFromGraph();
    const symptomsWithResult = testResultNote
      ? [...allSymptoms, testResultNote]
      : allSymptoms;
    const sNode = makeSymptomNode(sId, sPos.x, sPos.y, symptomsWithResult);

    const nodesArray = [sNode];
    const edgesArray = [
      {
        id: `${testNodeId}->${sId}`,
        from: testNodeId,
        to: sId,
        color: "#525252",
      },
    ];

    if (apiData && apiData.diseases && apiData.tests) {
      const diseases = apiData.diseases || [];
      diseases.forEach((disease, index) => {
        const dId = nextId("D");

        let baseX = sPos.x - GAP_X;
        let baseY;

        if (diseases.length === 1) {
          baseY = sPos.y + GAP_Y;
        } else {
          const spacing = NODE_SPACING; // Use consistent spacing

          const startY = sPos.y + GAP_Y - (diseases.length - 1) * spacing / 2;
          baseY = startY + (index * spacing);
        }
        
        // Find safe position that doesn't overlap with existing nodes
        const dPos = findSafePosition(baseX, baseY, 'left');
        
        const dNode = makeDiagnosisNode(dId, dPos.x, dPos.y, { label: disease, confidence: 0 });

        nodesArray.push(dNode);
        edgesArray.push({ id: `${sId}->${dId}`, from: sId, to: dId });
      });

      const tests = apiData.tests || [];
      tests.forEach((test, index) => {
        const tId = nextId("T");
        let baseX = sPos.x + GAP_X;
        let baseY;
        
        if (tests.length === 1) {
          baseY = sPos.y + GAP_Y;
        } else {
          const spacing = NODE_SPACING; // Use consistent spacing
          const startY = sPos.y + GAP_Y - (tests.length - 1) * spacing / 2;
          baseY = startY + (index * spacing);
        }
        
        // Find safe position that doesn't overlap with existing nodes
        const tPos = findSafePosition(baseX, baseY, 'right');
        
        const tNode = makeTestNode(tId, tPos.x, tPos.y, { 
          name: test.test_name, 
          notes: test.test_description,
          cost: test.cost_weight,
        });
        nodesArray.push(tNode);
        edgesArray.push({ id: `${sId}->${tId}`, from: sId, to: tId });
      });
    } else {
      const dId = nextId("D");
      const tId = nextId("T");

      const dPos = { x: sPos.x - GAP_X / 1.3, y: sPos.y + GAP_Y };
      const tPos = { x: sPos.x + GAP_X / 1.3, y: sPos.y + GAP_Y };

      const dNode = makeDiagnosisNode(dId, dPos.x, dPos.y, {
        label: "New Dx",
        confidence: 0.42,
      });
      const tNode = makeTestNode(tId, tPos.x, tPos.y, {
        name: "Next Test",
        notes: testResultNote,
      });

      nodesArray.push(dNode, tNode);
      edgesArray.push(
        { id: `${sId}->${dId}`, from: sId, to: dId },
        { id: `${sId}->${tId}`, from: sId, to: tId }
      );
    }

    nodesRef.current.add(nodesArray);
    edgesRef.current.add(edgesArray);

    networkRef.current?.fit({
      animation: { duration: 300, easingFunction: "easeInOutCubic" },
    });
  };

  useEffect(() => {
    const apiData = getApiData();
    console.log("Graph page received data:", apiData);

    const S1 = `S-${idCounters.current.S}`;
    const symptoms = apiData.allSymptoms || [];

    const nodesArray = [makeSymptomNode(S1, 0, 0, symptoms)];
    const edgesArray = [];

    // diseases
    const diseases = apiData.diseases || [];
    const diseaseNodes =
      diseases.length > 0
        ? diseases.map((disease, index) => {
            const diseaseId = `D-${idCounters.current.D + index}`;

            let x, y;
            if (diseases.length === 1) {
              x = -150;
              y = 120;
            } else {
              const spacing = 120;
              const startY = (-(diseases.length - 1) * spacing) / 2;
              x = -150;
              y = startY + index * spacing;
            }

            edgesArray.push({
              id: `${S1}->${diseaseId}`,
              from: S1,
              to: diseaseId,
            });

            return makeDiagnosisNode(diseaseId, x, y, {
              label: disease,
              confidence: 0.72,
            });
          })
        : [];

    // tests
    const tests = apiData.tests || [];
    const testNodes =
      tests.length > 0
        ? tests.map((test, index) => {
            const testId = `T-${idCounters.current.T + index}`;

            let x, y;
            if (tests.length === 1) {
              x = 150;
              y = 120;
            } else {
              const spacing = 120;
              const startY = (-(tests.length - 1) * spacing) / 2;
              x = 150;
              y = startY + index * spacing;
            }

            edgesArray.push({ id: `${S1}->${testId}`, from: S1, to: testId });

            return makeTestNode(testId, x, y, {
              name: test.test_name,
              notes: test.test_description,
              cost: test.cost_weight,
            });
          })
        : [];

    idCounters.current.D += diseases.length;
    idCounters.current.T += tests.length;
    idCounters.current.S += 1;

    nodesArray.push(...diseaseNodes, ...testNodes);

    const nodes = new DataSet(nodesArray);
    const edges = new DataSet(edgesArray);

    nodesRef.current = nodes;
    edgesRef.current = edges;

    const options = {
      physics: { enabled: false },
      interaction: { hover: true, dragView: true, zoomView: true },
      nodes: { borderWidth: 1, font: { size: 14 } },
      edges: { smooth: false, font: { align: "horizontal" } },
    };

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      options
    );
    networkRef.current = network;
    network.fit({ animation: false });

    // HOVER
    network.on("hoverNode", (params) => {
      // Don't show tooltips during loading
      if (isLoadingRef.current) return;
      
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
    network.on("blurNode", () => {
      setHover((h) => ({ ...h, open: false }));
    });

    // CLICK — use File B’s D-node routing (data= JSON), keep all other File A logic
    network.on("click", async (params) => {
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

      if (node.type === "P") {
        const aggId = id;
        const aggMeta = pendingByAggRef.current.get(aggId);
        if (!aggMeta) return;

        // Close any existing tooltip immediately
        setHover((h) => ({ ...h, open: false }));

        // Show loading overlay on top of the clicked "+" button
        const nodePosition = network.getPositions([aggId])[aggId];
        if (nodePosition && containerRef.current) {
          const canvasPos = network.canvasToDOM(nodePosition);
          const containerRect = containerRef.current.getBoundingClientRect();
          setLoadingNodePosition({
            x: containerRect.left + canvasPos.x,
            y: containerRect.top + canvasPos.y,
          });
          setIsLoadingAggregator(true);
          isLoadingRef.current = true;
        }

        // Gather all symptoms from the parent symptom + add all collected notes
        const parentSymptomId = aggMeta.symptomId;
        const baseSymptoms = getAllSymptomsFromGraph();
        const testNotes = Array.from(aggMeta.tests.values()).filter(Boolean);

        const mergedSymptoms = [...baseSymptoms, ...testNotes];
        nodesRef.current.update({
          id: aggId,
          type: "S",
          label: "S",
          color: { border: "#334155", background: "#e2e8f0" },
          meta: { symptoms: mergedSymptoms },
        });

        try {
          const apiResponse = await fetchDiagnosis(mergedSymptoms);
          buildBranchesUnderSymptom(aggId, apiResponse);
        } catch (err) {
          console.error("API failed; falling back to demo branch", err);
          buildBranchesUnderSymptom(aggId, null); // fallback
        } finally {
          // Hide loading overlay
          setIsLoadingAggregator(false);
          isLoadingRef.current = false;
        }

        pendingByAggRef.current.delete(aggId);
        return;
      }

      // ======= D node click: File B format (push /articles?data=<encoded JSON>) =======
      if (node.type === "D") {
        const payload = {
          diagnosis: node.meta?.diagnosis?.label ?? node.label, // prefer real disease label
          symptoms: getAllSymptomsFromGraph(),
        };

        // Build the query safely to avoid stray characters
        const url = new URL("/articles", window.location.origin);
        url.searchParams.set("data", JSON.stringify(payload));

        router.push(url.pathname + url.search);
      }
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, []);

  // Helper function to collect all symptoms from symptom nodes in the graph
  const getAllSymptomsFromGraph = () => {
    const allSymptoms = [];
    if (!nodesRef.current) return allSymptoms;

    const nodes = nodesRef.current.get();
    nodes.forEach((node) => {
      if (node.type === "S" && node.meta && node.meta.symptoms) {
        allSymptoms.push(...node.meta.symptoms);
      }
    });

    return [...new Set(allSymptoms)];
  };

  // Submit doctor input → call API → spawn new triangle with real data
  const handleCompleteTest = async () => {
    if (!testDialog.nodeId) return;

    const testId = testDialog.nodeId;
    const note = (testDialog.doctorInput || "").trim();

    const symptomId = getParentSymptomIdForTest(testId);
    if (!symptomId) {
      console.warn("No parent symptom found for test", testId);
      setTestDialog({
        open: false,
        nodeId: null,
        testName: "",
        doctorInput: "",
      });
      return;
    }

    const aggId = ensureAggregatorForSymptom(symptomId);

    testToAggRef.current.set(testId, aggId);

    const aggMeta = pendingByAggRef.current.get(aggId);
    aggMeta.tests.set(testId, note);
    pendingByAggRef.current.set(aggId, aggMeta);

    const existing = edgesRef.current.get({
      filter: (e) => e.from === testId && e.to === aggId,
    });
    if (existing.length === 0) {
      edgesRef.current.add({
        id: `${testId}->${aggId}`,
        from: testId,
        to: aggId,
        color: "#0a0a0a",
      });
    }

    nodesRef.current.update({
      id: aggId,

      meta: {
        pending: Array.from(aggMeta.tests, ([tid, n]) => ({
          testId: tid,
          note: n,
        })),
      },
    });

    setTestDialog({ open: false, nodeId: null, testName: "", doctorInput: "" });
  };

  const buildBranchesUnderSymptom = (symptomId, apiData) => {

    const sPos = networkRef.current?.getPositions([symptomId])?.[symptomId] ?? {
      x: 0,
      y: 0,
    };

    const nodesToAdd = [];
    const edgesToAdd = [];

    if (apiData && apiData.diseases && apiData.tests) {
      const diseases = apiData.diseases || [];
      diseases.forEach((disease, index) => {
        const dId = nextId("D");
        let baseX = sPos.x - GAP_X;
        let baseY;
        if (diseases.length === 1) {
          baseY = sPos.y + GAP_Y;
        } else {
          const spacing = NODE_SPACING;

          const startY = sPos.y + GAP_Y - ((diseases.length - 1) * spacing) / 2;
          baseY = startY + index * spacing;
        }
        const dPos = findSafePosition(baseX, baseY, "left");
        const dNode = makeDiagnosisNode(dId, dPos.x, dPos.y, {
          label: disease,
          confidence: 0.72,
        });
        nodesToAdd.push(dNode);
        edgesToAdd.push({
          id: `${symptomId}->${dId}`,
          from: symptomId,
          to: dId,
        });
      });

      const tests = apiData.tests || [];
      tests.forEach((test, index) => {
        const tId = nextId("T");
        let baseX = sPos.x + GAP_X;
        let baseY;
        if (tests.length === 1) {
          baseY = sPos.y + GAP_Y;
        } else {
          const spacing = NODE_SPACING;
          const startY = sPos.y + GAP_Y - (tests.length - 1) * spacing / 2;
          baseY = startY + (index * spacing);

        }
        const tPos = findSafePosition(baseX, baseY, "right");
        const tNode = makeTestNode(tId, tPos.x, tPos.y, {
          name: test.test_name,
          notes: test.test_description,
          cost: test.cost_weight,
        });
        nodesToAdd.push(tNode);
        edgesToAdd.push({
          id: `${symptomId}->${tId}`,
          from: symptomId,
          to: tId,
        });
      });
    } else {
      const dId = nextId("D");
      const tId = nextId("T");
      const dPos = { x: sPos.x - GAP_X / 1.3, y: sPos.y + GAP_Y };
      const tPos = { x: sPos.x + GAP_X / 1.3, y: sPos.y + GAP_Y };

      const dNode = makeDiagnosisNode(dId, dPos.x, dPos.y, {
        label: "New Dx",
        confidence: 0.42,
      });
      const tNode = makeTestNode(tId, tPos.x, tPos.y, {
        name: "Next Test",
        notes: "",
      });
      nodesToAdd.push(dNode, tNode);
      edgesToAdd.push(
        { id: `${symptomId}->${dId}`, from: symptomId, to: dId },
        { id: `${symptomId}->${tId}`, from: symptomId, to: tId }
      );
    }

    nodesRef.current.add(nodesToAdd);
    edgesRef.current.add(edgesToAdd);
    networkRef.current?.fit({
      animation: { duration: 300, easingFunction: "easeInOutCubic" },
    });
  };

  const getTestsForSymptom = (symptomId) => {
    const edges = edgesRef.current?.get() ?? [];
    const testIds = edges
      .filter((e) => e.from === symptomId)
      .map((e) => e.to)
      .filter((id) => nodesRef.current.get(id)?.type === "T");

    const posMap = networkRef.current?.getPositions(testIds) ?? {};
    return testIds.map((id) => ({ id, pos: posMap[id] || { x: 0, y: 0 } }));
  };

  return (
  <div className="flex h-screen">
    {/* LEFT: shadcn legend */}
    <aside className="w-72 shrink-0 border-r bg-background p-4 overflow-y-auto">
      <LegendKey />
    </aside>

    {/* RIGHT: graph + dialogs + FAB */}
    <div className="flex-1 px-16 py-8 relative">
      {/* Graph wrapper */}
      <div ref={wrapperRef} style={{ position: "relative", height: "82vh" }}>
        {/* vis-network canvas */}
        <div
          ref={containerRef}
          style={{ position: "absolute", inset: 0 }}
          aria-label="graph-canvas"
        />

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

        {/* Loading overlay positioned on top of clicked "+" button */}
        {isLoadingAggregator && loadingNodePosition && (
          <div
            style={{
              position: "fixed",
              left: loadingNodePosition.x,
              top: loadingNodePosition.y,
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
              pointerEvents: "none",
              backgroundColor: "white",
              borderRadius: "5%",
              padding: "20px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div style={{ borderRadius: "6px" }}>
              <ButtonLoading />
            </div>
          </div>
        )}
      </div>

      {/* Force Diagnose (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={openForceDialog}
          className="rounded-full px-5 py-3 shadow-lg"
        >
          Force Diagnose
        </Button>
      </div>

      {/* Test completion dialog */}
      <Dialog
        open={testDialog.open}
        onOpenChange={(o) => setTestDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Test: {testDialog.testName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter doctor notes or the key result (this will annotate the next
              triangle).
            </p>
            <Input
              placeholder="e.g., Positive flu antigen; mild hypoxia"
              value={testDialog.doctorInput}
              onChange={(e) =>
                setTestDialog((s) => ({ ...s, doctorInput: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() =>
                setTestDialog({
                  open: false,
                  nodeId: null,
                  testName: "",
                  doctorInput: "",
                })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleCompleteTest}>Complete Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Diagnose dialog */}
      <Dialog
        open={forceDialog.open}
        onOpenChange={(o) => setForceDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force a diagnosis?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will stop the flow and take you to the Articles page for more
              information. Please enter the diagnosis you want to continue with.
            </p>

            <Input
              placeholder="e.g., Influenza A"
              value={forceDialog.text}
              onChange={(e) =>
                setForceDialog((s) => ({ ...s, text: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setForceDialog({ open: false, text: "" })}
            >
              Cancel
            </Button>
            <Button
              disabled={!forceDialog.text.trim()}
              onClick={() => {
                // close dialog
                setForceDialog({ open: false, text: "" });

                // build the same payload shape as a D-node click
                const payload = {
                  diagnosis: forceDialog.text.trim(),
                  symptoms: getAllSymptomsFromGraph(),
                };

                // safely encode and push
                const encoded = encodeURIComponent(JSON.stringify(payload));
                router.push(`/articles?data=${encoded}`);
              }}
            >
              Continue to Articles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  if (nodeType === "P") {
    const pending = data?.pending ?? [];
    return (
      <div className="text-sm">
        <div className="font-semibold mb-1">Submit Tests</div>
        <p className="text-muted-foreground mb-1">
          Click “+” to apply the completed test(s) and expand the next step.
        </p>
        {pending.length ? (
          <ul className="list-disc pl-4 space-y-0.5">
            {pending.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.testId}</span>
                {p.note ? ` — ${p.note}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No completed tests yet.</p>
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
            <span className="text-muted-foreground">
              {" "}
              ({Math.round(dx.confidence * 100)}%)
            </span>
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

        <p className="mt-2 text-xs text-muted-foreground">
          Click node to complete test.
        </p>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Node</div>;
}

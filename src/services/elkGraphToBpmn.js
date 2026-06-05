const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const r = (n) => Math.round(n ?? 0);

/**
 * BPMN node renderer
 */
function nodeElement(n) {
  const name = n.label ? ` name="${esc(n.label)}"` : "";

  switch (n.type) {
    case "startEvent":
      return `<bpmn:startEvent id="${n.id}"${name} />`;
    case "endEvent":
      return `<bpmn:endEvent id="${n.id}"${name} />`;
    case "userTask":
      return `<bpmn:userTask id="${n.id}"${name} />`;
    case "serviceTask":
      return `<bpmn:serviceTask id="${n.id}"${name} />`;
    case "scriptTask":
      return `<bpmn:scriptTask id="${n.id}"${name} />`;
    case "manualTask":
      return `<bpmn:manualTask id="${n.id}"${name} />`;
    case "callActivity":
      return `<bpmn:callActivity id="${n.id}"${name} />`;
    case "exclusiveGateway":
      return `<bpmn:exclusiveGateway id="${n.id}"${name} />`;
    case "parallelGateway":
      return `<bpmn:parallelGateway id="${n.id}"${name} />`;
    case "inclusiveGateway":
      return `<bpmn:inclusiveGateway id="${n.id}"${name} />`;
    case "subProcess":
      return `<bpmn:subProcess id="${n.id}"${name} />`;
    default:
      return `<bpmn:task id="${n.id}"${name} />`;
  }
}

/**
 * Convert ELK layout → BPMN XML (FIXED VERSION)
 */
export default function elkToBpmn(model, positions = {}, edgeWaypoints = {}) {
  const {
    nodes = [],
    sequenceFlows: flows = [],
    pools = [],
    lanes = [],
  } = model ?? {};

  // ─────────────────────────────────────────────
  // 1. lane mapping (SAFE)
  // ─────────────────────────────────────────────

  const nodeToLane = Object.fromEntries(
    nodes.map(n => [n.id, n.lane ?? "default_lane"])
  );

  const laneNodeRefs = {};
  nodes.forEach(n => {
    const lid = nodeToLane[n.id];
    (laneNodeRefs[lid] ??= []).push(n.id);
  });

  // ─────────────────────────────────────────────
  // 2. LaneSet XML (FIX: lane id safe usage)
  // ─────────────────────────────────────────────

  const laneSetXml = lanes.length
    ? `
    <bpmn:laneSet id="laneSet_1">
${lanes
  .map(
    l => `      <bpmn:lane id="${l.id}" name="${esc(l.name ?? l.id)}">
${(laneNodeRefs[l.id] ?? [])
  .map(id => `        <bpmn:flowNodeRef>${id}</bpmn:flowNodeRef>`)
  .join("\n")}
      </bpmn:lane>`
  )
  .join("\n")}
    </bpmn:laneSet>`
    : "";

  // ─────────────────────────────────────────────
  // 3. BPMN nodes + flows
  // ─────────────────────────────────────────────

  const nodesXml = nodes.map(n => "    " + nodeElement(n)).join("\n");

  const flowsXml = flows
    .map(
      f =>
        `    <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}" />`
    )
    .join("\n");

  // ─────────────────────────────────────────────
  // 4. DI: Pools (FIX: safe guard + fallback)
  // ─────────────────────────────────────────────

  const poolShapes = pools
    .map(p => {
      const pos = positions[p.id];
      if (!pos) return "";

      return `      <bpmndi:BPMNShape id="shape_${p.id}" bpmnElement="${p.id}" isHorizontal="true">
        <dc:Bounds x="${r(pos.x)}" y="${r(pos.y)}" width="${r(pos.width)}" height="${r(pos.height)}" />
      </bpmndi:BPMNShape>`;
    })
    .join("\n");

  // ─────────────────────────────────────────────
  // 5. DI: Lanes (FIX: same safety)
  // ─────────────────────────────────────────────

  const laneShapes = lanes
    .map(l => {
      const pos = positions[l.id];
      if (!pos) return "";

      return `      <bpmndi:BPMNShape id="shape_${l.id}" bpmnElement="${l.id}" isHorizontal="true">
        <dc:Bounds x="${r(pos.x)}" y="${r(pos.y)}" width="${r(pos.width)}" height="${r(pos.height)}" />
      </bpmndi:BPMNShape>`;
    })
    .join("\n");

  // ─────────────────────────────────────────────
  // 6. DI: Nodes (FIX: safe positions + fallback size)
  // ─────────────────────────────────────────────

  const nodeShapes = nodes
    .map(n => {
      const p = positions[n.id];
      if (!p) return "";

      return `      <bpmndi:BPMNShape id="shape_${n.id}" bpmnElement="${n.id}">
        <dc:Bounds x="${r(p.x)}" y="${r(p.y)}" width="${r(p.width)}" height="${r(p.height)}" />
      </bpmndi:BPMNShape>`;
    })
    .join("\n");

  // ─────────────────────────────────────────────
  // 7. DI: Edges (FIXED + robust fallback)
  // ─────────────────────────────────────────────

  const edgeShapes = flows
    .map(f => {
      const wps = edgeWaypoints?.[f.id];

      let wpXml = "";

      if (Array.isArray(wps) && wps.length >= 2) {
        wpXml = wps
          .map(wp => `        <di:waypoint x="${r(wp.x)}" y="${r(wp.y)}" />`)
          .join("\n");
      } else {
        const s = positions[f.source];
        const t = positions[f.target];

        if (!s || !t) return "";

        const sx = r(s.x + s.width / 2);
        const sy = r(s.y + s.height / 2);
        const tx = r(t.x + t.width / 2);
        const ty = r(t.y + t.height / 2);

        wpXml = `
        <di:waypoint x="${sx}" y="${sy}" />
        <di:waypoint x="${tx}" y="${ty}" />`;
      }

      return `      <bpmndi:BPMNEdge id="edge_${f.id}" bpmnElement="${f.id}">
${wpXml}
      </bpmndi:BPMNEdge>`;
    })
    .join("\n");

  // ─────────────────────────────────────────────
  // 8. Final XML
  // ─────────────────────────────────────────────

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn"
  id="definitions_1">

  <bpmn:process id="process_1" isExecutable="false">
${laneSetXml}
${nodesXml}
${flowsXml}
  </bpmn:process>

  <bpmndi:BPMNDiagram id="diagram_1">
    <bpmndi:BPMNPlane id="plane_1" bpmnElement="process_1">
${poolShapes}
${laneShapes}
${nodeShapes}
${edgeShapes}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
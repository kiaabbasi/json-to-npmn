import { useCallback } from 'react';
import { BpmnProcessTransformer } from './BpmnProcessTransformer';

const useBpmnAutoLayout = () => {
  const layoutDiagram = useCallback(async (bpmnXml) => {
    // Dynamic import برای جلوگیری از مشکلات SSR و bundler
    const { layoutProcess } = await import('@marstamm/bpmn-auto-layout');

    try {
      const layoutedXml = await layoutProcess(bpmnXml);
      return layoutedXml;
    } catch (error) {
      console.error('Auto layout failed:', error);
      throw error;
    }
  }, []);

  return { layoutDiagram };
};

export default useBpmnAutoLayout;

export function jsonToBpmnXml(text) {
  const json = JSON.parse(text);

  const document = new DOMParser().parseFromString(
    `<bpmn:definitions
      xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
      xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
      id="definitions_1">
      <bpmn:collaboration id="Collaboration_1"></bpmn:collaboration>
    </bpmn:definitions>`,
    "text/xml"
  );

  const definitionsElement = document.getElementsByTagName("bpmn:definitions")[0];
  const collaborationElement = document.getElementsByTagName("bpmn:collaboration")[0];

  // ── Single process for ALL nodes ─────────────────────────────────
  // bpmn-auto-layout requires one collaboration plane → one process
  const processElement = document.createElement("bpmn:process");
  processElement.setAttribute("id", "Process_1");
  processElement.setAttribute("isExecutable", "false");
  definitionsElement.insertBefore(processElement, collaborationElement);

  // ── incoming / outgoing maps ──────────────────────────────────────
  const incomingMap = {};
  const outgoingMap = {};
  for (const flow of json.sequenceFlows || []) {
    (incomingMap[flow.target] = incomingMap[flow.target] || []).push(flow.id);
    (outgoingMap[flow.source] = outgoingMap[flow.source] || []).push(flow.id);
  }

  // ── Nodes ─────────────────────────────────────────────────────────
  for (const node of json.nodes || []) {
    const elem = document.createElement("bpmn:" + node.type);
    elem.setAttribute("id", node.id);
    if (node.label) elem.setAttribute("name", node.label);

    for (const inc of incomingMap[node.id] || []) {
      const el = document.createElement("bpmn:incoming");
      el.textContent = inc;
      elem.appendChild(el);
    }
    for (const out of outgoingMap[node.id] || []) {
      const el = document.createElement("bpmn:outgoing");
      el.textContent = out;
      elem.appendChild(el);
    }
    if (node.eventDefinition) {
      const evDef = document.createElement("bpmn:" + node.eventDefinition);
      evDef.setAttribute("id", `${node.eventDefinition}_${node.id}`);
      elem.appendChild(evDef);
    }

    processElement.appendChild(elem);
  }

  // ── Sequence Flows ────────────────────────────────────────────────
  for (const flow of json.sequenceFlows || []) {
    const sf = document.createElement("bpmn:sequenceFlow");
    sf.setAttribute("id", flow.id);
    sf.setAttribute("sourceRef", flow.source);
    sf.setAttribute("targetRef", flow.target);
    if (flow.condition) sf.setAttribute("name", flow.condition);
    processElement.appendChild(sf);
  }

  // ── Lanes ─────────────────────────────────────────────────────────
  if ((json.lanes || []).length > 0) {
    const laneSet = document.createElement("bpmn:laneSet");
    laneSet.setAttribute("id", "LaneSet_1");

    for (const lane of json.lanes) {
      const laneElem = document.createElement("bpmn:lane");
      laneElem.setAttribute("id", lane.id);
      if (lane.label) laneElem.setAttribute("name", lane.label);

      const laneNodes = (json.nodes || []).filter((n) => n.lane === lane.id);
      for (const node of laneNodes) {
        const ref = document.createElement("bpmn:flowNodeRef");
        ref.textContent = node.id;
        laneElem.appendChild(ref);
      }
      laneSet.appendChild(laneElem);
    }
    processElement.appendChild(laneSet);
  }

  // ── Participants — all point to the SAME Process_1 ────────────────
  for (const pool of json.pools || []) {
    const participant = document.createElement("bpmn:participant");
    participant.setAttribute("id", pool.id);
    if (pool.label) participant.setAttribute("name", pool.label);
    participant.setAttribute("processRef", "Process_1");
    collaborationElement.appendChild(participant);
  }

  // ── Message Flows ─────────────────────────────────────────────────
  for (const flow of json.messageFlows || []) {
    const mf = document.createElement("bpmn:messageFlow");
    mf.setAttribute("id", flow.id);
    mf.setAttribute("sourceRef", flow.source);
    mf.setAttribute("targetRef", flow.target);
    if (flow.label) mf.setAttribute("name", flow.label);
    collaborationElement.appendChild(mf);
  }

  // ── Data Objects ──────────────────────────────────────────────────
  for (const obj of json.dataObjects || []) {
    const el = document.createElement("bpmn:" + obj.type);
    el.setAttribute("id", obj.id);
    if (obj.label) el.setAttribute("name", obj.label);
    processElement.appendChild(el);
  }

  // ── Data Stores ───────────────────────────────────────────────────
  for (const store of json.dataStores || []) {
    const el = document.createElement("bpmn:" + store.type);
    el.setAttribute("id", store.id);
    if (store.label) el.setAttribute("name", store.label);
    processElement.appendChild(el);
  }

  // ── Data Associations ─────────────────────────────────────────────
  for (const assoc of json.dataAssociations || []) {
    const tagName =
      assoc.type === "input"  ? "dataInputAssociation"  :
      assoc.type === "output" ? "dataOutputAssociation" :
                                "dataAssociation";
    const el = document.createElement("bpmn:" + tagName);
    el.setAttribute("id", assoc.id);
    const src = document.createElement("bpmn:sourceRef");
    src.textContent = assoc.source;
    const tgt = document.createElement("bpmn:targetRef");
    tgt.textContent = assoc.target;
    el.appendChild(src);
    el.appendChild(tgt);
    processElement.appendChild(el);
  }

  // ── Single BPMNPlane bpmnElement = Collaboration_1 ───────────────
  // bpmn-auto-layout requires exactly ONE plane pointing at the
  // collaboration id — this is the only structure it can walk.
  const diagram = document.createElement("bpmndi:BPMNDiagram");
  diagram.setAttribute("id", "BPMNDiagram_1");

  const plane = document.createElement("bpmndi:BPMNPlane");
  plane.setAttribute("id", "BPMNPlane_1");
  // ← KEY FIX: point at Collaboration_1, not a pool or process
  plane.setAttribute("bpmnElement", "Collaboration_1");

  diagram.appendChild(plane);
  definitionsElement.appendChild(diagram);

  return new XMLSerializer().serializeToString(document).replace(/></g, ">\n<");
}
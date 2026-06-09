/**
 * jsonToBpmnXml.js
 *
 * Converts the application JSON format → BPMN 2.0 XML string (semantic layer only).
 * The <bpmndi:BPMNDiagram> section is left as a stub — the layout step fills it in.
 *
 * BPMN structure produced
 * ───────────────────────
 *   <definitions>
 *     <collaboration>                 one <participant> per pool
 *       <participant …/>              + all <messageFlow>s (cross-pool)
 *       <messageFlow …/>
 *     </collaboration>
 *
 *     <process …>                     one per pool
 *       <laneSet>
 *         <lane> <flowNodeRef/> … </lane>
 *       </laneSet>
 *       <!-- flow nodes (startEvent / endEvent / userTask / serviceTask /
 *            exclusiveGateway / parallelGateway /
 *            intermediateThrowEvent / intermediateCatchEvent) -->
 *       <!-- sequenceFlows  (with optional <conditionExpression>) -->
 *     </process>
 *
 *     <bpmndi:BPMNDiagram>            stub — layout step populates this
 *   </definitions>
 */

export default function jsonToBpmnXml(data) {
  const { pools, lanes, nodes, sequenceFlows, messageFlows } = data;

  // ─── Tiny utilities ──────────────────────────────────────────────────────

  /** Group an array into a Map<key, item[]> using a key function. */
  function groupBy(arr, keyFn) {
    const map = new Map();
    for (const item of arr) {
      const k = keyFn(item);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item);
    }
    return map;
  }

  /** Append val to the list stored at map[key], creating it if needed. */
  function pushTo(map, key, val) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(val);
  }

  /** Escape special XML characters for attributes and text content. */
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Prepend `n` spaces to every line of a (possibly multi-line) string. */
  function indentBlock(str, n) {
    const pad = ' '.repeat(n);
    return str.split('\n').map(l => pad + l).join('\n');
  }

  // ─── Lookup & grouping structures ────────────────────────────────────────

  const laneById    = new Map(lanes.map(l => [l.id, l]));
  const nodeById    = new Map(nodes.map(n => [n.id, n]));

  /** Returns the pool id that owns a given node id. */
  const nodePoolId  = id => laneById.get(nodeById.get(id)?.lane)?.pool ?? null;

  const lanesByPool = groupBy(lanes,         l  => l.pool);
  const nodesByLane = groupBy(nodes,         n  => n.lane);

  // Each sequenceFlow belongs to the pool of its source node.
  // (All sequence flows in valid BPMN stay within a single pool;
  //  cross-pool communication uses messageFlows in the collaboration.)
  const sfByPool    = groupBy(sequenceFlows, sf => nodePoolId(sf.source));

  // Per-node incoming / outgoing sequence-flow id lists
  const incoming = new Map();   // nodeId → sfId[]
  const outgoing = new Map();   // nodeId → sfId[]
  for (const sf of sequenceFlows) {
    pushTo(outgoing, sf.source, sf.id);
    pushTo(incoming, sf.target, sf.id);
  }

  // ─── JSON type → BPMN element tag ────────────────────────────────────────

  const BPMN_TAG = {
    startEvent:                    'startEvent',
    endEvent:                      'endEvent',
    userTask:                      'userTask',
    serviceTask:                   'serviceTask',
    sendTask :                     'sendTask',
    exclusiveGateway:              'exclusiveGateway',
    parallelGateway:               'parallelGateway',
    messageIntermediateThrowEvent: 'intermediateThrowEvent',
    messageIntermediateCatchEvent: 'intermediateCatchEvent',
  };

  // ─── Element builders ────────────────────────────────────────────────────
  // Each builder returns a 0-indented string (possibly multi-line).
  // The caller uses indentBlock() to place it inside the document.

  function buildNode(n) {
    const tag = BPMN_TAG[n.type];
    if (!tag) return `<!-- UNSUPPORTED NODE TYPE: ${n.type} (id="${n.id}") -->`;

    const nameAttr = n.label ? ` name="${esc(n.label)}"` : '';

    // Child element order: <incoming> … <outgoing> … <eventDefinition/>
    const children = [
      ...(incoming.get(n.id) ?? []).map(id => `<incoming>${id}</incoming>`),
      ...(outgoing.get(n.id) ?? []).map(id => `<outgoing>${id}</outgoing>`),
    ];

    if (
      n.type === 'messageIntermediateThrowEvent' ||
      n.type === 'messageIntermediateCatchEvent'
    ) {
      // Give the event definition its own id so BPMN tools can reference it
      children.push(`<messageEventDefinition id="msgDef_${n.id}"/>`);
    }

    if (children.length === 0) {
      return `<${tag} id="${n.id}"${nameAttr}/>`;
    }

    return [
      `<${tag} id="${n.id}"${nameAttr}>`,
      ...children.map(c => `  ${c}`),
      `</${tag}>`,
    ].join('\n');
  }

  function buildSequenceFlow(sf) {
    const nameAttr = sf.condition ? ` name="${esc(sf.condition)}"` : '';
    const open = `<sequenceFlow id="${sf.id}"${nameAttr} sourceRef="${sf.source}" targetRef="${sf.target}"`;

    if (!sf.condition) return `${open}/>`;

    // Conditional flow: add a <conditionExpression> child
    return [
      `${open}>`,
      `  <conditionExpression xsi:type="tFormalExpression">${esc(sf.condition)}</conditionExpression>`,
      `</sequenceFlow>`,
    ].join('\n');
  }

  // ─── Build the full XML document ──────────────────────────────────────────

  const xml = [];

  xml.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xml.push(`<definitions`);
  xml.push(`  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"`);
  xml.push(`  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`);
  xml.push(`  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"`);
  xml.push(`  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"`);
  xml.push(`  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"`);
  xml.push(`  id="Definitions_1"`);
  xml.push(`  targetNamespace="http://bpmn.io/schema/bpmn">`);
  xml.push('');

  // ── <collaboration> ───────────────────────────────────────────────────────

  xml.push('  <collaboration id="collaboration_1">');
  xml.push('');

  // Pools → participants
  xml.push('    <!-- Participants (one per pool, each backed by its own <process>) -->');
  for (const pool of pools) {
    xml.push(`    <participant id="${pool.id}" name="${esc(pool.label)}" processRef="process_${pool.id}"/>`);
  }
  xml.push('');

  // Cross-pool message flows live here, not inside any process
  xml.push('    <!-- Message flows (cross-pool communication) -->');
  for (const mf of messageFlows) {
    const nameAttr = mf.label ? ` name="${esc(mf.label)}"` : '';
    xml.push(`    <messageFlow id="${mf.id}"${nameAttr} sourceRef="${mf.source}" targetRef="${mf.target}"/>`);
  }

  xml.push('');
  xml.push('  </collaboration>');
  xml.push('');

  // ── One <process> per pool ────────────────────────────────────────────────

  for (const pool of pools) {
    const poolLanes = lanesByPool.get(pool.id) ?? [];
    const poolSFs   = sfByPool.get(pool.id)   ?? [];

    xml.push(`  <!-- ═══════════════════ Pool: ${pool.label} ═══════════════════ -->`);
    xml.push(`  <process id="process_${pool.id}" name="${esc(pool.label)}" isExecutable="false">`);
    xml.push('');

    // ── LaneSet: registers each lane and its nodes with the process ─────────
    xml.push(`    <laneSet id="laneSet_${pool.id}">`);
    for (const lane of poolLanes) {
      xml.push(`      <lane id="${lane.id}" name="${esc(lane.label)}">`);
      for (const n of (nodesByLane.get(lane.id) ?? [])) {
        xml.push(`        <flowNodeRef>${n.id}</flowNodeRef>`);
      }
      xml.push(`      </lane>`);
    }
    xml.push(`    </laneSet>`);
    xml.push('');

    // ── Flow nodes (grouped by lane for readability) ─────────────────────────
    for (const lane of poolLanes) {
      const laneNodes = nodesByLane.get(lane.id) ?? [];
      if (laneNodes.length === 0) continue;

      xml.push(`    <!-- ─── Lane: ${lane.label} ─── -->`);
      for (const n of laneNodes) {
        xml.push(indentBlock(buildNode(n), 4));
      }
      xml.push('');
    }

    // ── Sequence flows for this pool ─────────────────────────────────────────
    if (poolSFs.length > 0) {
      xml.push('    <!-- Sequence flows -->');
      for (const sf of poolSFs) {
        xml.push(indentBlock(buildSequenceFlow(sf), 4));
      }
      xml.push('');
    }

    xml.push('  </process>');
    xml.push('');
  }

  // ── DI stub (the layout step will replace the comment with real shapes/edges)
  xml.push('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">');
  xml.push('    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="collaboration_1">');
  xml.push('      <!-- TODO: BPMNShape and BPMNEdge elements go here after layout -->');
  xml.push('    </bpmndi:BPMNPlane>');
  xml.push('  </bpmndi:BPMNDiagram>');
  xml.push('');
  xml.push('</definitions>');

  return xml.join('\n');
}


// ─── Quick test ───────────────────────────────────────────────────────────────
// Uncomment to run with Node.js:
//
//   const data = require('./yourDiagram.json');
//   console.log(jsonToBpmnXml(data));
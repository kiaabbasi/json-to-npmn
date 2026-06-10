/**
 * restoreMessageFlows.js
 *
 * After the layout step (which requires all flows to be sequenceFlows in one
 * process), this function converts the message-flow edges back to proper
 * BPMN <messageFlow> elements inside <collaboration>.
 *
 * For each message flow it:
 *   1. Removes the <sequenceFlow id="X" .../> element
 *   2. Strips <outgoing>X</outgoing> from the source node
 *   3. Strips <incoming>X</incoming> from the target node
 *   4. Inserts <messageFlow id="X" .../> into <collaboration>
 *
 * The <BPMNEdge> entries in the diagram section are left untouched —
 * they reference by element id and work for both flow types.
 *
 * ─── How message flows are identified ─────────────────────────────────────
 * Two sources, merged and de-duplicated:
 *   a) json.messageFlows  — explicit list in the JSON model
 *   b) Any entry in json.sequenceFlows whose source and target nodes belong
 *      to different pools (auto-detected cross-pool flows)
 *
 * @param  {string} xmlString  The laid-out BPMN XML
 * @param  {object} json       The original JSON model
 * @returns {string}           Updated XML with proper messageFlow elements
 */
export function restoreFlows(xmlString, json) {

  // ─── Build pool-lookup helpers ──────────────────────────────────────────
  const laneById   = new Map((json.lanes  ?? []).map(l => [l.id, l]));
  const nodeById   = new Map((json.nodes  ?? []).map(n => [n.id, n]));
  const nodePoolId = id => laneById.get(nodeById.get(id)?.lane)?.pool ?? null;

  // ─── Collect message-flow definitions ──────────────────────────────────
  const seen      = new Set();
  const msgFlows  = [];

  for (const mf of (json.messageFlows ?? [])) {
    if (!seen.has(mf.id)) { seen.add(mf.id); msgFlows.push(mf); }
  }

  for (const sf of (json.sequenceFlows ?? [])) {
    if (seen.has(sf.id)) continue;

    const sp = nodePoolId(sf.source);
    const tp = nodePoolId(sf.target);

    if (sp !== null && tp !== null && sp !== tp) {
      seen.add(sf.id);
      msgFlows.push(sf);
    }
  }

  // ─── NEW: Collect data associations ────────────────────────────────────
  const associations = [];
  const assocSeen = new Set();

  for (const da of (json.dataAssociations ?? [])) {
    if (!assocSeen.has(da.id)) {
      assocSeen.add(da.id);
      associations.push(da);
    }
  }

  if (msgFlows.length === 0 && associations.length === 0) return xmlString;

  // ─── XML attribute-escape helper ───────────────────────────────────────
  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let xml = xmlString;

  // ─── Remove sequenceFlow leftovers (for message flows) ────────────────
  for (const mf of msgFlows) {
    const { id } = mf;

    xml = xml.replace(new RegExp(`\\s*<outgoing>${id}</outgoing>`, 'g'), '');
    xml = xml.replace(new RegExp(`\\s*<incoming>${id}</incoming>`, 'g'), '');

    xml = xml.replace(
      new RegExp(`[ \\t]*<sequenceFlow[^>]*\\bid="${id}"[^>]*/>[\\r\\n]*`, 'g'),
      ''
    );

    xml = xml.replace(
      new RegExp(`[ \\t]*<sequenceFlow[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</sequenceFlow>[\\r\\n]*`, 'g'),
      ''
    );
  }

  // ─── Remove dataAssociation leftovers (NEW) ───────────────────────────
  for (const a of associations) {
    const { id } = a;

    xml = xml.replace(new RegExp(`\\s*<outgoing>${id}</outgoing>`, 'g'), '');
    xml = xml.replace(new RegExp(`\\s*<incoming>${id}</incoming>`, 'g'), '');

    xml = xml.replace(
      new RegExp(`[ \\t]*<dataAssociation[^>]*\\bid="${id}"[^>]*/>[\\r\\n]*`, 'g'),
      ''
    );

    xml = xml.replace(
      new RegExp(`[ \\t]*<dataAssociation[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</dataAssociation>[\\r\\n]*`, 'g'),
      ''
    );
  }

  // ─── Build <messageFlow> elements ──────────────────────────────────────
  const mfXml = msgFlows
    .map(mf => {
      const nameAttr = mf.label ? ` name="${esc(mf.label)}"` : '';
      return `    <messageFlow id="${mf.id}"${nameAttr} sourceRef="${mf.source}" targetRef="${mf.target}"/>`;
    })
    .join('\n');

  // ─── Build <association> elements (NEW) ────────────────────────────────
  const assocXml = associations
    .map(a => {
      const nameAttr = a.label ? ` name="${esc(a.label)}"` : '';
      return `    <association id="${a.id}"${nameAttr} sourceRef="${a.source}" targetRef="${a.target}"/>`;
    })
    .join('\n');

  // ─── Insert before </collaboration> ───────────────────────────────────
  xml = xml.replace(
    /(\s*<\/collaboration>)/,
    `\n\n    <!-- Message flows (restored after layout) -->\n${mfXml}\n\n    <!-- Data associations (restored after layout) -->\n${assocXml}\n  </collaboration>`
  );

  return xml;
}
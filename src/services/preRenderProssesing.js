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
export function restoreMessageFlows(xmlString, json) {

  // ─── Build pool-lookup helpers ──────────────────────────────────────────
  const laneById   = new Map((json.lanes  ?? []).map(l => [l.id, l]));
  const nodeById   = new Map((json.nodes  ?? []).map(n => [n.id, n]));
  const nodePoolId = id => laneById.get(nodeById.get(id)?.lane)?.pool ?? null;

  // ─── Collect message-flow definitions ──────────────────────────────────
  // Merge explicit messageFlows + auto-detected cross-pool sequenceFlows.
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

  if (msgFlows.length === 0) return xmlString;   // nothing to do

  // ─── XML attribute-escape helper ───────────────────────────────────────
  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // ─── Process each message flow ─────────────────────────────────────────
  let xml = xmlString;

  for (const mf of msgFlows) {
    const { id } = mf;

    // 1. Remove <outgoing>id</outgoing> from the source node
    xml = xml.replace(new RegExp(`\\s*<outgoing>${id}</outgoing>`, 'g'), '');

    // 2. Remove <incoming>id</incoming> from the target node
    xml = xml.replace(new RegExp(`\\s*<incoming>${id}</incoming>`, 'g'), '');

    // 3a. Remove self-closing <sequenceFlow ... id="X" ... />
    xml = xml.replace(
      new RegExp(`[ \\t]*<sequenceFlow[^>]*\\bid="${id}"[^>]*/>[\\r\\n]*`, 'g'),
      ''
    );

    // 3b. Remove block-form <sequenceFlow ... id="X" ...> … </sequenceFlow>
    //     (used when a conditionExpression child is present)
    xml = xml.replace(
      new RegExp(`[ \\t]*<sequenceFlow[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</sequenceFlow>[\\r\\n]*`, 'g'),
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

  // ─── Insert before </collaboration> ───────────────────────────────────
  xml = xml.replace(
    /(\s*<\/collaboration>)/,
    `\n\n    <!-- Message flows (restored after layout) -->\n${mfXml}\n  </collaboration>`
  );

  return xml;
}
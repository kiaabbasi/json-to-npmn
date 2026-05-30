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
  const jsonParsed = JSON.parse(text);

  const transformer = new BpmnProcessTransformer();
  const transformedProcess = transformer.transform(jsonParsed.process);

  const document = new DOMParser().parseFromString(
    `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
      xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
      id="definitions_1">
      <bpmn:process id="Process_1" isExecutable="false"></bpmn:process>
    </bpmn:definitions>`,
    "text/xml"
  );

  const processElement = document.getElementsByTagName("bpmn:process")[0];

  // elements
  for (const element of transformedProcess.elements) {
    const elem = document.createElement("bpmn:" + element.type);
    elem.setAttribute("id", element.id);

    if (element.label) {
      elem.setAttribute("name", element.label);
    }

    if (element.default_flow) {
      elem.setAttribute("default", element.default_flow);
    }

    for (const incoming of element.incoming || []) {
      const inc = document.createElement("bpmn:incoming");
      inc.textContent = incoming;
      elem.appendChild(inc);
    }

    for (const outgoing of element.outgoing || []) {
      const out = document.createElement("bpmn:outgoing");
      out.textContent = outgoing;
      elem.appendChild(out);
    }

    if (element.eventDefinition) {
      const eventDef = document.createElement("bpmn:" + element.eventDefinition);
      eventDef.setAttribute("id", `${element.eventDefinition}_${element.id}`);
      elem.appendChild(eventDef);
    }

    processElement.appendChild(elem);
  }

  // flows
  for (const flow of transformedProcess.flows) {
    const seqFlow = document.createElement("bpmn:sequenceFlow");

    seqFlow.setAttribute("id", flow.id);
    seqFlow.setAttribute("sourceRef", flow.sourceRef);
    seqFlow.setAttribute("targetRef", flow.targetRef);

    if (flow.condition) {
      seqFlow.setAttribute("name", flow.condition);
    }

    processElement.appendChild(seqFlow);
  }

  const xmlString = new XMLSerializer().serializeToString(document);
  return xmlString.replace(/></g, ">\n<");
}
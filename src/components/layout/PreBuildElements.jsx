import React, { useState } from 'react';
import Card from '../Card';
import { useBpmn } from '../BpmnContext';

async function buildElementsFromXml(modeler, xml) {
    // از همون moddle داخلی modeler استفاده می‌کنیم تا type‌ها سازگار باشن
    const moddle = modeler.get('moddle');
    const elementFactory = modeler.get('elementFactory');

    const { rootElement: definitions } = await moddle.fromXML(xml);

    const process = definitions.rootElements.find(
        (el) => el.$type === 'bpmn:Process'
    );
    const diagram = definitions.diagrams[0];
    const plane = diagram.plane;

    // map: id المان semantic -> DI اون (شامل bounds یا waypoint)
    const diMap = new Map();
    plane.planeElement.forEach((di) => {
        if (di.bpmnElement) diMap.set(di.bpmnElement.id, di);
    });

    const shapesById = new Map();
    const shapes = [];
    const connections = [];

    // پاس اول: همه‌ی flow node ها (task, gateway, event, subProcess, ...)
    process.flowElements
        .filter((bo) => bo.$type !== 'bpmn:SequenceFlow')
        .forEach((bo) => {
            const di = diMap.get(bo.id);
            const bounds = di?.bounds;

            const shape = elementFactory.createShape({
                type: bo.$type,
                businessObject: bo,
                x: bounds?.x ?? 0,
                y: bounds?.y ?? 0,
                width: bounds?.width ?? 100,
                height: bounds?.height ?? 80,
            });

            shapesById.set(bo.id, shape);
            shapes.push(shape);
        });

    // پاس دوم: sequence flow ها (نیاز به source/target shape دارن)
    process.flowElements
        .filter((bo) => bo.$type === 'bpmn:SequenceFlow')
        .forEach((bo) => {
            const di = diMap.get(bo.id);
            const source = shapesById.get(bo.sourceRef.id);
            const target = shapesById.get(bo.targetRef.id);

            if (!source || !target) return; // نود مرجع پیدا نشد

            const waypoints = di?.waypoint?.map((wp) => ({ x: wp.x, y: wp.y }));

            const connection = elementFactory.createConnection({
                type: bo.$type,
                businessObject: bo,
                source,
                target,
                waypoints,
            });

            connections.push(connection);
        });

    return [...shapes, ...connections];
}
function PreBuildElements() {
    const [elements, setElemnts] = useState([{
        id: 0, icon: ".", title: "test", description: "descriptin",
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1iy4ysr" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="18.16.0">
  <bpmn:process id="Process_1vwpdz2" isExecutable="false">
    <bpmn:task id="Activity_11fmxx9">
      <bpmn:incoming>Flow_0bvdmkb</bpmn:incoming>
    </bpmn:task>
    <bpmn:task id="Activity_09vpzm9">
      <bpmn:incoming>Flow_1veohk9</bpmn:incoming>
    </bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_1cx2v18">
      <bpmn:incoming>Flow_1mu9tmv</bpmn:incoming>
      <bpmn:outgoing>Flow_1veohk9</bpmn:outgoing>
      <bpmn:outgoing>Flow_0bvdmkb</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_1veohk9" sourceRef="Gateway_1cx2v18" targetRef="Activity_09vpzm9" />
    <bpmn:sequenceFlow id="Flow_0bvdmkb" sourceRef="Gateway_1cx2v18" targetRef="Activity_11fmxx9" />
    <bpmn:task id="Activity_0i1bpdu">
      <bpmn:outgoing>Flow_1mu9tmv</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1mu9tmv" sourceRef="Activity_0i1bpdu" targetRef="Gateway_1cx2v18" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1vwpdz2">
      <bpmndi:BPMNShape id="Activity_11fmxx9_di" bpmnElement="Activity_11fmxx9">
        <dc:Bounds x="530" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_09vpzm9_di" bpmnElement="Activity_09vpzm9">
        <dc:Bounds x="530" y="290" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1cx2v18_di" bpmnElement="Gateway_1cx2v18" isMarkerVisible="true">
        <dc:Bounds x="355" y="215" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0i1bpdu_di" bpmnElement="Activity_0i1bpdu">
        <dc:Bounds x="160" y="200" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1veohk9_di" bpmnElement="Flow_1veohk9">
        <di:waypoint x="380" y="265" />
        <di:waypoint x="380" y="330" />
        <di:waypoint x="530" y="330" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0bvdmkb_di" bpmnElement="Flow_0bvdmkb">
        <di:waypoint x="380" y="215" />
        <di:waypoint x="380" y="120" />
        <di:waypoint x="530" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1mu9tmv_di" bpmnElement="Flow_1mu9tmv">
        <di:waypoint x="260" y="240" />
        <di:waypoint x="355" y="240" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    },{ id: 1, icon: ".", title: "test2", description: "descriptin",
      xml:`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1iy4ysr" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="18.16.0">
  <bpmn:process id="Process_1vwpdz2" isExecutable="false">
    <bpmn:startEvent id="Event_00cs5fo">
      <bpmn:outgoing>Flow_19lcqcf</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:startEvent id="Event_08tjlzi">
      <bpmn:outgoing>Flow_0ympquz</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_0675msj">
      <bpmn:incoming>Flow_0ympquz</bpmn:incoming>
      <bpmn:outgoing>Flow_1ksy6cf</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_0ympquz" sourceRef="Event_08tjlzi" targetRef="Activity_0675msj" />
    <bpmn:task id="Activity_0xu0nvk">
      <bpmn:incoming>Flow_19lcqcf</bpmn:incoming>
      <bpmn:incoming>Flow_1ksy6cf</bpmn:incoming>
      <bpmn:outgoing>Flow_017dk7t</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Activity_05xr01k">
      <bpmn:incoming>Flow_017dk7t</bpmn:incoming>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_19lcqcf" sourceRef="Event_00cs5fo" targetRef="Activity_0xu0nvk" />
    <bpmn:sequenceFlow id="Flow_1ksy6cf" sourceRef="Activity_0675msj" targetRef="Activity_0xu0nvk" />
    <bpmn:sequenceFlow id="Flow_017dk7t" sourceRef="Activity_0xu0nvk" targetRef="Activity_05xr01k" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1vwpdz2">
      <bpmndi:BPMNShape id="Event_00cs5fo_di" bpmnElement="Event_00cs5fo">
        <dc:Bounds x="162" y="72" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0675msj_di" bpmnElement="Activity_0675msj">
        <dc:Bounds x="260" y="230" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_08tjlzi_di" bpmnElement="Event_08tjlzi">
        <dc:Bounds x="152" y="252" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0xu0nvk_di" bpmnElement="Activity_0xu0nvk">
        <dc:Bounds x="460" y="140" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_05xr01k_di" bpmnElement="Activity_05xr01k">
        <dc:Bounds x="660" y="140" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_0ympquz_di" bpmnElement="Flow_0ympquz">
        <di:waypoint x="188" y="270" />
        <di:waypoint x="260" y="270" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_19lcqcf_di" bpmnElement="Flow_19lcqcf">
        <di:waypoint x="198" y="90" />
        <di:waypoint x="329" y="90" />
        <di:waypoint x="329" y="180" />
        <di:waypoint x="460" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1ksy6cf_di" bpmnElement="Flow_1ksy6cf">
        <di:waypoint x="360" y="270" />
        <di:waypoint x="410" y="270" />
        <di:waypoint x="410" y="180" />
        <di:waypoint x="460" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_017dk7t_di" bpmnElement="Flow_017dk7t">
        <di:waypoint x="560" y="180" />
        <di:waypoint x="660" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    }])

    const modeler = useBpmn();
    const handleClick = async (item, event) => {
        
        const create = modeler.current.get('create');


        const elements = await buildElementsFromXml(modeler.current, item.xml);
        create.start(event, elements);
    };

    return (
        <div className="flex flex-col gap-2">
            {elements.map((item,indx) => (
                <Card
                    key={indx}
                    icon={item?.icon}
                    title={item?.title}
                    description={item?.description}
                    onClick={(e) => { handleClick(item, e) }}
                />
            ))}
        </div>
    );
}

export default PreBuildElements;
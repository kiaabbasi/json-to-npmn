import { useState } from "react";

import BpmnEditor from "./components/BpmnEditor";
import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/layout/ChatMessages";
import { BpmnProvider } from "./components/BpmnContext";

import jsonToBpmnXml from "./services/jsonToBpmnXml";
import { restoreFlows } from "./services/preRenderProssesing";
import { layoutProcess } from "yet-another-bpmn-auto-layout";
import LeftSideBar from "./components/layout/LeftSideBar";

function App() {
    const [xmlText, setXmlText] = useState(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">

  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane
      id="BPMNPlane_1"
      bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>

</bpmn:definitions>`);

    const [jsonModel, setJsonModel] = useState("");
    const [selectedNodes, setSelectedNodes] = useState([]);
    const [messages, setMessages] = useState([]);

    const handleGenerate = async (text) => {
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "user", text },
        ]);

        try {
            const parsed = JSON.parse(text);
            setJsonModel(parsed);

            const basicXml = jsonToBpmnXml(parsed);
            const diagramWithLayoutXML = await layoutProcess(basicXml);
            const finalXml = restoreFlows(diagramWithLayoutXML, parsed);

            setXmlText(finalXml);

            setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: "assistant", text: "Diagram updated." },
            ]);
        } catch (err) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: "Couldn't parse that — check the JSON and try again.",
                },
            ]);
        }
    };

    return (
        <BpmnProvider>
            <div className="flex flex-col md:flex-row w-full h-screen">
                {/* Sidebar */}
                 <LeftSideBar messages={messages} onSend={handleGenerate} />


                {/* Editor */}
                <div className="flex-1 p-4 h-1/2 md:h-full min-w-0">
                    <div className="w-full h-full">
                        <BpmnEditor xml={xmlText} onSelectionChange={setSelectedNodes} />
                    </div>
                </div>
            </div>
        </BpmnProvider>
    );
}

export default App;
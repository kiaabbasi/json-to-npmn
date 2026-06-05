import { useRef, useState } from 'react'
import BpmnEditor from './components/BpmnEditor'
import TextBox from './components/TextBox'
import useBpmnAutoLayout, { jsonToBpmnXml } from './services/useBpmnAutoLayout'
import { buildELKGraph } from './services/JsonToElkGraph';
import elkLayout from './services/ElkGraphLayout';
import elkToBpmn from './services/elkGraphToBpmn';
function App() {

  const { layoutDiagram } = useBpmnAutoLayout();
  const [xmlText, setXmlText] = useState(``)
  const [jsonText, setJsonText] = useState('')

  return (
    <>
      <div className='p-3'>
        <TextBox onChange={setJsonText} />
      </div>

      <button className='bg-amber-100 w-2xl' onClick={async () => {
        const model = JSON.parse(jsonText);
        const { nodes, sequenceFlows, pools = [], lanes = [] } = model;

        // 1. Build ELK graph
        const elkGraph = buildELKGraph(nodes, sequenceFlows, pools, lanes);
        console.log(elkGraph)

        // 2. Run layout → absolute positions + real waypoints
        const { positions, edgeWaypoints } = await elkLayout(elkGraph);
        console.log(positions, edgeWaypoints)
        // 3. Generate BPMN 2.0 XML
        const xml = elkToBpmn(model, positions, edgeWaypoints);

        console.log(xml);
        setXmlText(xml)
      }}>Render</button>
      <div className='border-2'>

        {<BpmnEditor xml={xmlText} />}
      </div>
    </>
  )
}

export default App

import { useRef, useState } from 'react'
import BpmnEditor from './components/BpmnEditor'
import TextBox from './components/TextBox'
import jsonToBpmnXml, { findById } from './services/jsonToBpmnXml';

import { layoutProcess } from 'yet-another-bpmn-auto-layout';
import { restoreFlows } from './services/preRenderProssesing';

function App() {


  const [xmlText, setXmlText] = useState(``)
  const [jsonText, setJsonText] = useState('')
  const [jsonModel, setJsonModel] = useState('')

  const [selectedNodes, setSelectedNodes] = useState([]);
  return (
    <>
      <div className='p-3'>
        <TextBox onChange={setJsonText} />
      </div>

      <button className='bg-amber-100 w-2xl' onClick={async () => {
        const parsed = JSON.parse(jsonText);
        setJsonModel(parsed);
        
        
        
        const basicXml = jsonToBpmnXml(parsed)

        const diagramWithLayoutXML = await layoutProcess(basicXml);
        //console.log(diagramWithLayoutXML);
        let finalXml = restoreFlows(diagramWithLayoutXML, parsed)
        setXmlText(finalXml)

      }}>Render</button>
      <span>{selectedNodes.map((v) => {
        console.log(findById(jsonModel, v.id), v.id)
        return v.id + ",  "
      })}</span>
      <div className='border-2'>

        {<BpmnEditor xml={xmlText} onSelectionChange={setSelectedNodes} />}
      </div>
    </>
  )
}

export default App

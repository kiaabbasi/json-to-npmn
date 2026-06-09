import { useRef, useState } from 'react'
import BpmnEditor from './components/BpmnEditor'
import TextBox from './components/TextBox'
import jsonToBpmnXml from './services/jsonToBpmnXml';

import { layoutProcess } from 'yet-another-bpmn-auto-layout';

function App() {


  const [xmlText, setXmlText] = useState(``)
  const [jsonText, setJsonText] = useState('')

  return (
    <>
      <div className='p-3'>
        <TextBox onChange={setJsonText} />
      </div>

      <button className='bg-amber-100 w-2xl' onClick={async () => {
        const model = JSON.parse(jsonText);
        let basicXml = jsonToBpmnXml(model)
        console.log(basicXml);

        const diagramWithLayoutXML = await layoutProcess(basicXml);
        console.log(diagramWithLayoutXML);
        setXmlText(diagramWithLayoutXML)

      }}>Render</button>
      <div className='border-2'>

        {<BpmnEditor xml={xmlText} />}
      </div>
    </>
  )
}

export default App

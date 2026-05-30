import { useRef, useState } from 'react'
import BpmnEditor from './components/BpmnEditor'
import TextBox from './components/TextBox'
import useBpmnAutoLayout, { jsonToBpmnXml } from './hooks/useBpmnAutoLayout'
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

        let xml = jsonToBpmnXml(jsonText)
        console.log(xml)

        xml = await layoutDiagram(xml)

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

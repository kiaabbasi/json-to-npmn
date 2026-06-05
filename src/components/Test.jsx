import React, { useState } from 'react'
import TextBox from './TextBox'
import JsonToElkGraph, { buildELKGraph } from '../services/JsonToElkGraph'
import elkGraphLayout from '../services/ElkGraphLayout'
import elkGraphToBpmn from '../services/elkGraphToBpmn'
import elkLayout from '../services/ElkGraphLayout'
import elkToBpmn from '../services/elkGraphToBpmn'

export default function Test() {
  const [jsonText, setJsonText] = useState('')
  return (
    <div className='p-2'>
      <TextBox onChange={setJsonText} />
      <button
        className="bg-blue-500 text-white px-4 py-2 mt-2"
        onClick={async () => {
          const model = JSON.parse(jsonText);
          const { nodes, sequenceFlows, pools = [], lanes = [] } = model;
          
          // 1. Build ELK graph
          const elkGraph = buildELKGraph(nodes, sequenceFlows, pools, lanes);
          console.log(elkGraph)
          
          // 2. Run layout → absolute positions + real waypoints
          const { positions, edgeWaypoints } = await elkLayout(elkGraph);
          console.log(positions,edgeWaypoints)
          // 3. Generate BPMN 2.0 XML
          const xml = elkToBpmn(model, positions, edgeWaypoints);

          console.log(xml);
          // setBpmnXml(xml);  ← feed into bpmn-js Viewer
        }}>
        Render
      </button>

    </div>
  )
}

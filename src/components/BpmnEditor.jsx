import { useEffect, useRef } from "react";

import BpmnJS from "bpmn-js/dist/bpmn-modeler.development.js";

function layoutSideEffect(modeler) {
    console.log("ssss");

    if (!modeler) return;
    console.log("eeee")
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');

    const visitedConnections = new Set();

    const layoutConnectionSafely = (connection) => {
        if (!connection) return;
        if (visitedConnections.has(connection.id)) return;

        visitedConnections.add(connection.id);

        if (typeof modeling.layoutConnection === 'function') {
            modeling.layoutConnection(connection);
        }
    };

    const elements = elementRegistry.getAll();

    elements.forEach(element => {
        if (!element) return;

        // اگر connection است مستقیم layout کن
        if (element.waypoints) {
            layoutConnectionSafely(element);
            return;
        }

        // اگر shape است → همه ارتباطاتش
        const incoming = element.incoming || [];
        const outgoing = element.outgoing || [];

        [...incoming, ...outgoing].forEach(layoutConnectionSafely);
    });
}

export default function BpmnEditor({ xml, onSelectionChange }) {

    const containerRef = useRef(null);
    const modelerRef = useRef(null);



    useEffect(() => {

        modelerRef.current = new BpmnJS({
            container: containerRef.current,
        });

        const defaultDiagram = xml

        async function loadDiagram() {
            try {

                await modelerRef.current.importXML(defaultDiagram);

                const canvas = modelerRef.current.get("canvas");

                canvas.zoom("fit-viewport");
                layoutSideEffect(modelerRef.current)

            } catch (err) {
                console.log(err);
            }
        }

        loadDiagram();

        return () => {
            modelerRef.current.destroy();
        };

    }, [xml]);

    useEffect(() => {
        if (!modelerRef.current) return;



        const eventBus = modelerRef.current.get('eventBus');

        const handler = (event) => {
            const selected = event.newSelection.map(e => ({
                id: e.id,
                type: e.type,
                businessObject: e.businessObject
            }));

            onSelectionChange?.(selected);
        };

        eventBus.on('selection.changed', handler);

        return () => {
            eventBus.off('selection.changed', handler);
        };
    }, [modelerRef.current, onSelectionChange]);

    
    return (
        <>
            <button onClick={() => {
                let definitions = modelerRef.current.getDefinitions()
                console.log(definitions);
                layoutSideEffect(modelerRef.current)
            }}>TESt</button>
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100vh",
                    border: "1px solid #ccc"
                }}
            />
        </>
    );
}
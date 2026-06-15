import { useEffect, useRef } from "react";

import BpmnJS from "bpmn-js/dist/bpmn-modeler.development.js";

export default function BpmnEditor({ xml, onSelectionChange  }) {

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

            } catch (err) {
                console.error(err);
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
    }, [modelerRef.current,onSelectionChange]);

    return (
        <>
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100vh",
                    border: "1px solid #ccc"
                }}
            />
            <button onClick={() => {
                let definitions = modelerRef.current.getDefinitions()
                console.log(definitions);

            }}>TESt</button>
        </>
    );
}
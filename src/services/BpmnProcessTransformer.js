export class BpmnProcessTransformer {
        transform(process, parentNextElementId = null) {
        const elements = [];
        const flows = [];

        const addFlow = (sourceRef, targetRef, flowId = null, condition = null) => {
            // جلوگیری از تکرار فلو
            if (flows.some(f => f.sourceRef === sourceRef && f.targetRef === targetRef)) {
                return;
            }

            flowId = flowId || `${sourceRef}-${targetRef}`;

            flows.push({
                id: flowId,
                sourceRef: sourceRef,
                targetRef: targetRef,
                condition: condition
            });
        };

        const handleExclusiveGateway = (element, nextElementId = null) => {
            let joinGatewayId = null;

            if (element.has_join) {
                joinGatewayId = `${element.id}-join`;
                elements.push({
                    id: joinGatewayId,
                    type: "exclusiveGateway",
                    label: null
                });
            }

            for (const branch of element.branches) {
                if (!branch.path) {
                    const targetRef = branch.next || nextElementId;
                    if (targetRef) {
                        addFlow(element.id, targetRef, null, branch.condition);
                    }
                    continue;
                }

                let branchStructure;
                const branchNext = branch.next;

                if (branchNext) {
                    branchStructure = this.transform(branch.path, branchNext);
                } else {
                    branchStructure = this.transform(branch.path, joinGatewayId || nextElementId);
                }

                elements.push(...branchStructure.elements);
                flows.push(...branchStructure.flows);

                const firstElement = branchStructure.elements[0];
                if (firstElement) {
                    addFlow(element.id, firstElement.id, null, branch.condition);
                }
            }

            return joinGatewayId;
        };

        const handleInclusiveGateway = (element, nextElementId = null) => {
            let joinGatewayId = null;
            let defaultFlowId = null;

            if (element.has_join) {
                joinGatewayId = `${element.id}-join`;
                elements.push({
                    id: joinGatewayId,
                    type: "inclusiveGateway",
                    label: null
                });
            }

            for (const branch of element.branches) {
                const isDefault = branch.is_default || false;

                if (!branch.path) {
                    const targetRef = branch.next || nextElementId;
                    if (targetRef) {
                        const flowId = `${element.id}-${targetRef}`;
                        addFlow(element.id, targetRef, flowId, branch.condition);
                        if (isDefault) defaultFlowId = flowId;
                    }
                    continue;
                }

                let branchStructure;
                if (branch.next) {
                    branchStructure = this.transform(branch.path, branch.next);
                } else {
                    branchStructure = this.transform(branch.path, joinGatewayId || nextElementId);
                }

                elements.push(...branchStructure.elements);
                flows.push(...branchStructure.flows);

                const firstElement = branchStructure.elements[0];
                if (firstElement) {
                    const flowId = `${element.id}-${firstElement.id}`;
                    addFlow(element.id, firstElement.id, flowId, branch.condition);
                    if (isDefault) defaultFlowId = flowId;
                }
            }

            // ذخیره default flow
            if (defaultFlowId) {
                const gatewayElement = elements.find(el => el.id === element.id);
                if (gatewayElement) gatewayElement.default_flow = defaultFlowId;
            }

            return joinGatewayId;
        };

        const handleParallelGateway = (element) => {
            const joinGatewayId = `${element.id}-join`;
            elements.push({
                id: joinGatewayId,
                type: "parallelGateway",
                label: null
            });

            for (const branch of element.branches) {
                const branchStructure = this.transform(branch, joinGatewayId);

                if (!branchStructure.elements.length) {
                    throw new Error(
                        `Parallel gateway '${element.id}' cannot have an empty branch.`
                    );
                }

                elements.push(...branchStructure.elements);
                flows.push(...branchStructure.flows);

                const firstElement = branchStructure.elements[0];
                const lastElement = branchStructure.elements[branchStructure.elements.length - 1];

                addFlow(element.id, firstElement.id);
                addFlow(lastElement.id, joinGatewayId);
            }

            return joinGatewayId;
        };

        // Main processing loop
        for (let i = 0; i < process.length; i++) {
            const element = process[i];
            const nextElementId = i < process.length - 1 
                ? process[i + 1].id 
                : parentNextElementId;

            const transformedElement = {
                id: element.id,
                type: element.type,
                label: element.label || null
            };

            if (element.eventDefinition) {
                transformedElement.eventDefinition = element.eventDefinition;
            }

            elements.push(transformedElement);

            let joinGatewayId = null;

            if (element.type === "exclusiveGateway") {
                joinGatewayId = handleExclusiveGateway(element, nextElementId);
                if (joinGatewayId && nextElementId) {
                    addFlow(joinGatewayId, nextElementId);
                }
            } 
            else if (element.type === "inclusiveGateway") {
                joinGatewayId = handleInclusiveGateway(element, nextElementId);
                if (joinGatewayId && nextElementId) {
                    addFlow(joinGatewayId, nextElementId);
                }
            } 
            else if (element.type === "parallelGateway") {
                joinGatewayId = handleParallelGateway(element);
                if (nextElementId) {
                    addFlow(joinGatewayId, nextElementId);
                }
            } 
            else if (nextElementId && element.type !== "endEvent") {
                addFlow(element.id, nextElementId);
            }
        }

        // Add incoming and outgoing to all elements
        for (const el of elements) {
            el.incoming = flows
                .filter(f => f.targetRef === el.id)
                .map(f => f.id);

            el.outgoing = flows
                .filter(f => f.sourceRef === el.id)
                .map(f => f.id);
        }

        return { elements, flows };
    }
}
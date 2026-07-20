const ALLOWED_NODE_TYPES = [
    // ─── Events ─────────────────────────────────────
    "startEvent",
    "endEvent",

    "intermediateThrowEvent",
    "intermediateCatchEvent",

    "messageIntermediateThrowEvent",
    "messageIntermediateCatchEvent",

    "timerIntermediateCatchEvent",
    "errorIntermediateThrowEvent",
    "signalIntermediateThrowEvent",
    "signalIntermediateCatchEvent",

    "boundaryEvent",

    // ─── Tasks ───────────────────────────────────────
    "task",
    "userTask",
    "serviceTask",
    "scriptTask",
    "manualTask",
    "sendTask",
    "receiveTask",
    "businessRuleTask",

    // ─── Subprocess / Activities ────────────────────
    "subProcess",
    "callActivity",

    "transaction",
    "adHocSubProcess",

    // ─── Gateways ────────────────────────────────────
    "exclusiveGateway",
    "parallelGateway",
    "inclusiveGateway",
    "eventBasedGateway",
    "complexGateway",
];

const ALLOWED_DATA_OBJECT_TYPES = [
    "dataObjectReference",
    "dataStoreReference"
];

const REQUIRED_KEYS = [
    "pools",
    "lanes",
    "nodes",
    "sequenceFlows",
    "messageFlows",
    "dataObjects",
    "dataStores",
    "dataAssociations",
];

function validateBpmnJson(model) {
    const errors = [];
    const modelKeys = Object.keys(model ?? {});

    REQUIRED_KEYS.forEach(key => {
        if (!(key in model)) {
            errors.push({ rule: "MISSING_KEY", message: `Missing required key "${key}"`, path: key });
        } else if (!Array.isArray(model[key])) {
            errors.push({ rule: "INVALID_KEY_TYPE", message: `"${key}" must be an array`, path: key });
        }
    });

    const extraKeys = modelKeys.filter(k => !REQUIRED_KEYS.includes(k));
    extraKeys.forEach(key => {
        errors.push({ rule: "UNEXPECTED_KEY", message: `Unexpected key "${key}" is not allowed`, path: key });
    });
    /* 1. Pool validation — exactly one pool, period. */
    if (!Array.isArray(model.pools) || model.pools.length !== 1) {
        errors.push({ rule: "POOLS_REQUIRED", message: "Exactly one pool is required", path: "pools" });
    }

    /* 2. Lane validation */
    if (!Array.isArray(model.lanes) || model.lanes.length === 0) {
        errors.push({ rule: "LANE_REQUIRED", message: "At least one lane is required", path: "lanes" });
    }

    /* 3. Merge nodes + data objects/stores BEFORE validating, since this is
          the shape jsonToBpmnXml actually renders. */
    const allNodes = [
        ...(model.nodes ?? []),
        ...(model.dataObjects ?? []),
        ...(model.dataStores ?? []),
    ];

    if (allNodes.length === 0) {
        errors.push({ rule: "NODE_REQUIRED", message: "Nodes are required", path: "nodes" });
        return { valid: false, errors };
    }

    const nodeIds = new Set(allNodes.map(n => n.id));

    /* 3b. Duplicate node id check */
    const seenIds = new Map();
    allNodes.forEach(n => {
        seenIds.set(n.id, (seenIds.get(n.id) ?? 0) + 1);
    });
    seenIds.forEach((count, id) => {
        if (count > 1) {
            errors.push({ rule: "DUPLICATE_NODE_ID", message: `Node id ${id} used ${count} times`, node: id });
        }
    });

    const ALL_ALLOWED_TYPES = [...ALLOWED_NODE_TYPES, ...ALLOWED_DATA_OBJECT_TYPES];

    /* 4. Node type + lane validation */
    allNodes.forEach(node => {
        if (!ALL_ALLOWED_TYPES.includes(node.type)) {
            errors.push({ rule: "INVALID_NODE_TYPE", message: `Node type ${node.type} is not allowed`, node: node.id });
        }

        const laneExists = model.lanes?.some(lane => lane.id === node.lane);
        if (!laneExists) {
            errors.push({ rule: "INVALID_NODE_LANE", message: `Lane ${node.lane} does not exist`, node: node.id });
        }
    });

    /* 5. Start / End validation */
    if (!model.nodes?.some(n => n.type === "startEvent")) {
        errors.push({ rule: "MISSING_START_EVENT", message: "Start event is required", path: "nodes" });
    }
    if (!model.nodes?.some(n => n.type === "endEvent")) {
        errors.push({ rule: "MISSING_END_EVENT", message: "End event is required", path: "nodes" });
    }

    /* 6. Merge sequenceFlows + messageFlows + dataAssociations, same reasoning as nodes. */
    const allFlows = [
        ...(model.sequenceFlows ?? []).map(f => ({ ...f, _kind: "sequenceFlow" })),
        ...(model.messageFlows ?? []).map(f => ({ ...f, _kind: "messageFlow" })),
        ...(model.dataAssociations ?? []).map(f => ({ ...f, _kind: "dataAssociation" })),
    ];

    /* 6a. Duplicate flow id check */
    const seenFlowIds = new Map();
    allFlows.forEach(f => seenFlowIds.set(f.id, (seenFlowIds.get(f.id) ?? 0) + 1));
    seenFlowIds.forEach((count, id) => {
        if (count > 1) {
            errors.push({ rule: "DUPLICATE_FLOW_ID", message: `Flow id ${id} used ${count} times`, flow: id });
        }
    });

    /* 6b. Source/target existence — every flow (including messageFlow) must
           point at a real node id now that blackbox pools are gone. */
    allFlows.forEach(flow => {
        if (!nodeIds.has(flow.source)) {
            errors.push({
                rule: flow._kind === "messageFlow" ? "INVALID_MESSAGE_FLOW_SOURCE" : "INVALID_FLOW_SOURCE",
                message: `Source ${flow.source} not found`,
                flow: flow.id
            });
        }
        if (!nodeIds.has(flow.target)) {
            errors.push({
                rule: flow._kind === "messageFlow" ? "INVALID_MESSAGE_FLOW_TARGET" : "INVALID_FLOW_TARGET",
                message: `Target ${flow.target} not found`,
                flow: flow.id
            });
        }
    });

    /* 6c. No two flows of the same kind with the same source+target. */
    const pairSeen = new Map(); // key: `${kind}:${source}->${target}` -> flow id
    allFlows.forEach(flow => {
        const key = `${flow._kind}:${flow.source}->${flow.target}`;
        if (pairSeen.has(key)) {
            errors.push({
                rule: "DUPLICATE_FLOW_EDGE",
                message: `Duplicate ${flow._kind} from ${flow.source} to ${flow.target} (already defined as ${pairSeen.get(key)})`,
                flow: flow.id
            });
        } else {
            pairSeen.set(key, flow.id);
        }
    });


    return { valid: errors.length === 0, errors };
}


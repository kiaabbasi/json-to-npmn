import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

/**
 * Node dimensions by BPMN type
 */
export const NODE_SIZE = {

  startEvent:         { w: 36,  h: 36  },
  endEvent:           { w: 36,  h: 36  },
  intermediateEvent:  { w: 36,  h: 36  },

  exclusiveGateway:   { w: 50,  h: 50  },
  parallelGateway:    { w: 50,  h: 50  },
  inclusiveGateway:   { w: 50,  h: 50  },
  eventGateway:       { w: 50,  h: 50  },

  task:               { w: 120, h: 80  },
  userTask:           { w: 120, h: 80  },
  serviceTask:        { w: 120, h: 80  },
  scriptTask:        { w: 120, h: 80  },
  manualTask:        { w: 120, h: 80  },

  callActivity:      { w: 120, h: 80  },
  subProcess:        { w: 160, h: 100 },
};

export default function getNodeSize(type) {
  return NODE_SIZE[type] ?? { w: 120, h: 80 };
}

/**
 * Build ELK Graph (FIXED VERSION)
 *
 * FIXES:
 * - Removed ports (ELK default handles center connection correctly)
 * - Removed FIXED_ORDER
 * - Simplified edge routing
 * - More stable BPMN layout
 */
export function buildELKGraph(
  nodes = [],
  flows = [],
  pools = [],
  lanes = []
) {

  /**
   * Helpers
   */
  const laneToPool = Object.fromEntries(
    lanes.map(l => [l.id, l.pool])
  );

  const nodeToLane = Object.fromEntries(
    nodes.map(n => [n.id, n.lane ?? "default_lane"])
  );

  const nodeToPool = Object.fromEntries(
    nodes.map(n => [
      n.id,
      laneToPool[nodeToLane[n.id]] ?? "default_pool"
    ])
  );

  /**
   * Pool list
   */
  const poolIds = pools.length
    ? pools.map(p => p.id)
    : [...new Set(Object.values(nodeToPool))];

  /**
   * pool → lane → nodes
   */
  const poolLaneNodes = {};

  nodes.forEach(node => {

    const poolId = nodeToPool[node.id];
    const laneId = nodeToLane[node.id];

    if (!poolLaneNodes[poolId]) poolLaneNodes[poolId] = {};
    if (!poolLaneNodes[poolId][laneId]) poolLaneNodes[poolId][laneId] = [];

    poolLaneNodes[poolId][laneId].push(node);

  });

  /**
   * Edge distribution
   */
  const laneEdges = {};
  const poolEdges = {};
  const rootEdges = [];

  flows.forEach(flow => {

    const sourceLane = nodeToLane[flow.source];
    const targetLane = nodeToLane[flow.target];

    const sourcePool = nodeToPool[flow.source];
    const targetPool = nodeToPool[flow.target];

    const edge = {
      id: flow.id,
      sources: [flow.source],
      targets: [flow.target],
    };

    if (sourceLane === targetLane) {
      (laneEdges[sourceLane] ??= []).push(edge);
    }
    else if (sourcePool === targetPool) {
      (poolEdges[sourcePool] ??= []).push(edge);
    }
    else {
      rootEdges.push(edge);
    }

  });

  /**
   * BASE config (SIMPLIFIED)
   */
  const BASE = {

    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.edgeRouting": "ORTHOGONAL",

    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",

    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    "elk.spacing.nodeNode": "50",
  };

  /**
   * Final graph
   */
  return {

    id: "root",

    layoutOptions: BASE,

    edges: rootEdges,

    children: poolIds.map(poolId => ({

      id: poolId,

      layoutOptions: {
        ...BASE,
        "elk.padding": "[top=40,left=40,bottom=40,right=40]",
      },

      edges: poolEdges[poolId] ?? [],

      children: Object.entries(poolLaneNodes[poolId] ?? {}).map(
        ([laneId, laneNodes]) => ({

          id: laneId,

          layoutOptions: {
            ...BASE,
            "elk.padding": "[top=30,left=30,bottom=30,right=30]",
            "elk.spacing.nodeNode": "40",
          },

          edges: laneEdges[laneId] ?? [],

          children: laneNodes.map(node => {

            const { w, h } = getNodeSize(node.type);

            return {
              id: node.id,
              width: w,
              height: h,
              labels: [
                { text: node.label ?? "" }
              ],

              /**
               * ❌ ports removed completely
               */
            };

          })

        })
      )

    }))

  };
}
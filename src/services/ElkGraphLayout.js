import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

/**
 * ELK Layout
 */
export default async function elkLayout(graph) {

  const layout = await elk.layout(graph);

  const positions = {};
  const edgeWaypoints = {};

  /**
   * Recursive walk
   */
  function walk(node, ox = 0, oy = 0) {

    const ax = ox + (node.x ?? 0);
    const ay = oy + (node.y ?? 0);

    /**
     * Absolute positions
     */
    if (node.id !== "root") {

      positions[node.id] = {

        x: ax,
        y: ay,

        width: node.width ?? 0,
        height: node.height ?? 0,

      };

    }

    /**
     * IMPORTANT:
     * Process ONLY node-owned edges
     */
    (node.edges ?? []).forEach(edge => {

      if (edgeWaypoints[edge.id]) return;

      const pts = [];

      (edge.sections ?? []).forEach(section => {

        /**
         * Start point
         */
        if (section.startPoint) {

          pts.push({

            x: ax + (section.startPoint.x ?? 0),

            y: ay + (section.startPoint.y ?? 0),

          });

        }

        /**
         * Bend points
         */
        (section.bendPoints ?? []).forEach(bp => {

          pts.push({

            x: ax + (bp.x ?? 0),

            y: ay + (bp.y ?? 0),

          });

        });

        /**
         * End point
         */
        if (section.endPoint) {

          pts.push({

            x: ax + (section.endPoint.x ?? 0),

            y: ay + (section.endPoint.y ?? 0),

          });

        }

      });

      if (pts.length >= 2) {

        edgeWaypoints[edge.id] = pts;

      }

    });

    /**
     * Recurse
     */
    (node.children ?? []).forEach(child => {

      walk(child, ax, ay);

    });

  }

  /**
   * Start walk
   */
  walk(layout, 0, 0);

  console.log("=== POSITIONS ===");
  console.log(positions);

  console.log("=== EDGE WAYPOINTS ===");
  console.log(edgeWaypoints);

  return {

    positions,

    edgeWaypoints,

  };

}
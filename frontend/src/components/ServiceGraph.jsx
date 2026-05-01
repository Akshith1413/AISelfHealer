import CytoscapeComponent from "react-cytoscapejs";

function colorFor(score) {
  if (score >= 90) return "#15803d";
  if (score >= 75) return "#b45309";
  return "#b91c1c";
}

export default function ServiceGraph({ services, edges, onSelect }) {
  const elements = [
    ...services.map((service) => ({
      data: {
        id: service.id,
        label: `${service.name}\n${Math.round(service.health_score)}%`,
        score: service.health_score
      }
    })),
    ...edges.map((edge) => ({
      data: {
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        traffic: edge.traffic
      }
    }))
  ];

  return (
    <div className="panel min-h-[460px] overflow-hidden">
      <CytoscapeComponent
        elements={elements}
        style={{ width: "100%", height: "460px" }}
        layout={{ name: "cose", animate: false, nodeRepulsion: 7000, idealEdgeLength: 130 }}
        cy={(cy) => {
          cy.removeAllListeners();
          cy.on("tap", "node", (event) => onSelect?.(event.target.id()));
        }}
        stylesheet={[
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "center",
              "text-halign": "center",
              color: "#ffffff",
              "font-size": 10,
              "font-weight": 700,
              "text-wrap": "wrap",
              "text-max-width": 78,
              width: 82,
              height: 82,
              "background-color": (node) => colorFor(node.data("score")),
              "border-width": 3,
              "border-color": "#ffffff"
            }
          },
          {
            selector: "edge",
            style: {
              width: (edge) => Math.max(2, Math.min(9, edge.data("traffic") / 15)),
              "line-color": "#7c8aa5",
              "target-arrow-color": "#7c8aa5",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              opacity: 0.78
            }
          }
        ]}
      />
    </div>
  );
}


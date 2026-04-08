import { elements } from "./dom.js";
import { RELATIONSHIP_ORDER, state } from "./state.js";
import { escapeHtml, svg, svgTitle } from "./utils.js";
import { updateZoomPill } from "./viewport.js";

export function hydrateGraph(graph) {
  state.graph = graph;
  state.selectedNodeId = null;
  state.view.scale = 1;
  state.view.x = 0;
  state.view.y = 0;
  updateZoomPill();

  syncFilterOptions(graph);
  syncWeightFilter(graph);

  elements.peopleMetric.textContent = String(graph.stats.people);
  elements.relationshipMetric.textContent = String(graph.stats.relationships);
  elements.conversationMetric.textContent = String(graph.stats.conversationsScanned);
  renderCurrentState();
}

export function renderCurrentState() {
  if (!state.graph) {
    return;
  }

  const visible = buildVisibleGraph(state.graph);
  if (state.selectedNodeId && !visible.nodes.some((node) => node.id === state.selectedNodeId)) {
    state.selectedNodeId = null;
  }

  elements.weightValue.textContent = `${state.filters.minWeight}+`;
  elements.visiblePeoplePill.textContent = `${Math.max(visible.nodes.length - 1, 0)} visible`;
  elements.visibleCountText.textContent = `${visible.nodes.length} nodes`;
  elements.selectionPill.textContent = selectedLabel(visible);

  renderGraph(visible);
  renderDetails(visible, state.selectedNodeId);
  renderVisiblePeople(visible);
}

export function focusNode(nodeId) {
  state.selectedNodeId = nodeId;
  renderCurrentState();
}

function syncFilterOptions(graph) {
  const labels = Array.from(
    new Set(graph.edges.map((edge) => edge.relationship?.label).filter(Boolean))
  );
  labels.sort((a, b) => RELATIONSHIP_ORDER.indexOf(a) - RELATIONSHIP_ORDER.indexOf(b));

  const currentValue = state.filters.relationship;
  elements.relationshipFilter.innerHTML = `<option value="all">All relationships</option>${labels
    .map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`)
    .join("")}`;
  elements.relationshipFilter.value = labels.includes(currentValue) ? currentValue : "all";
  state.filters.relationship = elements.relationshipFilter.value;
}

function syncWeightFilter(graph) {
  const maxWeight = Math.max(...graph.edges.map((edge) => edge.weight), 1);
  elements.weightFilter.max = String(maxWeight);
  if (state.filters.minWeight > maxWeight) {
    state.filters.minWeight = 0;
    elements.weightFilter.value = "0";
  }
}

function selectedLabel(visible) {
  if (!state.selectedNodeId || state.selectedNodeId === state.graph.me) {
    return "All connections";
  }

  const node = visible.nodes.find((entry) => entry.id === state.selectedNodeId);
  return node ? `Focus: ${node.label}` : "All connections";
}

function buildVisibleGraph(graph) {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const search = state.filters.search;
  const relationship = state.filters.relationship;
  const minWeight = state.filters.minWeight;

  const edges = graph.edges.filter((edge) => {
    if (edge.weight < minWeight) {
      return false;
    }

    if (relationship !== "all" && edge.relationship?.label !== relationship) {
      return false;
    }

    if (!search) {
      return true;
    }

    const otherId = edge.source === graph.me ? edge.target : edge.source;
    const node = nodeMap.get(otherId);
    const haystack = [
      node?.label || "",
      node?.handle || "",
      edge.relationship?.label || "",
      ...(edge.topTopics || []),
      ...(edge.channels || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });

  const connectedIds = new Set([graph.me]);
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const nodes = graph.nodes.filter((node) => connectedIds.has(node.id));
  return { nodes, edges };
}

function renderGraph(graph) {
  elements.graphCanvas.innerHTML = "";

  const width = 1200;
  const height = 760;
  const centerX = width / 2;
  const centerY = height / 2 + 8;
  const me = graph.nodes.find((node) => node.id === state.graph.me) || graph.nodes[0];
  const others = graph.nodes.filter((node) => node.id !== me.id);
  const neighbors = new Set();
  const selectedEdgeIds = new Set();

  if (state.selectedNodeId) {
    for (const edge of graph.edges) {
      if (edge.source === state.selectedNodeId || edge.target === state.selectedNodeId) {
        selectedEdgeIds.add(edge.id);
        neighbors.add(edge.source);
        neighbors.add(edge.target);
      }
    }
  }

  const maxScore = Math.max(...others.map((node) => node.score), 1);
  const placed = new Map();
  placed.set(me.id, { ...me, x: centerX, y: centerY, radius: 34 });

  const panLayer = svg("g", {
    transform: `translate(${state.view.x} ${state.view.y})`
  });
  const zoomLayer = svg("g", {
    transform: `scale(${state.view.scale})`
  });
  panLayer.append(zoomLayer);
  elements.graphCanvas.append(panLayer);

  const orbitGroup = svg("g");
  orbitGroup.append(
    orbitCircle(centerX, centerY, 160),
    orbitCircle(centerX, centerY, 250),
    orbitCircle(centerX, centerY, 340)
  );
  zoomLayer.append(orbitGroup);

  others.forEach((node, index) => {
    const strength = node.score / maxScore;
    const ring = 180 + (1 - strength) * 175 + (index % 3) * 18;
    const angle = index * 2.399963229728653;
    placed.set(node.id, {
      ...node,
      x: centerX + Math.cos(angle) * ring,
      y: centerY + Math.sin(angle) * ring * 0.72,
      radius: 16 + strength * 18
    });
  });

  const edgeLayer = svg("g");
  const labelLayer = svg("g");
  const nodeLayer = svg("g");
  zoomLayer.append(edgeLayer, labelLayer, nodeLayer);

  for (const edge of graph.edges) {
    const source = placed.get(edge.source);
    const target = placed.get(edge.target);
    if (!source || !target) {
      continue;
    }

    const active = state.selectedNodeId ? selectedEdgeIds.has(edge.id) : true;
    const faded = state.selectedNodeId ? !selectedEdgeIds.has(edge.id) : false;
    const curve = edge.source === me.id || edge.target === me.id ? 0.12 : 0.2;
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2 - Math.abs(source.x - target.x) * curve * 0.18;
    const pathData = `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;

    const path = svg("path", {
      d: pathData,
      fill: "none",
      stroke: active ? "rgba(191, 143, 255, 0.82)" : "rgba(152, 124, 190, 0.2)",
      "stroke-width": active ? 2 + edge.weight * 0.18 : 1.2 + edge.weight * 0.08,
      opacity: faded ? "0.16" : active ? "1" : "0.72",
      "stroke-linecap": "round"
    });
    path.append(svgTitle(`${source.label} to ${target.label}: strength ${edge.weight}`));
    edgeLayer.append(path);

    if (!faded) {
      const label = svg("text", {
        x: midX,
        y: midY - 6,
        class: "graph-edge-label",
        "text-anchor": "middle",
        opacity: edge.weight >= state.filters.minWeight + 2 ? "0.82" : "0.54"
      });
      label.textContent = edge.weight;
      labelLayer.append(label);
    }
  }

  for (const node of placed.values()) {
    const selected = node.id === state.selectedNodeId;
    const connected = neighbors.has(node.id);
    const faded = state.selectedNodeId ? !selected && !connected : false;
    const group = svg("g", {
      "data-node-id": node.id,
      tabindex: "0",
      role: "button"
    });
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      focusNode(node.id);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        focusNode(node.id);
      }
    });

    const halo = svg("circle", {
      cx: node.x,
      cy: node.y,
      r: node.radius + (selected ? 18 : node.id === me.id ? 12 : 10),
      fill: node.id === me.id ? "rgba(215, 181, 255, 0.2)" : "rgba(168, 121, 245, 0.16)",
      opacity: faded ? "0.04" : selected ? "0.58" : "0.22"
    });
    const body = svg("circle", {
      cx: node.x,
      cy: node.y,
      r: node.radius,
      fill: node.id === me.id ? "#d1a3ff" : selected ? "#ba79ff" : "#7a43d8",
      stroke: selected ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.18)",
      "stroke-width": selected ? 3 : 1.2,
      opacity: faded ? "0.18" : connected || selected || node.id === me.id ? "0.98" : "0.82"
    });
    const core = svg("circle", {
      cx: node.x,
      cy: node.y,
      r: Math.max(4, node.radius * 0.18),
      fill: node.id === me.id ? "#f8eaff" : "#efe4ff",
      opacity: faded ? "0.3" : "0.9"
    });
    const label = svg("text", {
      x: node.x,
      y: node.y + node.radius + 20,
      class: "graph-node-label",
      "text-anchor": "middle",
      opacity: faded ? "0.2" : "0.96"
    });
    label.textContent = node.label;

    group.append(halo, body, core, label);
    nodeLayer.append(group);
  }

  const background = svg("rect", {
    x: "0",
    y: "0",
    width: String(width),
    height: String(height),
    fill: "transparent"
  });
  zoomLayer.insertBefore(background, orbitGroup);
}

function orbitCircle(cx, cy, r) {
  return svg("circle", {
    cx: String(cx),
    cy: String(cy),
    r: String(r),
    fill: "none",
    stroke: "rgba(150, 177, 208, 0.08)",
    "stroke-width": "1"
  });
}

function renderDetails(graph, nodeId) {
  if (!graph.nodes.length) {
    elements.detailCard.innerHTML = `<p>No graph data is available for the current filters.</p>`;
    return;
  }

  const node =
    (nodeId && graph.nodes.find((entry) => entry.id === nodeId)) ||
    graph.nodes.find((entry) => entry.id === state.graph.me) ||
    graph.nodes[0];
  const neighbors = graph.edges
    .filter((edge) => edge.source === node.id || edge.target === node.id)
    .map((edge) => {
      const otherId = edge.source === node.id ? edge.target : edge.source;
      return graph.nodes.find((entry) => entry.id === otherId);
    })
    .filter(Boolean);

  if (node.id === state.graph.me) {
    const strongest = graph.edges.slice().sort((a, b) => b.weight - a.weight).slice(0, 3);
    elements.detailCard.innerHTML = `
      <div class="fade-in">
        <h3>${escapeHtml(node.label)}</h3>
        <p>This graph is centered on you. Use the filters to narrow the visible network or click a node to isolate one relationship.</p>
        <div class="detail-list">
          <div><strong>Visible relationships:</strong> ${graph.edges.length}</div>
          <div><strong>Focus behavior:</strong> clicking a node dims everything else and spotlights connected edges.</div>
          <div><strong>Strongest visible ties:</strong></div>
          <div>${strongest
            .map((edge) => {
              const otherId = edge.source === state.graph.me ? edge.target : edge.source;
              const other = graph.nodes.find((entry) => entry.id === otherId);
              return `<span class="topic-pill">${escapeHtml(other?.label || "Unknown")} - ${edge.weight}</span>`;
            })
            .join("")}</div>
        </div>
      </div>
    `;
    return;
  }

  const edge = graph.edges.find(
    (entry) =>
      (entry.source === state.graph.me && entry.target === node.id) ||
      (entry.target === state.graph.me && entry.source === node.id)
  );

  const relationship = edge?.relationship || {
    label: "Light connection",
    summary: "Not enough message history yet."
  };
  const topicMarkup = (edge?.topTopics || [])
    .slice(0, 5)
    .map((topic) => `<span class="topic-pill">${escapeHtml(topic)}</span>`)
    .join("");
  const channelMarkup = (edge?.channels || [])
    .map((channel) => `<span class="detail-pill">${escapeHtml(channel)}</span>`)
    .join("");
  const connectionMarkup = neighbors
    .map((entry) => `<span class="detail-pill">${escapeHtml(entry.label)}</span>`)
    .join("");
  const reasonMarkup = (edge?.reasons || [])
    .map((reason) => `<span class="detail-pill">${escapeHtml(reason)}</span>`)
    .join("");

  elements.detailCard.innerHTML = `
    <div class="fade-in">
      <h3>${escapeHtml(node.label)}</h3>
      <p>@${escapeHtml(node.handle || "unknown")}</p>
      <div class="detail-list">
        <div><strong>Relationship type:</strong> ${escapeHtml(relationship.label)}</div>
        <div>${escapeHtml(relationship.summary)}</div>
        <div><strong>Relationship strength:</strong> ${edge?.weight || 0}</div>
        <div><strong>Why this connection exists:</strong></div>
        <div>${reasonMarkup || "No signals were extracted."}</div>
        <div><strong>Top 5 things you talk about:</strong></div>
        <div>${topicMarkup || "Not enough message text to infer topics yet."}</div>
        <div><strong>Conversation spaces:</strong></div>
        <div>${channelMarkup || "No channels recorded."}</div>
        <div><strong>Visible connections from this node:</strong></div>
        <div>${connectionMarkup || "No visible linked nodes under the current filters."}</div>
      </div>
    </div>
  `;
}

function renderVisiblePeople(graph) {
  const people = graph.nodes.filter((node) => node.id !== state.graph.me);
  elements.visiblePeopleList.innerHTML = people
    .map(
      (node) => `
        <button class="person-chip ${node.id === state.selectedNodeId ? "is-selected" : ""}" data-node-chip="${escapeHtml(
          node.id
        )}">
          ${escapeHtml(node.label)}
        </button>
      `
    )
    .join("");

  for (const chip of elements.visiblePeopleList.querySelectorAll("[data-node-chip]")) {
    chip.addEventListener("click", () => focusNode(chip.dataset.nodeChip));
  }
}

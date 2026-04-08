import { fetchDemoGraph, fetchJson, loadAppConfig } from "./js/api.js";
import { hasBackend, resolveApiUrl } from "./js/config.js";
import { elements } from "./js/dom.js";
import { focusNode, hydrateGraph, renderCurrentState } from "./js/graph-view.js";
import { renderSetupSuccess, showSlackSetup } from "./js/setup-panel.js";
import { state } from "./js/state.js";
import { setStatus, setStatusBadge } from "./js/status.js";
import { normalizeError } from "./js/utils.js";
import {
  applyZoom,
  onCanvasClick,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  resetView,
  setRenderHandler,
  updateZoomPill
} from "./js/viewport.js";

setRenderHandler(renderCurrentState);

elements.connectButton.addEventListener("click", async () => {
  if (!hasBackend) {
    setStatus(
      "This deployment is running in static mode. Set runtime-config.js apiBase to your backend URL for Slack auth.",
      "setup"
    );
    return;
  }

  const config = await fetchJson("/api/config");
  if (!config.slackConfigured) {
    showSlackSetup(config);
    setStatus(config.slackConfigIssue || "Slack credentials are not configured yet.", "setup");
    return;
  }

  setStatus("Opening Slack authorization...", "live");
  window.location.href = resolveApiUrl("/auth/slack/start") || "/auth/slack/start";
});

elements.slackSetupForm.addEventListener("submit", async (event) => {
  if (!hasBackend) {
    event.preventDefault();
    setStatus("Static mode cannot save Slack credentials. Configure a backend apiBase first.", "warning");
    return;
  }

  event.preventDefault();
  elements.saveSlackConfigButton.disabled = true;
  setStatus("Saving Slack credentials...", "setup");

  try {
    const payload = await fetchJson("/api/slack-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: elements.clientIdInput.value,
        clientSecret: elements.clientSecretInput.value,
        redirectUri: elements.redirectUriInput.value
      })
    });

    if (!payload.ok) {
      throw new Error(payload.slackConfigIssue || "Slack setup failed.");
    }

    elements.slackSetupForm.hidden = true;
    setStatus("Slack credentials saved. Click Connect Slack again.", "ready");
    renderSetupSuccess();
  } catch (error) {
    setStatus(error.message, "warning");
  } finally {
    elements.saveSlackConfigButton.disabled = false;
  }
});

elements.demoButton.addEventListener("click", async () => {
  setStatus("Loading demo network...", "preview");
  const graph = await fetchDemoGraph();
  hydrateGraph(graph);
  setStatus("Demo graph loaded. Explore the graph with filters and focus mode.", "preview");
});

elements.refreshButton.addEventListener("click", async () => {
  if (!hasBackend) {
    setStatus("Refresh from Slack needs a backend API. Demo mode is still available.", "setup");
    return;
  }
  await loadSlackGraph();
});

elements.clearSelectionButton.addEventListener("click", () => {
  state.selectedNodeId = null;
  renderCurrentState();
});

elements.zoomInButton.addEventListener("click", () => applyZoom(1.14));
elements.zoomOutButton.addEventListener("click", () => applyZoom(0.88));
elements.resetViewButton.addEventListener("click", resetView);

elements.searchInput.addEventListener("input", () => {
  state.filters.search = elements.searchInput.value.trim().toLowerCase();
  renderCurrentState();
});

elements.relationshipFilter.addEventListener("change", () => {
  state.filters.relationship = elements.relationshipFilter.value;
  renderCurrentState();
});

elements.weightFilter.addEventListener("input", () => {
  state.filters.minWeight = Number(elements.weightFilter.value);
  renderCurrentState();
});

if (elements.showGraphButton && elements.showInsightsButton) {
  elements.showGraphButton.addEventListener("click", () => setMobilePanel("graph"));
  elements.showInsightsButton.addEventListener("click", () => setMobilePanel("insights"));
}

elements.graphCanvas.addEventListener("pointerdown", onPointerDown);
elements.graphCanvas.addEventListener("pointermove", onPointerMove);
elements.graphCanvas.addEventListener("pointerup", onPointerUp);
elements.graphCanvas.addEventListener("pointerleave", onPointerUp);
elements.graphCanvas.addEventListener("wheel", onWheel, { passive: false });
elements.graphCanvas.addEventListener("click", onCanvasClick);
elements.graphCanvas.addEventListener("dblclick", onDoubleClick);

init();

function setMobilePanel(panel) {
  if (!elements.pageShell || !elements.showGraphButton || !elements.showInsightsButton) {
    return;
  }
  state.mobilePanel = panel;
  elements.pageShell.dataset.mobilePanel = panel;
  elements.showGraphButton.classList.toggle("is-active", panel === "graph");
  elements.showInsightsButton.classList.toggle("is-active", panel === "insights");
}

async function init() {
  updateZoomPill();
  const pageUrl = new URL(window.location.href);
  const pageError = normalizeError(pageUrl.searchParams.get("error"));
  if (pageUrl.searchParams.has("error")) {
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }

  const config = await loadAppConfig();
  elements.refreshButton.disabled = !config.authenticated;
  elements.redirectUriInput.value =
    config.redirectUri || `${window.location.origin}/auth/slack/callback`;

  if (!hasBackend) {
    elements.slackSetupForm.hidden = true;
    elements.refreshButton.disabled = true;
    setStatusBadge("Demo mode", "preview");
    setStatus(
      "Running without a backend API. Demo graph is enabled. To connect Slack, set apiBase in runtime-config.js.",
      "preview"
    );
    await loadDemoGraph("Demo graph loaded. Add a backend apiBase when you want live Slack data.");
    return;
  }

  if (!config.slackConfigured) {
    showSlackSetup(config);
    const message =
      pageError ||
      config.slackConfigIssue ||
      "Slack is not configured yet. Use the demo graph or save credentials below.";
    setStatus(message, "setup");
    await loadDemoGraph("Preview mode is ready. Save Slack credentials when you want real data.");
    return;
  }

  elements.slackSetupForm.hidden = true;
  setStatusBadge("Slack ready", "ready");

  if (config.authenticated) {
    setStatus(
      `Connected as ${config.user?.name || "your Slack account"}. Pulling live graph data...`,
      "live"
    );
    await loadSlackGraph();
    return;
  }

  setStatus(pageError || "Slack is configured. Connect your account to generate your graph.", "ready");
  await loadDemoGraph("Preview graph loaded. Connect Slack when you are ready.");
}

async function loadDemoGraph(message) {
  const graph = await fetchDemoGraph();
  hydrateGraph(graph);
  setStatus(message, "preview");
}

async function loadSlackGraph() {
  setStatus("Scanning recent Slack conversations...", "live");
  elements.refreshButton.disabled = true;

  try {
    const graph = await fetchJson("/api/graph?limit=60");
    hydrateGraph(graph);
    setStatus(`Graph updated from Slack at ${new Date(graph.generatedAt).toLocaleTimeString()}.`, "live");
  } catch (error) {
    setStatus(error.message, "warning");
  } finally {
    elements.refreshButton.disabled = false;
  }
}

window.focusGraphNode = focusNode;

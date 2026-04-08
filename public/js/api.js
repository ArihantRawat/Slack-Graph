import { hasBackend, resolveApiUrl } from "./config.js";

export async function fetchJson(pathOrUrl, options) {
  const url =
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : resolveApiUrl(pathOrUrl);

  if (!url) {
    throw new Error("Backend API is not configured for this deployment.");
  }

  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

export async function fetchStaticJson(path) {
  const response = await fetch(path);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error("Unable to load static demo data.");
  }
  return payload;
}

export async function loadAppConfig() {
  if (!hasBackend) {
    return {
      slackConfigured: false,
      slackConfigIssue: "Backend API is not configured.",
      redirectUri: "",
      authenticated: false,
      user: null
    };
  }
  return fetchJson("/api/config");
}

export async function fetchDemoGraph() {
  if (hasBackend) {
    try {
      return await fetchJson("/api/demo-graph");
    } catch {}
  }
  return fetchStaticJson("./data/demo-graph.json");
}

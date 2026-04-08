import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePaths() {
  const __filename = fileURLToPath(import.meta.url);
  const srcServerDir = dirname(__filename);
  const rootDir = join(srcServerDir, "..", "..");
  return {
    rootDir,
    envFilePath: join(rootDir, ".env"),
    publicDir: join(rootDir, "public"),
    certDefaultPath: join(rootDir, "certs", "localhost.pfx")
  };
}

export function loadEnv(filePath) {
  try {
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) {
        continue;
      }
      const [key, ...rest] = line.split("=");
      if (!(key in process.env)) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    }
  } catch {}
}

export function resolveRuntimeConfig() {
  const port = Number(process.env.PORT || 3000);
  const appOrigin = process.env.APP_ORIGIN || `https://localhost:${port}`;
  return {
    port,
    appOrigin,
    baseUrl: appOrigin
  };
}

export function loadTlsOptions(certDefaultPath) {
  const pfxPath = process.env.TLS_PFX_PATH || certDefaultPath;
  const passphrase = process.env.TLS_PFX_PASSPHRASE || "slackgraph-local-dev";

  try {
    return {
      pfx: readFileSync(pfxPath),
      passphrase
    };
  } catch {
    return null;
  }
}

export function validateSlackConfig() {
  const clientId = (process.env.SLACK_CLIENT_ID || "").trim();
  const clientSecret = (process.env.SLACK_CLIENT_SECRET || "").trim();
  const redirectUri = (process.env.SLACK_REDIRECT_URI || "").trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return { ok: false, issue: "Missing Slack credentials in .env." };
  }

  if (
    clientId === "your_slack_client_id" ||
    clientSecret === "your_slack_client_secret"
  ) {
    return { ok: false, issue: "Placeholder Slack credentials detected in .env." };
  }

  if (!redirectUri.startsWith("https://")) {
    return { ok: false, issue: "Slack redirect URI must use https://localhost:3000/auth/slack/callback." };
  }

  return { ok: true, issue: null };
}

export function isSlackConfigured() {
  return validateSlackConfig().ok;
}

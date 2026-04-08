import { randomUUID } from "node:crypto";
import { SLACK_USER_SCOPES } from "./constants.js";
import { validateSlackConfig, isSlackConfigured } from "./config.js";
import { json, redirect, readJsonBody } from "./http-utils.js";
import { exchangeSlackCode, fetchSlackProfile, slackApi } from "./slack-client.js";
import { writeSlackConfig } from "./slack-config-store.js";
import { buildSlackGraph } from "./slack-graph.js";
import { demoGraph } from "./demo-graph.js";

export function createRequestHandler({
  baseUrl,
  appOrigin,
  port,
  rootDir,
  envFilePath,
  getSession,
  serveStatic
}) {
  return async function requestHandler(req, res) {
    try {
      const url = new URL(req.url || "/", baseUrl);
      const session = getSession(req, res);

      if (req.method === "GET" && url.pathname === "/api/config") {
        const validation = validateSlackConfig();
        return json(res, 200, {
          slackConfigured: validation.ok,
          slackConfigIssue: validation.issue,
          appOrigin,
          redirectUri: process.env.SLACK_REDIRECT_URI || "",
          authenticated: Boolean(session.slackToken),
          user: session.profile || null
        });
      }

      if (req.method === "POST" && url.pathname === "/api/slack-config") {
        const body = await readJsonBody(req);
        const clientId = String(body.clientId || "").trim();
        const clientSecret = String(body.clientSecret || "").trim();
        const redirectUri = String(body.redirectUri || "").trim() || `${appOrigin}/auth/slack/callback`;

        if (!clientId || !clientSecret) {
          return json(res, 400, {
            error: "Slack Client ID and Client Secret are required."
          });
        }

        await writeSlackConfig({
          clientId,
          clientSecret,
          redirectUri,
          appOrigin,
          port,
          rootDir,
          envFilePath
        });

        const validation = validateSlackConfig();
        return json(res, 200, {
          ok: validation.ok,
          slackConfigIssue: validation.issue,
          redirectUri
        });
      }

      if (req.method === "GET" && url.pathname === "/auth/slack/start") {
        if (!isSlackConfigured()) {
          redirect(
            res,
            "/?error=" +
              encodeURIComponent(
                "Slack is not configured yet. Add real SLACK_CLIENT_ID and SLACK_CLIENT_SECRET values in .env."
              )
          );
          return;
        }

        const state = randomUUID();
        session.oauthState = state;

        const authUrl = new URL("https://slack.com/oauth/v2/authorize");
        authUrl.searchParams.set("client_id", process.env.SLACK_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", process.env.SLACK_REDIRECT_URI);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("user_scope", SLACK_USER_SCOPES.join(","));
        redirect(res, authUrl.toString());
        return;
      }

      if (req.method === "GET" && url.pathname === "/auth/slack/callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          redirect(res, `/?error=${encodeURIComponent(error)}`);
          return;
        }

        if (!code || !state || state !== session.oauthState) {
          return json(res, 400, { error: "Invalid OAuth callback state." });
        }

        const tokenResult = await exchangeSlackCode({
          code,
          clientId: process.env.SLACK_CLIENT_ID,
          clientSecret: process.env.SLACK_CLIENT_SECRET,
          redirectUri: process.env.SLACK_REDIRECT_URI
        });
        if (!tokenResult.ok) {
          return json(res, 400, { error: tokenResult.error || "Slack auth failed." });
        }

        const userToken = tokenResult.authed_user?.access_token || tokenResult.access_token;
        if (!userToken) {
          return json(res, 400, { error: "Slack user token was not returned." });
        }

        session.slackToken = userToken;
        session.profile = await fetchSlackProfile(session.slackToken);
        session.oauthState = null;

        redirect(res, "/");
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/graph") {
        if (!session.slackToken) {
          return json(res, 401, { error: "Connect Slack first." });
        }

        const limit = Math.min(Number(url.searchParams.get("limit") || 75), 200);
        const graph = await buildSlackGraph({
          token: session.slackToken,
          historyLimit: limit,
          slackApi
        });
        return json(res, 200, graph);
      }

      if (req.method === "GET" && url.pathname === "/api/demo-graph") {
        return json(res, 200, demoGraph());
      }

      return serveStatic(url.pathname, res);
    } catch (error) {
      console.error(error);
      return json(res, 500, { error: "Internal server error." });
    }
  };
}

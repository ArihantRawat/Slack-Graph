import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { resolvePaths, loadEnv, resolveRuntimeConfig, loadTlsOptions } from "./src/server/config.js";
import { STATIC_TYPES } from "./src/server/constants.js";
import { createSessionStore } from "./src/server/session-store.js";
import { createStaticHandler } from "./src/server/static-handler.js";
import { createRequestHandler } from "./src/server/request-handler.js";

const paths = resolvePaths();
loadEnv(paths.envFilePath);

const runtime = resolveRuntimeConfig();
const tlsOptions = loadTlsOptions(paths.certDefaultPath);

const sessionStore = createSessionStore();
const serveStatic = createStaticHandler({
  publicDir: paths.publicDir,
  staticTypes: STATIC_TYPES
});

const requestHandler = createRequestHandler({
  baseUrl: runtime.baseUrl,
  appOrigin: runtime.appOrigin,
  port: runtime.port,
  rootDir: paths.rootDir,
  envFilePath: paths.envFilePath,
  getSession: sessionStore.getSession,
  serveStatic
});

const server = tlsOptions
  ? createHttpsServer(tlsOptions, requestHandler)
  : createHttpServer(requestHandler);

server.listen(runtime.port, () => {
  console.log(`Slack-Graph running at ${runtime.appOrigin}`);
});

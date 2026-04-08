import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function writeSlackConfig({
  clientId,
  clientSecret,
  redirectUri,
  appOrigin,
  port,
  rootDir,
  envFilePath
}) {
  process.env.SLACK_CLIENT_ID = clientId;
  process.env.SLACK_CLIENT_SECRET = clientSecret;
  process.env.SLACK_REDIRECT_URI = redirectUri;
  process.env.APP_ORIGIN = appOrigin;
  process.env.TLS_PFX_PATH = process.env.TLS_PFX_PATH || join(rootDir, "certs", "localhost.pfx");
  process.env.TLS_PFX_PASSPHRASE =
    process.env.TLS_PFX_PASSPHRASE || "slackgraph-local-dev";
  process.env.PORT = process.env.PORT || String(port);

  const content = [
    `SLACK_CLIENT_ID=${clientId}`,
    `SLACK_CLIENT_SECRET=${clientSecret}`,
    `SLACK_REDIRECT_URI=${redirectUri}`,
    `APP_ORIGIN=${process.env.APP_ORIGIN}`,
    `TLS_PFX_PATH=${process.env.TLS_PFX_PATH}`,
    `TLS_PFX_PASSPHRASE=${process.env.TLS_PFX_PASSPHRASE}`,
    `PORT=${process.env.PORT}`
  ].join("\n");

  await writeFile(envFilePath, `${content}\n`, "utf8");
}

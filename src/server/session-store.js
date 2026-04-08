import { randomUUID } from "node:crypto";

export function createSessionStore() {
  const sessions = new Map();

  function getSession(req, res) {
    const cookies = Object.fromEntries(
      (req.headers.cookie || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        })
    );

    let sessionId = cookies.sid;
    if (!sessionId || !sessions.has(sessionId)) {
      sessionId = randomUUID();
      sessions.set(sessionId, {});
      res.setHeader("Set-Cookie", `sid=${sessionId}; HttpOnly; Path=/; SameSite=Lax`);
    }

    return sessions.get(sessionId);
  }

  return { getSession };
}

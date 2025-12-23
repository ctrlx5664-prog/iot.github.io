import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createApp } from "../../server/app";

const appPromise = createApp();

export const handler: Handler = async (event, context) => {
  const app = await appPromise;
  const handler = serverless(app);

  // When using a Netlify redirect like:
  //   /api/* -> /.netlify/functions/api/:splat
  //   /ha-proxy-sw.js -> /.netlify/functions/api/ha-proxy-sw.js
  //   /auth/* -> /.netlify/functions/api/auth/:splat
  // the function receives paths like "/.netlify/functions/api/<splat>".
  // Our Express routes are mounted under "/api/*", "/ha-proxy-sw.js", or "/auth/*", so we rewrite to match.
  const prefix = "/.netlify/functions/api";
  if (event.path.startsWith(prefix)) {
    const rest = event.path.slice(prefix.length) || "/";
    const normalizedRest = rest.startsWith("/") ? rest : `/${rest}`;
    
    // Special case: /ha-proxy-sw.js should map to /ha-proxy-sw.js (not /api/ha-proxy-sw.js)
    if (normalizedRest === "/ha-proxy-sw.js") {
      event = { ...event, path: "/ha-proxy-sw.js" };
    } else if (normalizedRest.startsWith("/auth/")) {
      // Auth endpoints should map to /auth/* (not /api/auth/*)
      event = { ...event, path: normalizedRest };
    } else {
      // All other paths go under /api/*
      event = { ...event, path: `/api${normalizedRest}` };
    }
  }

  return await handler(event, context);
};



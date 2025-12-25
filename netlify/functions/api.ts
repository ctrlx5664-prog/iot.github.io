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
    } else if (normalizedRest === "/auth/authorize") {
      // Home Assistant auth endpoint - map to /auth/authorize (not /api/auth/authorize)
      event = { ...event, path: normalizedRest };
    } else {
      // All other paths (including /api/auth/* for app auth) go under /api/*
      // App auth routes are registered as /api/auth/* in server/routes.ts
      // Note: /auth/register etc. come from /api/auth/register redirect, so map to /api/auth/register
      event = { ...event, path: `/api${normalizedRest}` };
    }
  }

  return await handler(event, context);
};



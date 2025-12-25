import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createApp } from "../../server/app";

const appPromise = createApp();

export const handler: Handler = async (event, context) => {
  const app = await appPromise;
  const handler = serverless(app);

  // Home Assistant SPA sometimes navigates the iframe document to "/<dashboard>/<view>"
  // (e.g. "/dashboard-conex/aa") including auth_callback query params.
  // When those paths are rewritten to this function, Netlify can keep the ORIGINAL path
  // in event.path. Teach the function to route them to our dashboard proxy endpoint.
  const qs = event.queryStringParameters ?? {};
  if (qs.dashboard && qs.view && event.path && event.path.startsWith(`/${qs.dashboard}/`)) {
    event = { ...event, path: "/api/ha/dashboard" };
  }

  // Also handle direct SPA routes without explicit query (best-effort).
  // Example: /dashboard-conex/aa  -> /api/ha/dashboard?dashboard=dashboard-conex&view=aa
  const m = event.path?.match(/^\/([^/]+)\/([^/]+)$/);
  if (m && !qs.dashboard && !qs.view) {
    const [, dashboard, view] = m;
    event = {
      ...event,
      path: "/api/ha/dashboard",
      queryStringParameters: { ...(event.queryStringParameters ?? {}), dashboard, view },
    };
  }

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
      // Home Assistant auth endpoints must stay top-level (/auth/*), not /api/auth/*.
      // Otherwise our Express "/auth/*" proxy (and /auth/token short-circuit) won't run.
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



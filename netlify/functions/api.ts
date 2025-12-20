import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createApp } from "../../server/app";

const appPromise = createApp();

export const handler: Handler = async (event, context) => {
  const app = await appPromise;
  const handler = serverless(app);

  // When using a Netlify redirect like:
  //   /api/* -> /.netlify/functions/api/:splat
  // the function receives paths like "/.netlify/functions/api/<splat>".
  // Our Express routes are mounted under "/api/*", so we rewrite to match.
  const prefix = "/.netlify/functions/api";
  if (event.path.startsWith(prefix)) {
    const rest = event.path.slice(prefix.length) || "/";
    const normalizedRest = rest.startsWith("/") ? rest : `/${rest}`;
    event = { ...event, path: `/api${normalizedRest}` };
  }

  return await handler(event, context);
};



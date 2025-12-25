import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import {
  insertCompanySchema,
  insertLocationSchema,
  insertLightSchema,
  updateLightSchema,
  insertTvSchema,
  updateTvSchema,
  insertVideoSchema,
  type Light,
  type Tv,
} from "@shared/schema";
import { ZodError } from "zod";
import crypto from "crypto";
import { getDb } from "./db/client";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { log } from "./logger";

export type BroadcastDeviceUpdate = (
  type: "light_update" | "tv_update",
  deviceId: string,
  data: Light | Tv,
) => void;

const noopBroadcast: BroadcastDeviceUpdate = () => {};

export async function registerRoutes(
  app: Express,
  opts?: { broadcastDeviceUpdate?: BroadcastDeviceUpdate },
): Promise<void> {
  const broadcastDeviceUpdate = opts?.broadcastDeviceUpdate ?? noopBroadcast;

  // --- Auth helpers (JWT, simple credential check) ---
  const jwtSecret = process.env.JWT_SECRET ?? "please-change-me";

  function base64url(input: any) {
    return input
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  function signJwt(payload: Record<string, any>, expiresInSeconds = 60 * 60 * 24) {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + expiresInSeconds };
    const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
    const payloadB64 = base64url(Buffer.from(JSON.stringify(body)));
    const data = `${headerB64}.${payloadB64}`;
    const signature = base64url(
      crypto.createHmac("sha256", jwtSecret).update(data).digest(),
    );
    return `${data}.${signature}`;
  }

  function verifyJwt(token: string): Record<string, any> | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = base64url(
      crypto.createHmac("sha256", jwtSecret).update(data).digest(),
    );
    if (expectedSig !== signature) return null;
    try {
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function getBearerToken(req: any) {
    const authHeader = req.headers?.authorization ?? "";
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return null;
  }

  function hashPassword(password: string): string {
    return crypto.createHmac("sha256", jwtSecret).update(password).digest("hex");
  }

  function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
  }

  async function findUser(username: string) {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  }

  // --- Auth routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    const user = username ? await findUser(username) : null;
    if (!user || !verifyPassword(password ?? "", user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signJwt({ sub: username });
    res.json({ token, user: { username } });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }
    const existing = await findUser(username);
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }
    const passwordHash = hashPassword(password);
    const db = await getDb();
    await db.insert(users).values({ username, passwordHash });
    const token = signJwt({ sub: username });
    res.status(201).json({ token, user: { username } });
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.json({ user: { username: payload.sub } });
  });

  // --- Home Assistant Integration ---
  const haBaseUrl = process.env.HA_BASE_URL;
  const haToken = process.env.HA_TOKEN;

  // Helper function to handle HA static asset proxying
  async function handleHaStaticProxy(req: Request, res: Response) {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return res.status(200).end();
    }

    // Extract the path after /api/ha/static
    // When using app.get("/api/ha/static/*", ...), Express captures * as req.params[0]
    const path = (req.params as any)[0] || "";
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    console.log("[HA Static] Request received:", {
      method: req.method,
      path,
      originalUrl: req.originalUrl,
      url: req.url,
      hasBody: !!req.body,
    });
    
    if (!haBaseUrl || !haToken) {
      console.error("[HA Static] Configuration missing");
      return res.status(500).json({ error: "HA_BASE_URL or HA_TOKEN not configured" });
    }

    try {
      // Normalize path: handle community/local HACS paths and fix double /static/
      let normalizedPath = path.startsWith('/') ? path.substring(1) : path;
      
      // Fix double /static/ at the beginning: static/static/... -> static/...
      if (normalizedPath.startsWith('static/static/')) {
        normalizedPath = normalizedPath.substring(7); // Remove first 'static/'
        console.log("[HA Static] Fixed double /static/ path:", path, "->", normalizedPath);
      }
      
      // Map community resources to local paths (HACS custom cards)
      if (normalizedPath.startsWith('homeassistant/www/community/')) {
        // homeassistant/www/community/... -> local/community/...
        normalizedPath = 'local/community/' + normalizedPath.substring('homeassistant/www/community/'.length);
        console.log("[HA Static] Mapped community to local:", path, "->", normalizedPath);
      }
      
      // Keep local/ paths as-is (don't add prefix or change them)
      if (normalizedPath.startsWith('local/')) {
        console.log("[HA Static] Keeping local path as-is:", normalizedPath);
      } else if (!normalizedPath.startsWith('static/') && 
                 !normalizedPath.startsWith('frontend_latest/') &&
                 !normalizedPath.startsWith('homeassistant/') &&
                 !normalizedPath.startsWith('hacsfiles/') &&
                 !normalizedPath.startsWith('manifest.json')) {
        // For paths that don't start with known prefixes, add static/ prefix
        // This handles paths like fonts/roboto/...
        if (normalizedPath.startsWith('fonts/') || 
            normalizedPath.startsWith('icons/') ||
            normalizedPath.startsWith('images/')) {
          normalizedPath = 'static/' + normalizedPath;
          console.log("[HA Static] Added static/ prefix:", path, "->", normalizedPath);
        }
      }
      
      const targetUrl = `${haBaseUrl}/${normalizedPath}${queryString}`;
      console.log("[HA Static] Proxying to HA:", {
        method: req.method,
        path,
        normalizedPath,
        targetUrl,
        hasBody: !!req.body,
      });
      
      // Prepare fetch options
      // Forward important headers from the original request
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          Authorization: `Bearer ${haToken}`,
          "User-Agent": req.headers['user-agent'] || "Mozilla/5.0",
          Accept: req.headers.accept || "*/*",
          "Accept-Language": req.headers['accept-language'] || "en-US,en;q=0.9",
          "Accept-Encoding": req.headers['accept-encoding'] || "gzip, deflate, br",
          "Referer": req.headers.referer || haBaseUrl,
        },
      };

      // Forward request body for POST, PUT, PATCH, etc.
      if (req.body && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
        const contentType = req.headers['content-type'] || 'application/json';
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': contentType,
        };
        
        // If body is already a string/buffer, use it directly, otherwise stringify
        if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
          fetchOptions.body = req.body;
        } else {
          fetchOptions.body = JSON.stringify(req.body);
        }
      }

      const response = await fetch(targetUrl, fetchOptions);

      console.log("[HA Static] Response:", {
        method: req.method,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        path,
        normalizedPath,
      });

      if (!response.ok) {
        // Try to get error body for debugging
        let errorBody = '';
        try {
          const text = await response.text();
          errorBody = text.substring(0, 200); // First 200 chars
        } catch (e) {
          // Ignore
        }
        
        console.warn("[HA Static] Failed:", {
          method: req.method,
          status: response.status,
          statusText: response.statusText,
          targetUrl,
          path,
          normalizedPath,
          errorBody: errorBody || '(no body)',
        });
        
        // Forward error status and headers
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        return res.status(response.status).end();
      }

      // Forward content type and other headers
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      // Forward cache headers
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        res.setHeader("Cache-Control", cacheControl);
      }

      // Forward response body
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("[HA Static] Error:", {
        method: req.method,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to fetch from Home Assistant" });
    }
  }

  // Simplified route for Home Assistant static assets via /api/ha/static/*
  // Accepts any path and proxies directly to HA
  // Format: /api/ha/static/frontend_latest/core.js -> HA/frontend_latest/core.js
  // Handles all HTTP methods (GET, POST, etc.) to support endpoints like cdn-cgi/rum
  app.get("/api/ha/static/*", handleHaStaticProxy);
  app.post("/api/ha/static/*", handleHaStaticProxy);
  app.delete("/api/ha/static/*", handleHaStaticProxy);
  // Use app.use for other methods (PUT, PATCH, OPTIONS) that may not be in Express type
  (app as any).put("/api/ha/static/*", handleHaStaticProxy);
  (app as any).patch("/api/ha/static/*", handleHaStaticProxy);
  (app as any).options("/api/ha/static/*", handleHaStaticProxy);

  // Service Worker route for Home Assistant proxy
  app.get("/ha-proxy-sw.js", (_req, res) => {
    const swCode = `
      // Force immediate activation - CRITICAL for intercepting dynamic imports
      self.addEventListener('install', function(event) {
        console.log('[HA Proxy SW] Installing...');
        // Skip waiting to activate immediately
        self.skipWaiting();
      });
      
      // Listen for skipWaiting messages from clients
      self.addEventListener('message', function(event) {
        console.log('[HA Proxy SW] Received message:', event.data);
        if (event.data && event.data.type === 'SKIP_WAITING') {
          console.log('[HA Proxy SW] Received SKIP_WAITING message, calling skipWaiting()');
          self.skipWaiting();
        }
      });
      
      self.addEventListener('activate', function(event) {
        console.log('[HA Proxy SW] Activating and claiming all clients...');
        event.waitUntil(
          Promise.all([
            self.clients.claim(),
            // Clear all caches to ensure fresh resources
            caches.keys().then(function(cacheNames) {
              return Promise.all(
                cacheNames.map(function(cacheName) {
                  console.log('[HA Proxy SW] Deleting cache:', cacheName);
                  return caches.delete(cacheName);
                })
              );
            })
          ]).then(function() {
            console.log('[HA Proxy SW] Activated and claimed all clients');
            // Notify all clients that SW is active
            return self.clients.matchAll().then(function(clients) {
              clients.forEach(function(client) {
                client.postMessage({ type: 'SW_ACTIVATED' });
              });
            });
          })
        );
      });
      
      // CRITICAL: Intercept ALL fetch requests, including dynamic ES6 imports
      self.addEventListener('fetch', function(event) {
        const requestUrl = event.request.url;
        const url = new URL(requestUrl);
        const currentOrigin = self.location.origin;
        
        // Only intercept requests to current origin (Netlify)
        if (url.origin !== currentOrigin) {
          // Different origin - let it through normally
          return;
        }
        
        const path = url.pathname;
        const method = event.request.method;
        const destination = event.request.destination;
        
        // Skip if already proxied - let it through normally
        if (path.startsWith('/api/ha/static/')) {
          return;
        }
        
        // Skip auth endpoints - these are Home Assistant API endpoints, not static resources
        if (path.startsWith('/auth/')) {
          console.log('[HA Proxy SW] Skipping auth endpoint:', path);
          return; // Let it through normally
        }
        
        // Skip API calls (not resources) - but ONLY if they're NOT resources
        // Some API endpoints might serve resources, so we need to be careful
        if (path.startsWith('/api/') && !path.startsWith('/api/ha/static/')) {
          // Check if it's actually a resource being served through an API endpoint
          const isResourceFile = /\\.(js|mjs|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|json|xml|webp|avif|wasm)$/i.test(path);
          if (!isResourceFile && destination !== 'script' && destination !== 'style' && destination !== 'font' && destination !== 'image') {
            // It's a real API call, not a resource
            return;
          }
          // Otherwise, it might be a resource, continue to check below
        }
        
        // AGGRESSIVE: Intercept ALL resources that look like they should be proxied
        // This includes JS files from dynamic imports, CSS, fonts, images, etc.
        const isResourceFile = /\\.(js|mjs|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|json|xml|webp|avif|wasm)$/i.test(path);
        const isResourcePath = path.startsWith('/frontend_latest/') || 
                               path.startsWith('/static/') ||
                               path.startsWith('/homeassistant/') ||
                               path.startsWith('/hacsfiles/') ||
                               path.startsWith('/local/') ||
                               path === '/manifest.json' ||
                               path.startsWith('/service_worker.js');
        
        // Also check if destination indicates it's a script/style/font/image
        // CRITICAL: destination === 'script' means it's a JS file being loaded (including dynamic imports)
        const isResourceDestination = destination === 'script' || 
                                      destination === 'style' || 
                                      destination === 'font' || 
                                      destination === 'image' ||
                                      destination === 'manifest' ||
                                      destination === 'worker';
        
        // Intercept if it's a resource file, resource path, or resource destination
        // PRIORITY: If destination is 'script', ALWAYS intercept (this catches dynamic imports)
        if (destination === 'script' || isResourceFile || isResourcePath || isResourceDestination) {
          const proxyUrl = currentOrigin + '/api/ha/static' + path + (url.search || '');
          
          console.log('[HA Proxy SW] PROXYING resource:', {
            original: requestUrl,
            proxied: proxyUrl,
            method: method,
            destination: destination,
            path: path,
            isResourceFile: isResourceFile,
            isResourcePath: isResourcePath,
            isResourceDestination: isResourceDestination
          });
          
          // Intercept and proxy the request
          event.respondWith(
            fetch(proxyUrl, {
              method: method,
              headers: event.request.headers,
              body: event.request.body,
              mode: event.request.mode,
              credentials: event.request.credentials,
              cache: event.request.cache,
              redirect: event.request.redirect,
              referrer: event.request.referrer,
              referrerPolicy: event.request.referrerPolicy
            }).then(function(response) {
              if (!response.ok) {
                console.error('[HA Proxy SW] Proxied request failed:', {
                  url: proxyUrl,
                  status: response.status,
                  statusText: response.statusText
                });
              } else {
                console.log('[HA Proxy SW] Proxied response OK:', {
                  url: proxyUrl,
                  status: response.status,
                  contentType: response.headers.get('content-type')
                });
              }
              return response;
            }).catch(function(error) {
              console.error('[HA Proxy SW] Fetch error for proxied resource:', {
                url: proxyUrl,
                error: error.message,
                stack: error.stack
              });
              // Fallback to original request if proxy fails
              return fetch(event.request).catch(function(fallbackError) {
                console.error('[HA Proxy SW] Fallback fetch also failed:', fallbackError);
                // Return a basic error response
                return new Response('Resource not found', { 
                  status: 404, 
                  statusText: 'Not Found' 
                });
              });
            })
          );
          return;
        }
        
        // For all other requests to current origin, let them through normally
        // (don't call event.respondWith(), so browser handles it)
      });
    `;
    
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(swCode);
  });

  // Route for Home Assistant auth endpoints - redirect to HA
  // These endpoints are used by HA for OAuth/authentication flows
  app.get("/auth/authorize", async (req, res) => {
    if (!haBaseUrl) {
      return res.status(500).json({ error: "HA_BASE_URL not configured" });
    }
    
    // Redirect to Home Assistant auth endpoint with all query parameters
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const redirectUrl = `${haBaseUrl}/auth/authorize${queryString}`;
    
    log("[HA Auth] Redirecting to HA:", redirectUrl);
    res.redirect(302, redirectUrl);
  });

  // Home Assistant Dashboard proxy route
  app.get("/api/ha/dashboard", async (req, res) => {
    const dashboard = req.query.dashboard as string || "lovelace";
    const view = req.query.view as string || "default";
    
    log("[HA Dashboard] Request received: " + JSON.stringify({
      dashboard,
      view,
      query: req.query,
      userAgent: req.headers['user-agent'],
    }));

    if (!haBaseUrl || !haToken) {
      log("[HA Dashboard] Configuration missing");
      return res.status(500).json({ error: "HA_BASE_URL or HA_TOKEN not configured" });
    }

    try {
      // Build the dashboard URL
      const dashboardUrl = `${haBaseUrl}/${dashboard}/${view}`;
      
      log("[HA Dashboard] Attempting to load: " + JSON.stringify({
        dashboardUrl,
        dashboard,
        view,
      }));

      // Fetch the dashboard HTML from Home Assistant
      const response = await fetch(dashboardUrl, {
        headers: {
          "Authorization": `Bearer ${haToken}`,
          "User-Agent": req.headers['user-agent'] || "Mozilla/5.0",
        },
      });

      log("[HA Dashboard] Response from HA: " + JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        url: dashboardUrl,
      }));

      if (!response.ok) {
        log("[HA Dashboard] Failed to fetch dashboard");
        return res.status(response.status).json({ error: "Failed to fetch dashboard from Home Assistant" });
      }

      let html = await response.text();
      
      log("[HA Dashboard] Successfully loaded dashboard, HTML length: " + html.length);

      // Track replacements for logging
      let hrefReplacements = 0;
      let srcReplacements = 0;
      let urlReplacements = 0;
      const replacedUrls: string[] = [];
      
      // WebSocket URLs
      const wsBaseUrl = haBaseUrl.replace(/^https?:/, "wss:");
      
      // Modify the HTML to work in an iframe and inject authentication
      // Replace asset paths to go through our proxy to avoid CORS issues
      html = html
        // Replace relative asset paths to use our proxy
        // In Netlify, we need to route through /api/ha/static/* to go through serverless function
        // IMPORTANT: Process link tags FIRST (before generic href) to catch modulepreload
        .replace(/<link([^>]*?)href="\/([^"]+)"([^>]*?)>/gi, (match, before, path, after) => {
          // API paths stay relative
          if (path.startsWith('api/')) {
            return match;
          }
          // Check if it's a modulepreload or preload link, or a resource file
          const isModulePreload = /rel=["'](?:modulepreload|preload)["']/i.test(before + after);
          const isResourceFile = /\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|json|xml)$/i.test(path);
          // Proxy all modulepreload/preload links and resource files
          if (isModulePreload || isResourceFile) {
            const newUrl = `/api/ha/static/${path}`;
            hrefReplacements++;
            replacedUrls.push(`<link href="/${path}"> -> <link href="${newUrl}">`);
            return `<link${before}href="${newUrl}"${after}>`;
          }
          return match;
        })
        // Then replace other href attributes (not in link tags, already processed above)
        .replace(/href="\/([^"]+)"/g, (match, path) => {
          // Skip if this is inside a link tag (already processed)
          // API paths stay relative - will be handled by JavaScript with auth
          if (path.startsWith('api/')) {
            return match;
          }
          // All other resources go through proxy to avoid CORS
          const newUrl = `/api/ha/static/${path}`;
          hrefReplacements++;
          replacedUrls.push(`${match} -> href="${newUrl}"`);
          return `href="${newUrl}"`;
        })
        // Replace src attributes in script tags and other elements
        // CRITICAL: This must catch ALL script src attributes, including type="module"
        .replace(/<script([^>]*?)src="\/([^"]+)"([^>]*?)>/gi, (match, before, path, after) => {
          // API paths stay relative
          if (path.startsWith('api/')) {
            return match;
          }
          // All script resources go through proxy
          const newUrl = `/api/ha/static/${path}`;
          srcReplacements++;
          replacedUrls.push(`<script src="/${path}"> -> <script src="${newUrl}">`);
          return `<script${before}src="${newUrl}"${after}>`;
        })
        // Also catch src attributes in other tags (img, iframe, etc.)
        .replace(/src="\/([^"]+)"/g, (match, path) => {
          // Skip if already processed (in script tag above)
          // API paths stay relative
          if (path.startsWith('api/')) {
            return match;
          }
          // All other resources go through proxy
          const newUrl = `/api/ha/static/${path}`;
          srcReplacements++;
          replacedUrls.push(`${match} -> src="${newUrl}"`);
          return `src="${newUrl}"`;
        })
        .replace(/url\(['"]?\/([^'"]+)['"]?\)/g, (match, path) => {
          // API paths stay relative
          if (path.startsWith('api/')) {
            return match;
          }
          // CSS URLs go through proxy to avoid CORS
          const newUrl = `/api/ha/static/${path}`;
          urlReplacements++;
          replacedUrls.push(`${match} -> url('${newUrl}')`);
          return `url('${newUrl}')`;
        })
        // Replace WebSocket URLs to point to Home Assistant
        .replace(/ws:\/\/[^/]+/g, wsBaseUrl)
        .replace(/wss:\/\/[^/]+/g, wsBaseUrl)
        // Inject authentication and proxy configuration
        .replace(
          /<head>/i,
          `<head>
            <script>
              // BLOCKING SCRIPT - Must run before ANY other script
              // This intercepts resources BEFORE they are loaded
              // CRITICAL: Run immediately, before DOM is ready
              (function() {
                console.log('[HA Proxy] Injection script loaded and executing');
                
                // Register Service Worker to intercept ALL requests including dynamic imports
                // CRITICAL: This MUST run before ANY scripts are loaded
                // Service Worker is the ONLY way to intercept ES6 dynamic imports
                if ('serviceWorker' in navigator) {
                  const swUrl = '/ha-proxy-sw.js';
                  
                  // IMMEDIATE registration - don't wait for anything
                  (function registerSW() {
                    // Check if already controlling
                    if (navigator.serviceWorker.controller) {
                      console.log('[HA Proxy] Service Worker already controlling:', navigator.serviceWorker.controller.scriptURL);
                      return;
                    }
                    
                    // Try to register immediately
                    navigator.serviceWorker.register(swUrl, { 
                      scope: '/',
                      updateViaCache: 'none'
                    }).then(function(registration) {
                      console.log('[HA Proxy] Service Worker registered:', registration.scope);
                      
                      // Force activation
                      if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }
                      
                      // Check state
                      if (registration.installing) {
                        registration.installing.addEventListener('statechange', function() {
                          if (this.state === 'activated') {
                            console.log('[HA Proxy] SW activated and ready!');
                          }
                        });
                      }
                      
                      // Listen for controller
                      navigator.serviceWorker.addEventListener('controllerchange', function() {
                        console.log('[HA Proxy] SW now controlling page!');
                      });
                    }).catch(function(error) {
                      console.error('[HA Proxy] SW registration failed:', error);
                      // Retry after a short delay
                      setTimeout(registerSW, 1000);
                    });
                  })();
                  
                  // Also unregister old workers in background (non-blocking)
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                      if (registration.scope !== window.location.origin + '/') {
                        registration.unregister();
                      }
                    });
                  });
                } else {
                  console.warn('[HA Proxy] Service Workers not supported');
                }
                
                // Home Assistant authentication configuration
                window.hassTokens = { access_token: "${haToken}" };
                window.hassUrl = "${haBaseUrl}";
                console.log('[HA Proxy] Configuration set:', {
                  hasToken: !!window.hassTokens.access_token,
                  hassUrl: window.hassUrl
                });
              })();
            </script>
          `,
        );

      const totalReplacements = hrefReplacements + srcReplacements + urlReplacements;
      log("[HA Dashboard] HTML processing complete: " + JSON.stringify({
        htmlLength: html.length,
        hrefReplacements,
        srcReplacements,
        urlReplacements,
        totalReplacements,
        replacedUrls,
      }));

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      log("[HA Dashboard] Error:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  // Companies
  app.get("/api/companies", async (_req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(data);
      res.status(201).json(company);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid company data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const success = await storage.deleteCompany(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // Locations
  app.get("/api/locations", async (_req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/locations/:id", async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch location" });
    }
  });

  app.post("/api/locations", async (req, res) => {
    try {
      const data = insertLocationSchema.parse(req.body);
      
      // Check if company exists
      const company = await storage.getCompany(data.companyId);
      if (!company) {
        return res.status(400).json({ error: "Company not found" });
      }
      
      const location = await storage.createLocation(data);
      res.status(201).json(location);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid location data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create location" });
    }
  });

  app.delete("/api/locations/:id", async (req, res) => {
    try {
      const success = await storage.deleteLocation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete location" });
    }
  });

  // Lights
  app.get("/api/lights", async (_req, res) => {
    try {
      const lights = await storage.getAllLights();
      res.json(lights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lights" });
    }
  });

  app.get("/api/lights/:id", async (req, res) => {
    try {
      const light = await storage.getLight(req.params.id);
      if (!light) {
        return res.status(404).json({ error: "Light not found" });
      }
      res.json(light);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch light" });
    }
  });

  app.post("/api/lights", async (req, res) => {
    try {
      const data = insertLightSchema.parse(req.body);
      
      // Check if location exists
      const location = await storage.getLocation(data.locationId);
      if (!location) {
        return res.status(400).json({ error: "Location not found" });
      }
      
      const light = await storage.createLight(data);
      res.status(201).json(light);
      
      // Broadcast to WebSocket clients
      broadcastDeviceUpdate("light_update", light.id, light);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid light data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create light" });
    }
  });

  app.patch("/api/lights/:id", async (req, res) => {
    try {
      const updates = updateLightSchema.parse(req.body);
      const light = await storage.updateLight(req.params.id, updates);
      if (!light) {
        return res.status(404).json({ error: "Light not found" });
      }
      res.json(light);
      
      // Broadcast to WebSocket clients
      broadcastDeviceUpdate("light_update", light.id, light);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update light" });
    }
  });

  app.delete("/api/lights/:id", async (req, res) => {
    try {
      const success = await storage.deleteLight(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Light not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete light" });
    }
  });

  // TVs
  app.get("/api/tvs", async (_req, res) => {
    try {
      const tvs = await storage.getAllTvs();
      res.json(tvs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch TVs" });
    }
  });

  app.get("/api/tvs/:id", async (req, res) => {
    try {
      const tv = await storage.getTv(req.params.id);
      if (!tv) {
        return res.status(404).json({ error: "TV not found" });
      }
      res.json(tv);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch TV" });
    }
  });

  app.post("/api/tvs", async (req, res) => {
    try {
      const data = insertTvSchema.parse(req.body);
      
      // Check if location exists
      const location = await storage.getLocation(data.locationId);
      if (!location) {
        return res.status(400).json({ error: "Location not found" });
      }
      
      // Check if video exists (if provided)
      if (data.currentVideoId) {
        const video = await storage.getVideo(data.currentVideoId);
        if (!video) {
          return res.status(400).json({ error: "Video not found" });
        }
      }
      
      const tv = await storage.createTv(data);
      res.status(201).json(tv);
      
      // Broadcast to WebSocket clients
      broadcastDeviceUpdate("tv_update", tv.id, tv);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid TV data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create TV" });
    }
  });

  app.patch("/api/tvs/:id", async (req, res) => {
    try {
      const updates = updateTvSchema.parse(req.body);
      
      // Check if video exists (if updating currentVideoId)
      if (updates.currentVideoId !== undefined && updates.currentVideoId !== null) {
        const video = await storage.getVideo(updates.currentVideoId);
        if (!video) {
          return res.status(400).json({ error: "Video not found" });
        }
      }
      
      const tv = await storage.updateTv(req.params.id, updates);
      if (!tv) {
        return res.status(404).json({ error: "TV not found" });
      }
      res.json(tv);
      
      // Broadcast to WebSocket clients
      broadcastDeviceUpdate("tv_update", tv.id, tv);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update TV" });
    }
  });

  app.delete("/api/tvs/:id", async (req, res) => {
    try {
      const success = await storage.deleteTv(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "TV not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete TV" });
    }
  });

  // Videos
  app.get("/api/videos", async (_req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const data = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(data);
      res.status(201).json(video);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid video data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create video" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const success = await storage.deleteVideo(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete video" });
    }
  });
}


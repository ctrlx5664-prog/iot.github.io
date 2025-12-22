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
  insertOrganizationSchema,
  createInviteSchema,
  type Light,
  type Tv,
} from "@shared/schema";
import { ZodError } from "zod";
import crypto, { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "./db/client";
import { users, organizations, userOrganizations, organizationInvites } from "./db/schema";
import { eq, and } from "drizzle-orm";

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
  const defaultAuthUsername = process.env.AUTH_USERNAME ?? "admin";
  const defaultAuthPassword = process.env.AUTH_PASSWORD ?? "changeme";

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
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return null;
    return token;
  }

  // --- User storage helpers (DB-backed auth) ---
  function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${derived}`;
  }

  function verifyPassword(password: string, stored: string) {
    const [salt, hashed] = stored.split(":");
    if (!salt || !hashed) return false;
    const derived = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hashed, "hex"), Buffer.from(derived, "hex"));
  }

  async function findUser(username: string) {
    const db = await getDb();
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async function ensureDefaultUser() {
    const db = await getDb();
    const existing = await db.select().from(users).where(eq(users.username, defaultAuthUsername)).limit(1);
    if (existing.length > 0) return;
    const passwordHash = hashPassword(defaultAuthPassword);
    await db.insert(users).values({ username: defaultAuthUsername, passwordHash });
  }

  await ensureDefaultUser();

  // --- Home Assistant proxy helpers ---
  const haBaseUrl = (process.env.HA_BASE_URL ?? "").replace(/\/+$/, "");
  const haToken = process.env.HA_TOKEN ?? "";

  async function haRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: any }> {
    // Log configuration
    console.log("[HA Proxy] Config check:", {
      haBaseUrl: haBaseUrl || "(not set)",
      haTokenSet: haToken ? `${haToken.substring(0, 10)}...` : "(not set)",
      haTokenLength: haToken?.length || 0,
    });

    if (!haBaseUrl || !haToken) {
      console.error("[HA Proxy] ERROR: Missing configuration", {
        haBaseUrl: !!haBaseUrl,
        haToken: !!haToken,
      });
      return { status: 500, json: { error: "HA_BASE_URL or HA_TOKEN not configured" } };
    }

    const url = `${haBaseUrl}${path}`;
    console.log("[HA Proxy] Request:", {
      method,
      url,
      hasBody: !!body,
    });

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${haToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();
      let json: any = text;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { message: text };
      }

      console.log("[HA Proxy] Response:", {
        status: res.status,
        ok: res.ok,
        responseLength: text.length,
        jsonPreview: typeof json === "object" ? JSON.stringify(json).substring(0, 200) : json,
      });

      return { status: res.status, json };
    } catch (err: any) {
      console.error("[HA Proxy] Fetch error:", {
        message: err?.message,
        cause: err?.cause,
      });
      return { status: 500, json: { error: `HA request failed: ${err?.message}` } };
    }
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

  // Protect all other /api routes
  app.use("/api", (req: any, res: any, next: any) => {
    // Allow auth routes without authentication
    if (req.path.startsWith("/auth")) {
      return next();
    }
    // Allow Home Assistant routes without user authentication
    // (they use HA token configured on server)
    if (req.path.startsWith("/ha") || req.path.startsWith("/states") || req.path.startsWith("/services") || req.path.startsWith("/websocket")) {
      return next();
    }
    // Allow HA static asset routes
    if (req.path.startsWith("/ha/static/")) {
      return next();
    }
    const token = getBearerToken(req);
    const payload = token ? verifyJwt(token) : null;
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as any).user = payload;
    next();
  });

  // --- Organization routes ---
  
  // Get user's organizations
  app.get("/api/organizations", async (req: any, res) => {
    try {
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const memberships = await db.select().from(userOrganizations).where(eq(userOrganizations.userId, user.id));
      const orgIds = memberships.map((m: any) => m.organizationId);
      
      if (orgIds.length === 0) return res.json([]);
      
      const orgs = await Promise.all(
        orgIds.map(async (orgId: string) => {
          const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
          const membership = memberships.find((m: any) => m.organizationId === orgId);
          return org ? { ...org, role: membership?.role } : null;
        })
      );
      
      res.json(orgs.filter(Boolean));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  // Create organization
  app.post("/api/organizations", async (req: any, res) => {
    try {
      const data = insertOrganizationSchema.parse(req.body);
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const [org] = await db.insert(organizations).values({
        name: data.name,
        description: data.description,
      }).returning();
      
      // Add creator as owner
      await db.insert(userOrganizations).values({
        userId: user.id,
        organizationId: org.id,
        role: "owner",
      });
      
      res.status(201).json({ ...org, role: "owner" });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid organization data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  // Get single organization
  app.get("/api/organizations/:id", async (req: any, res) => {
    try {
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const [membership] = await db.select().from(userOrganizations)
        .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, req.params.id)));
      
      if (!membership) return res.status(403).json({ error: "Not a member of this organization" });
      
      const [org] = await db.select().from(organizations).where(eq(organizations.id, req.params.id));
      if (!org) return res.status(404).json({ error: "Organization not found" });
      
      res.json({ ...org, role: membership.role });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Get organization members
  app.get("/api/organizations/:id/members", async (req: any, res) => {
    try {
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const [membership] = await db.select().from(userOrganizations)
        .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, req.params.id)));
      
      if (!membership) return res.status(403).json({ error: "Not a member of this organization" });
      
      const members = await db.select().from(userOrganizations).where(eq(userOrganizations.organizationId, req.params.id));
      
      const memberDetails = await Promise.all(
        members.map(async (m: any) => {
          const [u] = await db.select().from(users).where(eq(users.id, m.userId));
          return { id: m.id, userId: m.userId, username: u?.username, role: m.role, invitedAt: m.invitedAt };
        })
      );
      
      res.json(memberDetails);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // Create invite
  app.post("/api/organizations/:id/invites", async (req: any, res) => {
    try {
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const [membership] = await db.select().from(userOrganizations)
        .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, req.params.id)));
      
      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        return res.status(403).json({ error: "Only owners and admins can create invites" });
      }
      
      const { role = "member", invitedEmail } = req.body || {};
      const inviteCode = randomBytes(16).toString("hex");
      
      const [invite] = await db.insert(organizationInvites).values({
        organizationId: req.params.id,
        invitedByUserId: user.id,
        invitedEmail: invitedEmail || null,
        inviteCode,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }).returning();
      
      res.status(201).json(invite);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  // Get organization invites
  app.get("/api/organizations/:id/invites", async (req: any, res) => {
    try {
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const [membership] = await db.select().from(userOrganizations)
        .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, req.params.id)));
      
      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        return res.status(403).json({ error: "Only owners and admins can view invites" });
      }
      
      const invites = await db.select().from(organizationInvites)
        .where(eq(organizationInvites.organizationId, req.params.id));
      
      res.json(invites);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  // Accept invite (join organization)
  app.post("/api/invites/:code/accept", async (req: any, res) => {
    try {
      const db = await getDb();
      const user = await findUser(req.user?.sub);
      if (!user) return res.status(401).json({ error: "User not found" });
      
      const [invite] = await db.select().from(organizationInvites)
        .where(eq(organizationInvites.inviteCode, req.params.code));
      
      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.usedAt) return res.status(400).json({ error: "Invite already used" });
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invite expired" });
      }
      
      // Check if already a member
      const [existing] = await db.select().from(userOrganizations)
        .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, invite.organizationId)));
      
      if (existing) return res.status(400).json({ error: "Already a member" });
      
      // Add user to organization
      await db.insert(userOrganizations).values({
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      });
      
      // Mark invite as used
      await db.update(organizationInvites)
        .set({ usedAt: new Date() })
        .where(eq(organizationInvites.id, invite.id));
      
      const [org] = await db.select().from(organizations).where(eq(organizations.id, invite.organizationId));
      
      res.json({ message: "Joined organization", organization: org });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  // --- Home Assistant proxy routes ---
  // Routes under /api/ha/ for explicit proxy calls
  app.get("/api/ha/states", async (_req, res) => {
    console.log("[HA Route] GET /api/ha/states called");
    const result = await haRequest("GET", "/api/states");
    console.log("[HA Route] GET /api/ha/states result:", result.status);
    return res.status(result.status).json(result.json);
  });

  app.get("/api/ha/states/:entityId", async (req, res) => {
    const { entityId } = req.params;
    console.log("[HA Route] GET /api/ha/states/:entityId called", { entityId });
    const result = await haRequest("GET", `/api/states/${encodeURIComponent(entityId)}`);
    console.log("[HA Route] GET /api/ha/states/:entityId result:", result.status);
    return res.status(result.status).json(result.json);
  });

  app.post("/api/ha/services/:domain/:service", async (req, res) => {
    const { domain, service } = req.params;
    console.log("[HA Route] POST /api/ha/services called", { domain, service, body: req.body });
    const result = await haRequest(
      "POST",
      `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
      req.body ?? {},
    );
    console.log("[HA Route] POST /api/ha/services result:", result.status);
    return res.status(result.status).json(result.json);
  });

  // Routes matching Home Assistant API structure for iframe dashboard
  // These allow the embedded HA frontend to make API calls through our proxy
  app.get("/api/states", async (_req, res) => {
    const result = await haRequest("GET", "/api/states");
    return res.status(result.status).json(result.json);
  });

  app.get("/api/states/:entityId", async (req, res) => {
    const { entityId } = req.params;
    const result = await haRequest("GET", `/api/states/${encodeURIComponent(entityId)}`);
    return res.status(result.status).json(result.json);
  });

  app.post("/api/services/:domain/:service", async (req, res) => {
    const { domain, service } = req.params;
    const result = await haRequest(
      "POST",
      `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
      req.body ?? {},
    );
    return res.status(result.status).json(result.json);
  });

  // WebSocket proxy for Home Assistant (if needed)
  // Note: WebSocket proxying is complex and may require a separate WebSocket server
  app.get("/api/websocket", async (_req, res) => {
    // WebSocket upgrade requests should be handled differently
    // For now, return an error suggesting direct connection
    res.status(426).json({ 
      error: "WebSocket connections should be made directly to Home Assistant",
      message: "The dashboard iframe will handle WebSocket connections with injected authentication"
    });
  });

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
      // Ensure path doesn't have leading slash to avoid double slashes
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      const targetUrl = `${haBaseUrl}/${cleanPath}${queryString}`;
      console.log("[HA Static] Proxying to HA:", {
        method: req.method,
        path,
        cleanPath,
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
        cleanPath,
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
          cleanPath,
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
      
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        res.setHeader("Cache-Control", cacheControl);
      }
      
      // Forward CORS headers to allow iframe access
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      // Stream the response
      const buffer = await response.arrayBuffer();
      console.log("[HA Static] Successfully proxied:", {
        method: req.method,
        path,
        size: buffer.byteLength,
        contentType,
      });
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("[HA Static] Error:", {
        method: req.method,
        path,
        error: err?.message,
      });
      res.status(500).end();
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

  // Proxy route for Home Assistant static assets (JS, CSS, fonts, etc.)
  // This prevents CORS errors by proxying all resources through our server
  app.get("/api/ha/proxy/*", async (req, res) => {
    const path = req.params[0] || "";
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    console.log("[HA Proxy] Request received:", {
      path,
      queryString,
      fullUrl: req.url,
      userAgent: req.headers['user-agent'],
    });
    
    if (!haBaseUrl || !haToken) {
      console.error("[HA Proxy] Configuration missing:", {
        hasBaseUrl: !!haBaseUrl,
        hasToken: !!haToken,
      });
      return res.status(500).json({ error: "HA_BASE_URL or HA_TOKEN not configured" });
    }

    try {
      const targetUrl = `${haBaseUrl}/${path}${queryString}`;
      console.log("[HA Proxy] Fetching from HA:", targetUrl);
      
      const response = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          "User-Agent": "Mozilla/5.0",
        },
      });

      console.log("[HA Proxy] Response status:", {
        path,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
      });

      if (!response.ok) {
        console.warn("[HA Proxy] Failed to fetch resource:", {
          path,
          status: response.status,
          statusText: response.statusText,
          targetUrl,
        });
        return res.status(response.status).end();
      }

      // Forward content type and other headers
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      // Forward cache headers if present
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        res.setHeader("Cache-Control", cacheControl);
      }

      // Stream the response
      const buffer = await response.arrayBuffer();
      console.log("[HA Proxy] Successfully proxied resource:", {
        path,
        size: buffer.byteLength,
        contentType,
      });
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("[HA Proxy] Error proxying resource:", {
        path,
        targetUrl: `${haBaseUrl}/${path}${queryString}`,
        error: err?.message,
        stack: err?.stack,
      });
      res.status(500).end();
    }
  });

  // Helper function to process and serve proxied dashboard HTML
  function serveProxiedDashboard(html: string, res: any) {
    // Get the protocol (http/https) and convert to ws/wss for WebSocket
    const wsProtocol = haBaseUrl.startsWith("https") ? "wss" : "ws";
    const wsBaseUrl = haBaseUrl.replace(/^https?:/, wsProtocol);
    
    let hrefReplacements = 0;
    let srcReplacements = 0;
    let urlReplacements = 0;
    const replacedUrls: string[] = [];
    
    // Modify the HTML to work in an iframe and inject authentication
    // Replace asset paths to go through our proxy to avoid CORS issues
    html = html
      // Replace relative asset paths to use our proxy
      // In Netlify, we need to route through /api/ha/static/* to go through serverless function
      // Replace relative URLs - use proxy to avoid CORS issues
      // Resources go through proxy, but API calls are handled separately
      .replace(/href="\/([^"]+)"/g, (match, path) => {
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
      .replace(/src="\/([^"]+)"/g, (match, path) => {
        // API paths stay relative - will be handled by JavaScript with auth
        if (path.startsWith('api/')) {
          return match;
        }
        // All other resources go through proxy to avoid CORS
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
      // Inject authentication token and configuration
      // IMPORTANT: This script must run IMMEDIATELY, before any other scripts
      .replace(
        /<head>/i,
        `<head>
          <script>
            // CRITICAL: Run immediately, before DOM is ready
            (function() {
              console.log('[HA Proxy] Injection script loaded and executing');
              // Home Assistant authentication configuration
              window.hassTokens = { access_token: "${haToken}" };
              window.hassUrl = "${haBaseUrl}";
              console.log('[HA Proxy] Configuration set:', {
                hasToken: !!window.hassTokens.access_token,
                hassUrl: window.hassUrl
              });
            
            // Helper function to rewrite URLs - use proxy for static assets, keep API calls relative
            function rewriteUrl(url) {
              const originalUrl = url;
              if (!url) return url;
              if (typeof url !== 'string') url = url.toString();
              
              // Skip data URLs and blob URLs
              if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) {
                return url;
              }
              
              // Already proxied URLs - keep them
              if (url.startsWith('/api/ha/static/')) {
                console.log('[HA Proxy] URL already proxied:', url);
                return url;
              }
              
              // API calls - keep relative, will be handled by fetch override
              if (url.startsWith('/api/') && !url.startsWith('/api/ha/')) {
                console.log('[HA Proxy] API call, keeping relative:', url);
                return url;
              }
              
              // Absolute URLs pointing to HA - convert to proxy
              const haBaseUrlValue = "${haBaseUrl}";
              if (haBaseUrlValue && url.startsWith(haBaseUrlValue)) {
                const path = url.substring(haBaseUrlValue.length);
                const rewritten = '/api/ha/static' + (path.startsWith('/') ? path : '/' + path);
                console.log('[HA Proxy] Rewriting HA absolute URL:', url, '->', rewritten);
                return rewritten;
              }
              
              // Absolute URLs pointing to current origin (Netlify) - convert to proxy
              // This catches resources that are being loaded directly from Netlify
              const currentOrigin = window.location.origin;
              if (url.startsWith(currentOrigin)) {
                const path = url.substring(currentOrigin.length);
                // If it's not already proxied and not an API call, proxy it
                if (!path.startsWith('/api/ha/') && !path.startsWith('/api/')) {
                  const rewritten = '/api/ha/static' + path;
                  console.log('[HA Proxy] Rewriting current origin URL:', url, '->', rewritten);
                  return rewritten;
                }
                console.log('[HA Proxy] Current origin URL already proxied or API:', url);
                return path; // Already proxied or API call
              }
              
              // Relative URLs - use proxy (except API calls)
              if (url.startsWith('/')) {
                // Check if it's a static asset path (not API)
                if (!url.startsWith('/api/')) {
                  const rewritten = '/api/ha/static' + url;
                  console.log('[HA Proxy] Rewriting relative URL:', url, '->', rewritten);
                  return rewritten;
                }
                console.log('[HA Proxy] Relative API call, keeping as-is:', url);
                return url; // API calls stay as-is
              }
              
              // Relative URLs without leading slash - use proxy
              // This catches cases like "frontend_latest/core.js" (no leading slash)
              if (url.includes('.') && !url.startsWith('http') && !url.startsWith('//')) {
                // If it looks like a file path (has extension), proxy it
                const hasExtension = /\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|json|xml)$/i.test(url);
                if (hasExtension) {
                  const rewritten = '/api/ha/static/' + url;
                  console.log('[HA Proxy] Rewriting relative file URL:', url, '->', rewritten);
                  return rewritten;
                }
              }
              
              // Log unhandled URLs for debugging
              if (url && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('#')) {
                console.warn('[HA Proxy] Unhandled URL (not rewritten):', url, 'original:', originalUrl);
              }
              
              return url;
            }
            
            // Override fetch to handle API calls through proxy and add auth token
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
              const urlStr = typeof url === 'string' ? url : url.toString();
              console.log('[HA Proxy] Fetch called with URL:', urlStr, 'method:', options?.method || 'GET');
              const rewrittenUrl = rewriteUrl(urlStr);
              
              // Log URL rewrites for debugging
              if (urlStr !== rewrittenUrl) {
                console.log('[HA Proxy] Fetch URL rewritten:', urlStr, '->', rewrittenUrl);
              } else {
                console.log('[HA Proxy] Fetch URL unchanged:', urlStr);
              }
              
              // If it's an API call (relative /api/ but not /api/ha/static/), proxy it through our server
              if (urlStr.startsWith('/api/') && !urlStr.startsWith('/api/ha/static/')) {
                // Convert to absolute URL through our proxy
                const proxyUrl = window.location.origin + rewrittenUrl;
                options = options || {};
                options.headers = options.headers || {};
                options.headers['Authorization'] = 'Bearer ${haToken}';
                return originalFetch(proxyUrl, options).catch(function(error) {
                  console.error('[HA Proxy] Fetch error for:', proxyUrl, error);
                  throw error;
                });
              }
              
              // For proxied static assets, convert to absolute URL
              if (rewrittenUrl.startsWith('/api/ha/static/')) {
                const proxyUrl = window.location.origin + rewrittenUrl;
                return originalFetch(proxyUrl, options).catch(function(error) {
                  console.error('[HA Proxy] Fetch error for:', proxyUrl, error);
                  throw error;
                });
              }
              
              // If URL points to HA and is an API call, add auth header
              const haBaseUrlValue = "${haBaseUrl}";
              if (haBaseUrlValue && rewrittenUrl.startsWith(haBaseUrlValue) && rewrittenUrl.includes('/api/')) {
                options = options || {};
                options.headers = options.headers || {};
                options.headers['Authorization'] = 'Bearer ${haToken}';
              }
              
              return originalFetch(rewrittenUrl, options).catch(function(error) {
                console.error('[HA Proxy] Fetch error for:', rewrittenUrl, error);
                throw error;
              });
            };
            
            // Override XMLHttpRequest to handle API calls through proxy and add auth token
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
              // Store original URL for later use
              this._haOriginalUrl = url;
              console.log('[HA Proxy] XHR.open called:', method, url);
              
              // Rewrite URL using our helper function
              let rewrittenUrl = rewriteUrl(url);
              
              // If it's a proxied static asset, convert to absolute URL
              if (rewrittenUrl.startsWith('/api/ha/static/')) {
                rewrittenUrl = window.location.origin + rewrittenUrl;
                console.log('[HA Proxy] XHR proxied static asset, absolute URL:', rewrittenUrl);
              } else if (rewrittenUrl.startsWith('/api/') && !rewrittenUrl.startsWith('/api/ha/static/')) {
                // API calls - convert to absolute URL through our proxy
                rewrittenUrl = window.location.origin + rewrittenUrl;
                console.log('[HA Proxy] XHR API call, absolute URL:', rewrittenUrl);
              }
              
              // Log URL rewrites for debugging
              if (this._haOriginalUrl !== rewrittenUrl) {
                console.log('[HA Proxy] XHR URL rewritten:', this._haOriginalUrl, '->', rewrittenUrl);
              } else {
                console.log('[HA Proxy] XHR URL unchanged:', url);
              }
              
              return originalXHROpen.call(this, method, rewrittenUrl, ...rest);
            };
            
            // Override send to add auth header for API calls
            XMLHttpRequest.prototype.send = function(data) {
              // If it's an API call, add auth header
              if (this._haOriginalUrl && this._haOriginalUrl.startsWith('/api/') && !this._haOriginalUrl.startsWith('/api/ha/static/')) {
                this.setRequestHeader('Authorization', 'Bearer ${haToken}');
              }
              return originalXHRSend.call(this, data);
            };
            
            // Override URL constructor to intercept absolute URLs
            const originalURL = window.URL;
            window.URL = function(url, base) {
              if (typeof url === 'string') {
                url = rewriteUrl(url);
              }
              if (typeof base === 'string') {
                base = rewriteUrl(base);
              }
              return new originalURL(url, base);
            };
            // Copy static methods
            window.URL.createObjectURL = originalURL.createObjectURL;
            window.URL.revokeObjectURL = originalURL.revokeObjectURL;

            // Override createElement to intercept script/link tags
            const originalCreateElement = document.createElement;
            document.createElement = function(tagName, options) {
              const element = originalCreateElement.call(this, tagName, options);
              
              if (tagName === 'script' || tagName === 'link') {
                console.log('[HA Proxy] createElement called for:', tagName);
                // Intercept setAttribute
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                  if ((name === 'src' || name === 'href') && typeof value === 'string') {
                    const originalValue = value;
                    value = rewriteUrl(value);
                    if (originalValue !== value) {
                      console.log('[HA Proxy] setAttribute rewritten:', name, originalValue, '->', value);
                    } else {
                      console.log('[HA Proxy] setAttribute unchanged:', name, value);
                    }
                  }
                  return originalSetAttribute.call(this, name, value);
                };
                
                // Intercept direct property assignment
                if (tagName === 'script') {
                  let srcValue = '';
                  Object.defineProperty(element, 'src', {
                    set: function(value) {
                      if (typeof value === 'string') {
                        const originalValue = value;
                        srcValue = rewriteUrl(value);
                        if (originalValue !== srcValue) {
                          console.log('[HA Proxy] Script src property rewritten:', originalValue, '->', srcValue);
                        } else {
                          console.log('[HA Proxy] Script src property unchanged:', value);
                        }
                        this.setAttribute('src', srcValue);
                      } else {
                        srcValue = value;
                      }
                    },
                    get: function() {
                      return srcValue || this.getAttribute('src') || '';
                    }
                  });
                }
                
                if (tagName === 'link') {
                  let hrefValue = '';
                  Object.defineProperty(element, 'href', {
                    set: function(value) {
                      if (typeof value === 'string') {
                        const originalValue = value;
                        hrefValue = rewriteUrl(value);
                        if (originalValue !== hrefValue) {
                          console.log('[HA Proxy] Link href property rewritten:', originalValue, '->', hrefValue);
                        } else {
                          console.log('[HA Proxy] Link href property unchanged:', value);
                        }
                        this.setAttribute('href', hrefValue);
                      } else {
                        hrefValue = value;
                      }
                    },
                    get: function() {
                      return hrefValue || this.getAttribute('href') || '';
                    }
                  });
                }
              }
              
              return element;
            };
            
            // Use MutationObserver to intercept dynamically added script/link tags
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() {
                setupMutationObserver();
              });
            } else {
              setupMutationObserver();
            }
            
            function setupMutationObserver() {
              console.log('[HA Proxy] Setting up MutationObserver');
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                      // Handle script tags
                      if (node.tagName === 'SCRIPT' && node.src) {
                        const originalSrc = node.src;
                        const rewritten = rewriteUrl(node.src);
                        if (originalSrc !== rewritten) {
                          node.src = rewritten;
                          console.log('[HA Proxy] MutationObserver rewrote script:', originalSrc, '->', rewritten);
                        } else {
                          console.log('[HA Proxy] MutationObserver script unchanged:', originalSrc);
                        }
                      }
                      // Handle link tags
                      if (node.tagName === 'LINK' && node.href) {
                        const originalHref = node.href;
                        const rewritten = rewriteUrl(node.href);
                        if (originalHref !== rewritten) {
                          node.href = rewritten;
                          console.log('[HA Proxy] MutationObserver rewrote link:', originalHref, '->', rewritten);
                        } else {
                          console.log('[HA Proxy] MutationObserver link unchanged:', originalHref);
                        }
                      }
                      // Handle nested scripts/links
                      const scripts = node.querySelectorAll && node.querySelectorAll('script[src], link[href]');
                      if (scripts && scripts.length > 0) {
                        console.log('[HA Proxy] MutationObserver found', scripts.length, 'nested scripts/links');
                        scripts.forEach(function(el) {
                          if (el.src) {
                            const originalSrc = el.src;
                            const rewritten = rewriteUrl(el.src);
                            if (originalSrc !== rewritten) {
                              el.src = rewritten;
                              console.log('[HA Proxy] MutationObserver rewrote nested script:', originalSrc, '->', rewritten);
                            }
                          }
                          if (el.href) {
                            const originalHref = el.href;
                            const rewritten = rewriteUrl(el.href);
                            if (originalHref !== rewritten) {
                              el.href = rewritten;
                              console.log('[HA Proxy] MutationObserver rewrote nested link:', originalHref, '->', rewritten);
                            }
                          }
                        });
                      }
                    }
                  });
                });
              });
              
              observer.observe(document.head, { childList: true, subtree: true });
              observer.observe(document.body, { childList: true, subtree: true });
              console.log('[HA Proxy] MutationObserver setup complete');
            }
            
            // Override WebSocket to point directly to HA and include auth
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(url, protocols) {
              const urlStr = typeof url === 'string' ? url : url.toString();
              let rewrittenUrl = rewriteUrl(urlStr);
              
              // Ensure WebSocket URLs point to HA
              if (rewrittenUrl.includes('/api/websocket')) {
                // If it's a relative URL, convert to absolute HA URL
                if (rewrittenUrl.startsWith('/')) {
                  rewrittenUrl = haBaseUrlValue + rewrittenUrl;
                } else if (!rewrittenUrl.startsWith('ws://') && !rewrittenUrl.startsWith('wss://')) {
                  // If it's a protocol-relative URL, convert to absolute
                  const protocol = haBaseUrlValue.startsWith('https') ? 'wss' : 'ws';
                  const haHost = haBaseUrlValue.replace(/^https?:/, '');
                  rewrittenUrl = protocol + '://' + haHost + (rewrittenUrl.startsWith('//') ? rewrittenUrl.substring(1) : rewrittenUrl);
                }
                
                // Home Assistant WebSocket requires auth via first message
                const ws = new originalWebSocket(rewrittenUrl, protocols);
                ws.addEventListener('open', function() {
                  ws.send(JSON.stringify({ type: 'auth', access_token: '${haToken}' }));
                });
                return ws;
              }
              
              // For other WebSocket URLs, just rewrite if needed
              return new originalWebSocket(rewrittenUrl, protocols);
            };
            
            // Intercept dynamic imports
            const originalImport = window.import || (() => {});
            if (window.import) {
              window.import = function(module) {
                const rewrittenModule = rewriteUrl(module);
                return originalImport(rewrittenModule);
              };
            }
            
            // Intercept System.import if available
            if (window.System && window.System.import) {
              const originalSystemImport = window.System.import;
              window.System.import = function(module) {
                const rewrittenModule = rewriteUrl(module);
                return originalSystemImport.call(this, rewrittenModule);
              };
            }
            
            // Intercept CSS @font-face and @import URLs
            const originalInsertRule = CSSStyleSheet.prototype.insertRule;
            CSSStyleSheet.prototype.insertRule = function(rule, index) {
              if (typeof rule === 'string') {
                rule = rule.replace(/url\(['"]?([^'"]+)['"]?\)/g, function(match, url) {
                  const rewritten = rewriteUrl(url);
                  return 'url("' + rewritten + '")';
                });
              }
              return originalInsertRule.call(this, rule, index);
            };
            
            // Intercept CSSStyleSheet.addRule
            if (CSSStyleSheet.prototype.addRule) {
              const originalAddRule = CSSStyleSheet.prototype.addRule;
              CSSStyleSheet.prototype.addRule = function(selector, style, index) {
                if (typeof style === 'string') {
                  style = style.replace(/url\(['"]?([^'"]+)['"]?\)/g, function(match, url) {
                    const rewritten = rewriteUrl(url);
                    return 'url("' + rewritten + '")';
                  });
                }
                return originalAddRule.call(this, selector, style, index);
              };
            }
            
            // Intercept all existing script and link tags in the document
            // This runs immediately to catch tags that were already in the HTML
            (function interceptExistingTags() {
              // Use setTimeout to ensure DOM is ready, but run as early as possible
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', interceptExistingTags);
              } else {
                // DOM already ready, run immediately
                setTimeout(interceptExistingTags, 0);
              }
              
              function interceptExistingTags() {
                const scripts = document.querySelectorAll('script[src]');
                scripts.forEach(function(script) {
                  if (script.src) {
                    const originalSrc = script.src;
                    const rewritten = rewriteUrl(originalSrc);
                    if (originalSrc !== rewritten) {
                      script.src = rewritten;
                      console.log('[HA Proxy] Rewrote existing script:', originalSrc, '->', rewritten);
                    }
                  }
                });
                
                const links = document.querySelectorAll('link[href]');
                links.forEach(function(link) {
                  if (link.href) {
                    const originalHref = link.href;
                    const rewritten = rewriteUrl(originalHref);
                    if (originalHref !== rewritten) {
                      link.href = rewritten;
                      console.log('[HA Proxy] Rewrote existing link:', originalHref, '->', rewritten);
                    }
                  }
                });
              }
            })();
            })(); // End IIFE
          </script>`
      );

    console.log("[HA Dashboard] HTML processing complete:", {
      htmlLength: html.length,
      hrefReplacements,
      srcReplacements,
      urlReplacements,
      totalReplacements: hrefReplacements + srcReplacements + urlReplacements,
      replacedUrls: replacedUrls.slice(0, 10), // Log first 10 replacements
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.send(html);
  }

  // Proxy route for Home Assistant dashboard
  // This allows embedding the full HA dashboard via iframe
  // Home Assistant frontend is a SPA that requires proper authentication
  // This route proxies the dashboard HTML and injects authentication
  app.get("/api/ha/dashboard", async (req, res) => {
    const dashboard = req.query.dashboard as string || "lovelace"; // Default to "lovelace" or custom dashboard name
    const view = req.query.view as string || "default_view";
    
    console.log("[HA Dashboard] Request received:", {
      dashboard,
      view,
      query: req.query,
      userAgent: req.headers['user-agent'],
    });
    
    if (!haBaseUrl || !haToken) {
      console.error("[HA Dashboard] Configuration missing:", {
        hasBaseUrl: !!haBaseUrl,
        hasToken: !!haToken,
        baseUrl: haBaseUrl || "(not set)",
      });
      return res.status(500).json({ error: "HA_BASE_URL or HA_TOKEN not configured" });
    }

    try {
      // Build dashboard URL - supports both default lovelace and custom dashboards
      // Examples:
      // - /lovelace/default_view (default dashboard)
      // - /dashboard-conex/aa (custom dashboard)
      let dashboardUrl: string;
      if (dashboard === "lovelace") {
        dashboardUrl = `${haBaseUrl}/lovelace/${encodeURIComponent(view)}`;
      } else {
        // Custom dashboard: /dashboard-{name}/{view}
        dashboardUrl = `${haBaseUrl}/${dashboard}/${encodeURIComponent(view)}`;
      }
      
      console.log("[HA Dashboard] Attempting to load:", {
        dashboardUrl,
        dashboard,
        view,
      });
      
      // Fetch the dashboard HTML from Home Assistant
      const response = await fetch(dashboardUrl, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      console.log("[HA Dashboard] Response from HA:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        url: dashboardUrl,
      });

      if (!response.ok) {
        // If specific dashboard fails, try the root dashboard
        console.log("[HA Dashboard] Failed to load specific dashboard, trying root:", {
          originalStatus: response.status,
          originalStatusText: response.statusText,
        });
        const rootResponse = await fetch(`${haBaseUrl}/`, {
          headers: {
            Authorization: `Bearer ${haToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        console.log("[HA Dashboard] Root response:", {
          status: rootResponse.status,
          statusText: rootResponse.statusText,
        });

        if (!rootResponse.ok) {
          console.error("[HA Dashboard] Both dashboard and root failed:", {
            dashboardUrl,
            dashboardStatus: response.status,
            rootStatus: rootResponse.status,
          });
          return res.status(rootResponse.status).json({ 
            error: `Failed to load dashboard: ${rootResponse.statusText}`,
            attemptedUrl: dashboardUrl
          });
        }

        const html = await rootResponse.text();
        console.log("[HA Dashboard] Successfully loaded root dashboard, HTML length:", html.length);
        return serveProxiedDashboard(html, res);
      }

      const html = await response.text();
      console.log("[HA Dashboard] Successfully loaded dashboard, HTML length:", html.length);
      return serveProxiedDashboard(html, res);
    } catch (err: any) {
      console.error("[HA Dashboard] Error:", {
        error: err?.message,
        stack: err?.stack,
        dashboard,
        view,
      });
      res.status(500).json({ error: `Failed to proxy dashboard: ${err?.message}` });
    }
  });

  // Catch-all route for /ha/* to handle any direct navigation or resource requests
  // This ensures that if the iframe tries to navigate to /ha or load resources from /ha/*,
  // they get properly proxied to Home Assistant
  // Use app.use to match all routes starting with /ha
  app.use("/ha", async (req: any, res: any, next: any) => {
    // Only handle GET requests for now
    if (req.method !== 'GET') {
      return next();
    }
    
    // Extract path after /ha
    // req.path will be like "/ha" or "/ha/something/else"
    let path = req.path;
    if (path.startsWith('/ha')) {
      path = path.substring(3); // Remove '/ha'
      if (path.startsWith('/')) {
        path = path.substring(1); // Remove leading '/'
      }
    }
    
    // If path is empty, it's just /ha - redirect to dashboard
    if (!path || path === '') {
      const dashboard = (req.query.dashboard as string) || "lovelace";
      const view = (req.query.view as string) || "default_view";
      return res.redirect(`/api/ha/dashboard?dashboard=${encodeURIComponent(dashboard)}&view=${encodeURIComponent(view)}`);
    }
    
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    console.log("[HA Catch-all] Request received:", {
      path,
      originalUrl: req.originalUrl,
      reqPath: req.path,
      method: req.method,
      queryString,
    });
    
    if (!haBaseUrl || !haToken) {
      console.error("[HA Catch-all] Configuration missing");
      return res.status(500).json({ error: "HA_BASE_URL or HA_TOKEN not configured" });
    }

    try {
      // Determine if this is an HTML page (dashboard) or a resource
      const targetUrl = `${haBaseUrl}/${path}${queryString}`;
      console.log("[HA Catch-all] Proxying to HA:", targetUrl);
      
      const response = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          "User-Agent": req.headers['user-agent'] || "Mozilla/5.0",
          Accept: req.headers.accept || "*/*",
        },
      });

      console.log("[HA Catch-all] Response:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        path,
        targetUrl,
      });

      if (!response.ok) {
        console.warn("[HA Catch-all] Failed to fetch:", {
          path,
          status: response.status,
          statusText: response.statusText,
          targetUrl,
        });
        return res.status(response.status).end();
      }

      const contentType = response.headers.get("content-type") || "";
      
      // If it's HTML, process it through serveProxiedDashboard
      if (contentType.includes("text/html")) {
        const html = await response.text();
        return serveProxiedDashboard(html, res);
      }
      
      // Otherwise, proxy the resource as-is
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        res.setHeader("Cache-Control", cacheControl);
      }

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("[HA Catch-all] Error:", {
        path,
        error: err?.message,
      });
      res.status(500).end();
    }
    // Don't call next() - we've handled the request
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

  return;
}


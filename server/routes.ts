import type { Express } from "express";
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
    if (!haBaseUrl || !haToken) {
      return { status: 500, json: { error: "HA_BASE_URL or HA_TOKEN not configured" } };
    }
    const url = `${haBaseUrl}${path}`;
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
    return { status: res.status, json };
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
    if (req.path.startsWith("/auth")) {
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
  app.get("/api/ha/states", async (_req, res) => {
    const result = await haRequest("GET", "/api/states");
    return res.status(result.status).json(result.json);
  });

  app.get("/api/ha/states/:entityId", async (req, res) => {
    const { entityId } = req.params;
    const result = await haRequest("GET", `/api/states/${encodeURIComponent(entityId)}`);
    return res.status(result.status).json(result.json);
  });

  app.post("/api/ha/services/:domain/:service", async (req, res) => {
    const { domain, service } = req.params;
    const result = await haRequest(
      "POST",
      `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
      req.body ?? {},
    );
    return res.status(result.status).json(result.json);
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

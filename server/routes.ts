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
  type Light,
  type Tv,
} from "@shared/schema";
import { ZodError } from "zod";

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

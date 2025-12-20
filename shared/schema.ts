import { z } from "zod";

// Company schemas
export const insertCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
});

export const companySchema = insertCompanySchema.extend({
  id: z.string(),
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = z.infer<typeof companySchema>;

// Location schemas
export const insertLocationSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  name: z.string().min(1, "Location name is required"),
  description: z.string().optional(),
});

export const locationSchema = insertLocationSchema.extend({
  id: z.string(),
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = z.infer<typeof locationSchema>;

// Light schemas
export const insertLightSchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  name: z.string().min(1, "Light name is required"),
  isOn: z.boolean().default(false),
  brightness: z.number().min(0).max(100).default(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").default("#ffffff"),
  status: z.enum(["online", "offline"]).default("online"),
});

export const lightSchema = insertLightSchema.extend({
  id: z.string(),
});

export const updateLightSchema = z.object({
  name: z.string().min(1).optional(),
  isOn: z.boolean().optional(),
  brightness: z.number().min(0).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional(),
  status: z.enum(["online", "offline"]).optional(),
});

export type InsertLight = z.infer<typeof insertLightSchema>;
export type Light = z.infer<typeof lightSchema>;
export type UpdateLight = z.infer<typeof updateLightSchema>;

// Video schemas
export const insertVideoSchema = z.object({
  name: z.string().min(1, "Video name is required"),
  url: z.string().url("Invalid video URL"),
  duration: z.number().min(1).optional(),
});

export const videoSchema = insertVideoSchema.extend({
  id: z.string(),
  uploadedAt: z.date(),
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = z.infer<typeof videoSchema>;

// TV schemas
export const insertTvSchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  name: z.string().min(1, "TV name is required"),
  currentVideoId: z.string().optional(),
  isLooping: z.boolean().default(true),
  status: z.enum(["online", "offline"]).default("online"),
});

export const tvSchema = insertTvSchema.extend({
  id: z.string(),
});

export const updateTvSchema = z.object({
  name: z.string().min(1).optional(),
  currentVideoId: z.string().nullable().optional(),
  isLooping: z.boolean().optional(),
  status: z.enum(["online", "offline"]).optional(),
});

export type InsertTv = z.infer<typeof insertTvSchema>;
export type Tv = z.infer<typeof tvSchema>;
export type UpdateTv = z.infer<typeof updateTvSchema>;

// WebSocket message schemas
export const deviceUpdateMessageSchema = z.object({
  type: z.enum(['light_update', 'tv_update']),
  deviceId: z.string(),
  data: z.union([lightSchema, tvSchema, updateLightSchema, updateTvSchema]),
});

export const deviceStatusMessageSchema = z.object({
  type: z.literal('status_update'),
  deviceId: z.string(),
  deviceType: z.enum(['light', 'tv']),
  status: z.enum(['online', 'offline']),
});

export type DeviceUpdateMessage = z.infer<typeof deviceUpdateMessageSchema>;
export type DeviceStatusMessage = z.infer<typeof deviceStatusMessageSchema>;

import { pgTable, foreignKey, pgPolicy, bigint, timestamp, varchar, text, smallint, index, uuid, integer, jsonb, unique, boolean, serial, json, primaryKey, numeric, pgEnum, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Enums
export const mediaTypeEnum = pgEnum("media_type", ["video", "image", "audio", "text"]);
export const uploadStatusEnum = pgEnum("upload_status", ["uploading", "processing", "completed", "failed"]);
export const textAlignEnum = pgEnum("text_align", ["left", "center", "right"]);
export const fontWeightEnum = pgEnum("font_weight", ["normal", "bold"]);
export const easingEnum = pgEnum("easing", ["linear", "ease-in", "ease-out", "ease-in-out"]);
export const renderStatusEnum = pgEnum("render_status", ["queued", "processing", "completed", "failed"]);
export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);
export const commandTypeEnum = pgEnum("command_type", [
  "createClip",
  "updateClip",
  "deleteClip",
  "splitClip",
  "createKeyframe",
  "updateKeyframe",
  "deleteKeyframe",
  "createMediaAsset",
  "deleteMediaAsset"
]);

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by"), // User ID when auth is added
  thumbnail: text("thumbnail"), // UploadThing file key
  settings: jsonb("settings").notNull().$type<{
    fps: number;
    resolution: {
      width: number;
      height: number;
    };
    duration: number;
  }>(),
  isPublic: boolean("is_public").notNull().default(false),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  lastModifiedIdx: index("projects_last_modified_idx").on(table.lastModified),
}));

// Media assets table
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  // File storage - UploadThing file keys
  fileKey: text("file_key"), // For uploaded files
  thumbnailKey: text("thumbnail_key"), // For video thumbnails
  // Media properties
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  duration: real("duration").notNull(), // Duration in seconds (0 for images)
  // Text properties (only for text type)
  textProperties: jsonb("text_properties").$type<{
    textContent: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    textAlign: "left" | "center" | "right";
    fontWeight: "normal" | "bold";
  }>(),
  // Upload tracking
  uploadProgress: integer("upload_progress"), // 0-100
  uploadStatus: uploadStatusEnum("upload_status").notNull().default("uploading"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("media_assets_project_idx").on(table.projectId),
  projectTypeIdx: index("media_assets_project_type_idx").on(table.projectId, table.mediaType),
}));

// Timeline clips table
export const timelineClips = pgTable("timeline_clips", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  mediaAssetId: uuid("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  trackIndex: integer("track_index").notNull(),
  // Timeline position
  startTime: real("start_time").notNull(), // Start time in seconds
  duration: real("duration").notNull(), // Duration in seconds
  // Trim properties (for video/audio)
  trimStart: real("trim_start"), // Trim from start in seconds
  trimEnd: real("trim_end"), // Trim from end in seconds
  // Transform properties
  position: jsonb("position").notNull().$type<{ x: number; y: number }>(),
  size: jsonb("size").notNull().$type<{ width: number; height: number }>(),
  rotation: real("rotation").default(0), // Rotation in degrees
  opacity: real("opacity").default(1), // 0-1
  scale: real("scale").default(1), // Scale factor
  // Playback properties
  playbackSpeed: real("playback_speed").default(1), // Speed multiplier (0.25 to 4)
  // Layer order within track
  zIndex: integer("z_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("timeline_clips_project_idx").on(table.projectId),
  projectTrackIdx: index("timeline_clips_project_track_idx").on(table.projectId, table.trackIndex),
  projectTimeIdx: index("timeline_clips_project_time_idx").on(table.projectId, table.startTime),
}));

// Keyframes table
export const keyframes = pgTable("keyframes", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  clipId: uuid("clip_id").notNull().references(() => timelineClips.id, { onDelete: "cascade" }),
  time: real("time").notNull(), // Time in seconds relative to clip start
  // Animated properties
  properties: jsonb("properties").notNull().$type<{
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    opacity?: number;
    scale?: number;
  }>(),
  // Easing function
  easing: easingEnum("easing").default("linear"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  clipIdx: index("keyframes_clip_idx").on(table.clipId),
  clipTimeIdx: index("keyframes_clip_time_idx").on(table.clipId, table.time),
}));

// Render jobs table
export const renderJobs = pgTable("render_jobs", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: renderStatusEnum("status").notNull().default("queued"),
  progress: integer("progress"), // 0-100
  outputUrl: text("output_url"), // URL of rendered video
  fileKey: text("file_key"), // UploadThing file key of rendered video
  error: text("error"), // Error message if failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  settings: jsonb("settings").notNull().$type<{
    format: string; // mp4, webm, etc.
    quality: string; // high, medium, low
    resolution: {
      width: number;
      height: number;
    };
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("render_jobs_project_idx").on(table.projectId),
  statusIdx: index("render_jobs_status_idx").on(table.status),
}));

// User settings table
export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull().unique(),
  preferences: jsonb("preferences").notNull().$type<{
    defaultFps?: number;
    defaultResolution?: {
      width: number;
      height: number;
    };
    autoSave?: boolean;
    theme?: "light" | "dark" | "system";
  }>(),
  recentProjects: jsonb("recent_projects").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_settings_user_idx").on(table.userId),
}));

// Command history table
export const commandHistory = pgTable("command_history", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: commandTypeEnum("type").notNull(),
  description: text("description").notNull(), // Human-readable description
  // Store the data needed to undo/redo the command
  undoData: jsonb("undo_data"), // Flexible storage for command-specific undo data
  redoData: jsonb("redo_data"), // Flexible storage for command-specific redo data
  // Track if this command has been undone
  isUndone: boolean("is_undone").notNull().default(false),
}, (table) => ({
  projectTimeIdx: index("command_history_project_time_idx").on(table.projectId, table.timestamp),
  projectUndoneTimeIdx: index("command_history_project_undone_time_idx").on(table.projectId, table.isUndone, table.timestamp),
}));

// Export types for TypeScript
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

export type TimelineClip = typeof timelineClips.$inferSelect;
export type NewTimelineClip = typeof timelineClips.$inferInsert;

export type Keyframe = typeof keyframes.$inferSelect;
export type NewKeyframe = typeof keyframes.$inferInsert;

export type RenderJob = typeof renderJobs.$inferSelect;
export type NewRenderJob = typeof renderJobs.$inferInsert;

export type UserSetting = typeof userSettings.$inferSelect;
export type NewUserSetting = typeof userSettings.$inferInsert;

export type CommandHistory = typeof commandHistory.$inferSelect;
export type NewCommandHistory = typeof commandHistory.$inferInsert;
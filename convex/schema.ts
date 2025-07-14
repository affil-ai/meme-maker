import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Projects table - main container for video projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.optional(v.string()), // User ID when auth is added
    thumbnail: v.optional(v.string()), // Storage ID for thumbnail
    settings: v.object({
      fps: v.number(),
      resolution: v.object({
        width: v.number(),
        height: v.number(),
      }),
      duration: v.number(), // Total duration in seconds
    }),
    isPublic: v.boolean(),
    lastModified: v.number(), // Timestamp
  })
    .index("by_last_modified", ["lastModified"])
    .searchIndex("search_name", {
      searchField: "name",
    }),

  // Media assets table - all uploaded media files
  mediaAssets: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    mediaType: v.union(
      v.literal("video"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("text")
    ),
    // File storage IDs
    storageId: v.optional(v.string()), // For uploaded files
    thumbnailId: v.optional(v.string()), // For video thumbnails
    
    // Media properties
    width: v.number(),
    height: v.number(),
    duration: v.number(), // Duration in seconds (0 for images)
    
    // Text properties (only for text type)
    textProperties: v.optional(v.object({
      textContent: v.string(),
      fontSize: v.number(),
      fontFamily: v.string(),
      color: v.string(),
      textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
      fontWeight: v.union(v.literal("normal"), v.literal("bold")),
    })),
    
    // Upload tracking
    uploadProgress: v.optional(v.number()), // 0-100
    uploadStatus: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_type", ["projectId", "mediaType"]),

  // Timeline clips - instances of media assets on the timeline
  timelineClips: defineTable({
    projectId: v.id("projects"),
    mediaAssetId: v.id("mediaAssets"),
    trackIndex: v.number(),
    
    // Timeline position
    startTime: v.number(), // Start time in seconds
    duration: v.number(), // Duration in seconds
    
    // Trim properties (for video/audio)
    trimStart: v.optional(v.number()), // Trim from start in seconds
    trimEnd: v.optional(v.number()), // Trim from end in seconds
    
    // Transform properties
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    size: v.object({
      width: v.number(),
      height: v.number(),
    }),
    rotation: v.optional(v.number()), // Rotation in degrees
    opacity: v.optional(v.number()), // 0-1
    scale: v.optional(v.number()), // Scale factor
    
    // Playback properties
    playbackSpeed: v.optional(v.number()), // Speed multiplier (0.25 to 4)
    
    // Layer order within track
    zIndex: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_track", ["projectId", "trackIndex"])
    .index("by_project_and_time", ["projectId", "startTime"]),

  // Keyframes for animations
  keyframes: defineTable({
    clipId: v.id("timelineClips"),
    time: v.number(), // Time in seconds relative to clip start
    
    // Animated properties
    properties: v.object({
      x: v.optional(v.number()),
      y: v.optional(v.number()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      rotation: v.optional(v.number()),
      opacity: v.optional(v.number()),
      scale: v.optional(v.number()),
    }),
    
    // Easing function
    easing: v.optional(v.union(
      v.literal("linear"),
      v.literal("ease-in"),
      v.literal("ease-out"),
      v.literal("ease-in-out")
    )),
  })
    .index("by_clip", ["clipId"])
    .index("by_clip_and_time", ["clipId", "time"]),

  // Render jobs - track video rendering tasks
  renderJobs: defineTable({
    projectId: v.id("projects"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()), // 0-100
    outputUrl: v.optional(v.string()), // URL of rendered video
    storageId: v.optional(v.string()), // Storage ID of rendered video
    error: v.optional(v.string()), // Error message if failed
    startedAt: v.optional(v.number()), // Timestamp
    completedAt: v.optional(v.number()), // Timestamp
    settings: v.object({
      format: v.string(), // mp4, webm, etc.
      quality: v.string(), // high, medium, low
      resolution: v.object({
        width: v.number(),
        height: v.number(),
      }),
    }),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // User preferences and settings (for when auth is added)
  userSettings: defineTable({
    userId: v.string(),
    preferences: v.object({
      defaultFps: v.optional(v.number()),
      defaultResolution: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
      autoSave: v.optional(v.boolean()),
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    }),
    recentProjects: v.optional(v.array(v.id("projects"))),
  })
    .index("by_user", ["userId"]),
});
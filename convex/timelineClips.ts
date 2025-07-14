import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Get all timeline clips for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    // Also fetch the media asset details for each clip
    const clipsWithAssets = await Promise.all(
      clips.map(async (clip) => {
        const mediaAsset = await ctx.db.get(clip.mediaAssetId);
        return { ...clip, mediaAsset };
      })
    );
    
    return clipsWithAssets;
  },
});

// Get clips for a specific track
export const listByTrack = query({
  args: { 
    projectId: v.id("projects"),
    trackIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project_and_track", (q) => 
        q.eq("projectId", args.projectId).eq("trackIndex", args.trackIndex)
      )
      .collect();
    
    // Also fetch the media asset details for each clip
    const clipsWithAssets = await Promise.all(
      clips.map(async (clip) => {
        const mediaAsset = await ctx.db.get(clip.mediaAssetId);
        return { ...clip, mediaAsset };
      })
    );
    
    return clipsWithAssets;
  },
});

// Get a single timeline clip with its keyframes
export const get = query({
  args: { clipId: v.id("timelineClips") },
  handler: async (ctx, args) => {
    const clip = await ctx.db.get(args.clipId);
    if (!clip) return null;
    
    const mediaAsset = await ctx.db.get(clip.mediaAssetId);
    const keyframes = await ctx.db
      .query("keyframes")
      .withIndex("by_clip", (q) => q.eq("clipId", args.clipId))
      .collect();
    
    return { ...clip, mediaAsset, keyframes };
  },
});

// Create a new timeline clip
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    mediaAssetId: v.id("mediaAssets"),
    trackIndex: v.number(),
    startTime: v.number(),
    duration: v.number(),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    size: v.object({
      width: v.number(),
      height: v.number(),
    }),
    zIndex: v.number(),
    rotation: v.optional(v.number()),
    opacity: v.optional(v.number()),
    scale: v.optional(v.number()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    playbackSpeed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const clipId = await ctx.db.insert("timelineClips", args);
    
    // Get the created clip for redo data
    const createdClip = await ctx.db.get(clipId);
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: args.projectId,
      type: "createClip",
      description: `Added clip to timeline`,
      undoData: { clipId },
      redoData: { clipData: createdClip },
    });
    
    // Update project's last modified time
    await ctx.db.patch(args.projectId, {
      lastModified: Date.now(),
    });
    
    return clipId;
  },
});

// Update timeline clip
export const update = mutation({
  args: {
    clipId: v.id("timelineClips"),
    trackIndex: v.optional(v.number()),
    startTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    position: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
    size: v.optional(v.object({
      width: v.number(),
      height: v.number(),
    })),
    zIndex: v.optional(v.number()),
    rotation: v.optional(v.number()),
    opacity: v.optional(v.number()),
    scale: v.optional(v.number()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    playbackSpeed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { clipId, ...updateData } = args;
    const clip = await ctx.db.get(clipId);
    if (!clip) throw new Error("Clip not found");
    
    // Store previous state for undo
    const previousData: any = {};
    for (const key in updateData) {
      previousData[key] = (clip as any)[key];
    }
    
    await ctx.db.patch(clipId, updateData);
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: clip.projectId,
      type: "updateClip",
      description: `Updated clip properties`,
      undoData: { clipId, previousData },
      redoData: { clipId, updateData },
    });
    
    // Update project's last modified time
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
  },
});

// Delete timeline clip
export const remove = mutation({
  args: { clipId: v.id("timelineClips") },
  handler: async (ctx, args) => {
    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");
    
    // Delete all keyframes for this clip
    const keyframes = await ctx.db
      .query("keyframes")
      .withIndex("by_clip", (q) => q.eq("clipId", args.clipId))
      .collect();
    
    for (const keyframe of keyframes) {
      await ctx.db.delete(keyframe._id);
    }
    
    // Record command for undo/redo before deletion
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: clip.projectId,
      type: "deleteClip",
      description: `Deleted clip from timeline`,
      undoData: { clipData: clip, keyframes },
      redoData: { clipId: args.clipId },
    });
    
    // Delete the clip
    await ctx.db.delete(args.clipId);
    
    // Update project's last modified time
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
  },
});

// Batch update clips (for efficient timeline operations)
export const batchUpdate = mutation({
  args: {
    updates: v.array(v.object({
      clipId: v.id("timelineClips"),
      trackIndex: v.optional(v.number()),
      startTime: v.optional(v.number()),
      duration: v.optional(v.number()),
      position: v.optional(v.object({
        x: v.number(),
        y: v.number(),
      })),
      size: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
      zIndex: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    let projectId: string | null = null;
    
    for (const { clipId, ...updateData } of args.updates) {
      const clip = await ctx.db.get(clipId);
      if (!clip) continue;
      
      if (!projectId) projectId = clip.projectId;
      
      await ctx.db.patch(clipId, updateData);
    }
    
    // Update project's last modified time
    if (projectId) {
      await ctx.db.patch(projectId as Id<"projects">, {
        lastModified: Date.now(),
      });
    }
  },
});
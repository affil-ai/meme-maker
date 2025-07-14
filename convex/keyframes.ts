import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Get all keyframes for a clip
export const listByClip = query({
  args: { clipId: v.id("timelineClips") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("keyframes")
      .withIndex("by_clip", (q) => q.eq("clipId", args.clipId))
      .order("asc")
      .collect();
  },
});

// Create a new keyframe
export const create = mutation({
  args: {
    clipId: v.id("timelineClips"),
    time: v.number(),
    properties: v.object({
      x: v.optional(v.number()),
      y: v.optional(v.number()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      rotation: v.optional(v.number()),
      opacity: v.optional(v.number()),
      scale: v.optional(v.number()),
    }),
    easing: v.optional(v.union(
      v.literal("linear"),
      v.literal("ease-in"),
      v.literal("ease-out"),
      v.literal("ease-in-out")
    )),
  },
  handler: async (ctx, args) => {
    // Get the clip to find the project ID
    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");
    
    const keyframeId = await ctx.db.insert("keyframes", {
      ...args,
      easing: args.easing || "linear",
    });
    
    // Get the created keyframe for redo data
    const createdKeyframe = await ctx.db.get(keyframeId);
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: clip.projectId,
      type: "createKeyframe",
      description: `Added keyframe at ${args.time.toFixed(2)}s`,
      undoData: { keyframeId },
      redoData: { keyframeData: createdKeyframe },
    });
    
    // Update project's last modified time
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
    
    return keyframeId;
  },
});

// Update a keyframe
export const update = mutation({
  args: {
    keyframeId: v.id("keyframes"),
    time: v.optional(v.number()),
    properties: v.optional(v.object({
      x: v.optional(v.number()),
      y: v.optional(v.number()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      rotation: v.optional(v.number()),
      opacity: v.optional(v.number()),
      scale: v.optional(v.number()),
    })),
    easing: v.optional(v.union(
      v.literal("linear"),
      v.literal("ease-in"),
      v.literal("ease-out"),
      v.literal("ease-in-out")
    )),
  },
  handler: async (ctx, args) => {
    const { keyframeId, ...updateData } = args;
    const keyframe = await ctx.db.get(keyframeId);
    if (!keyframe) throw new Error("Keyframe not found");
    
    // Get the clip to find the project ID
    const clip = await ctx.db.get(keyframe.clipId);
    if (!clip) throw new Error("Clip not found");
    
    // Store previous state for undo
    const previousData: any = {};
    for (const key in updateData) {
      previousData[key] = (keyframe as any)[key];
    }
    
    await ctx.db.patch(keyframeId, updateData);
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: clip.projectId,
      type: "updateKeyframe",
      description: `Updated keyframe at ${keyframe.time.toFixed(2)}s`,
      undoData: { keyframeId, previousData },
      redoData: { keyframeId, updateData },
    });
    
    // Update project's last modified time
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
  },
});

// Delete a keyframe
export const remove = mutation({
  args: { keyframeId: v.id("keyframes") },
  handler: async (ctx, args) => {
    const keyframe = await ctx.db.get(args.keyframeId);
    if (!keyframe) throw new Error("Keyframe not found");
    
    // Get the clip to find the project ID
    const clip = await ctx.db.get(keyframe.clipId);
    if (!clip) throw new Error("Clip not found");
    
    // Record command for undo/redo before deletion
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: clip.projectId,
      type: "deleteKeyframe",
      description: `Deleted keyframe at ${keyframe.time.toFixed(2)}s`,
      undoData: { keyframeData: keyframe },
      redoData: { keyframeId: args.keyframeId },
    });
    
    await ctx.db.delete(args.keyframeId);
    
    // Update project's last modified time
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
  },
});

// Batch create/update keyframes
export const batchUpsert = mutation({
  args: {
    clipId: v.id("timelineClips"),
    keyframes: v.array(v.object({
      id: v.optional(v.id("keyframes")),
      time: v.number(),
      properties: v.object({
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        rotation: v.optional(v.number()),
        opacity: v.optional(v.number()),
        scale: v.optional(v.number()),
      }),
      easing: v.optional(v.union(
        v.literal("linear"),
        v.literal("ease-in"),
        v.literal("ease-out"),
        v.literal("ease-in-out")
      )),
    })),
  },
  handler: async (ctx, args) => {
    // Get the clip to find the project ID
    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");
    
    // Delete existing keyframes that aren't in the new list
    const existingKeyframes = await ctx.db
      .query("keyframes")
      .withIndex("by_clip", (q) => q.eq("clipId", args.clipId))
      .collect();
    
    const newKeyframeIds = new Set(args.keyframes.filter(k => k.id).map(k => k.id));
    
    for (const existing of existingKeyframes) {
      if (!newKeyframeIds.has(existing._id)) {
        await ctx.db.delete(existing._id);
      }
    }
    
    // Create or update keyframes
    for (const keyframe of args.keyframes) {
      if (keyframe.id) {
        // Update existing
        const { id, ...updateData } = keyframe;
        await ctx.db.patch(id, updateData);
      } else {
        // Create new
        await ctx.db.insert("keyframes", {
          clipId: args.clipId,
          time: keyframe.time,
          properties: keyframe.properties,
          easing: keyframe.easing || "linear",
        });
      }
    }
    
    // Update project's last modified time
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
  },
});
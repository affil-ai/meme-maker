import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Create a new checkpoint
export const createCheckpoint = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all timeline clips for the project
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    // Get all keyframes for each clip
    const keyframesPromises = clips.map(async (clip, index) => {
      const keyframes = await ctx.db
        .query("keyframes")
        .withIndex("by_clip", (q) => q.eq("clipId", clip._id))
        .collect();
      
      return keyframes.map(kf => ({
        clipIndex: index,
        time: kf.time,
        properties: kf.properties,
        easing: kf.easing,
      }));
    });
    
    const allKeyframes = (await Promise.all(keyframesPromises)).flat();
    
    // Create checkpoint with current state
    const checkpointId = await ctx.db.insert("checkpoints", {
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      createdAt: Date.now(),
      state: {
        clips: clips.map(clip => ({
          mediaAssetId: clip.mediaAssetId,
          trackIndex: clip.trackIndex,
          startTime: clip.startTime,
          duration: clip.duration,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
          position: clip.position,
          size: clip.size,
          rotation: clip.rotation,
          opacity: clip.opacity,
          scale: clip.scale,
          playbackSpeed: clip.playbackSpeed,
          zIndex: clip.zIndex,
        })),
        keyframes: allKeyframes,
      },
    });
    
    // Update project's last modified time
    await ctx.db.patch(args.projectId, {
      lastModified: Date.now(),
    });
    
    return { checkpointId, success: true };
  },
});

// Restore a checkpoint
export const restoreCheckpoint = mutation({
  args: {
    checkpointId: v.id("checkpoints"),
  },
  handler: async (ctx, args) => {
    const checkpoint = await ctx.db.get(args.checkpointId);
    if (!checkpoint) {
      throw new Error("Checkpoint not found");
    }
    
    // Delete all existing clips and their keyframes for this project
    const existingClips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", checkpoint.projectId))
      .collect();
    
    for (const clip of existingClips) {
      // Delete all keyframes for this clip
      const keyframes = await ctx.db
        .query("keyframes")
        .withIndex("by_clip", (q) => q.eq("clipId", clip._id))
        .collect();
      
      for (const keyframe of keyframes) {
        await ctx.db.delete(keyframe._id);
      }
      
      // Delete the clip
      await ctx.db.delete(clip._id);
    }
    
    // Recreate clips and keyframes from checkpoint
    const clipIdMap = new Map<number, Id<"timelineClips">>();
    
    for (let i = 0; i < checkpoint.state.clips.length; i++) {
      const clipData = checkpoint.state.clips[i];
      const newClipId = await ctx.db.insert("timelineClips", {
        projectId: checkpoint.projectId,
        ...clipData,
      });
      clipIdMap.set(i, newClipId);
    }
    
    // Recreate keyframes
    for (const keyframe of checkpoint.state.keyframes) {
      const clipId = clipIdMap.get(keyframe.clipIndex);
      if (clipId) {
        await ctx.db.insert("keyframes", {
          clipId,
          time: keyframe.time,
          properties: keyframe.properties,
          easing: keyframe.easing,
        });
      }
    }
    
    // Update project's last modified time
    await ctx.db.patch(checkpoint.projectId, {
      lastModified: Date.now(),
    });
    
    return { success: true, message: `Restored checkpoint: ${checkpoint.name}` };
  },
});

// Delete a checkpoint
export const deleteCheckpoint = mutation({
  args: {
    checkpointId: v.id("checkpoints"),
  },
  handler: async (ctx, args) => {
    const checkpoint = await ctx.db.get(args.checkpointId);
    if (!checkpoint) {
      throw new Error("Checkpoint not found");
    }
    
    await ctx.db.delete(args.checkpointId);
    
    return { success: true };
  },
});

// Get all checkpoints for a project
export const getCheckpoints = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const checkpoints = await ctx.db
      .query("checkpoints")
      .withIndex("by_project_created", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
    
    return checkpoints.map(cp => ({
      _id: cp._id,
      name: cp.name,
      description: cp.description,
      createdAt: cp.createdAt,
      clipCount: cp.state.clips.length,
      keyframeCount: cp.state.keyframes.length,
    }));
  },
});

// Get a single checkpoint with full details
export const getCheckpoint = query({
  args: {
    checkpointId: v.id("checkpoints"),
  },
  handler: async (ctx, args) => {
    const checkpoint = await ctx.db.get(args.checkpointId);
    return checkpoint;
  },
});
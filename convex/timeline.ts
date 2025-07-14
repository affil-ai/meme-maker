import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MediaAssetWithUrl } from "./types";


// Get all timeline data for a project
export const getTimelineData = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Get all clips with their media assets
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    // Get all media assets and keyframes in parallel
    const clipsWithDetails = await Promise.all(
      clips.map(async (clip) => {
        const [mediaAsset, keyframes] = await Promise.all([
          ctx.db.get(clip.mediaAssetId),
          ctx.db
            .query("keyframes")
            .withIndex("by_clip", (q) => q.eq("clipId", clip._id))
            .collect(),
        ]);
        
        // Resolve storage URL if the asset has a storageId
        const mediaAssetWithUrl: MediaAssetWithUrl = mediaAsset!;
        if (mediaAsset && mediaAsset.storageId) {
          mediaAssetWithUrl.storageUrl = await ctx.storage.getUrl(mediaAsset.storageId);
        }
        
        return {
          ...clip,
          mediaAsset: mediaAssetWithUrl,
          keyframes,
        };
      })
    );
    
    // Get project settings for calculations
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    return {
      clips: clipsWithDetails,
      projectSettings: project.settings,
    };
  },
});

// Create multiple clips at once (for drops)
export const createClipFromDrop = mutation({
  args: {
    projectId: v.id("projects"),
    mediaAssetId: v.id("mediaAssets"),
    trackIndex: v.number(),
    dropPositionPx: v.number(),
    pixelsPerSecond: v.number(),
  },
  handler: async (ctx, args) => {
    // Get media asset details
    const mediaAsset = await ctx.db.get(args.mediaAssetId);
    if (!mediaAsset) throw new Error("Media asset not found");
    
    // Calculate time from pixels
    const startTime = args.dropPositionPx / args.pixelsPerSecond;
    
    // Calculate duration based on media type
    let duration = 5; // Default for images and text
    if (mediaAsset.mediaType === "video" || mediaAsset.mediaType === "audio") {
      duration = mediaAsset.duration;
    }
    
    // Calculate dimensions for player
    const playerWidth = mediaAsset.mediaType === "text" && mediaAsset.width === 0
      ? Math.max(200, (mediaAsset.textProperties?.textContent?.length || 10) * (mediaAsset.textProperties?.fontSize || 48) * 0.6)
      : mediaAsset.width;
      
    const playerHeight = mediaAsset.mediaType === "text" && mediaAsset.height === 0
      ? Math.max(80, (mediaAsset.textProperties?.fontSize || 48) * 1.5)
      : mediaAsset.height;
    
    // Create the clip
    const clipId = await ctx.db.insert("timelineClips", {
      projectId: args.projectId,
      mediaAssetId: args.mediaAssetId,
      trackIndex: args.trackIndex,
      startTime,
      duration,
      position: { x: 100, y: 100 },
      size: { width: playerWidth, height: playerHeight },
      zIndex: 0,
      rotation: 0,
      opacity: 1,
      scale: 1,
      playbackSpeed: 1,
    });
    
    // Get the created clip for redo data
    const createdClip = await ctx.db.get(clipId);
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: args.projectId,
      type: "createClip",
      description: `Added ${mediaAsset.name} to timeline`,
      undoData: { clipId },
      redoData: { clipData: createdClip },
    });
    
    // Update project last modified
    await ctx.db.patch(args.projectId, {
      lastModified: Date.now(),
    });
    
    return clipId;
  },
});

// Split a clip at a specific time
export const splitClip = mutation({
  args: {
    clipId: v.id("timelineClips"),
    splitTime: v.number(), // Time in seconds relative to clip start
  },
  handler: async (ctx, args) => {
    const originalClip = await ctx.db.get(args.clipId);
    if (!originalClip) throw new Error("Clip not found");
    
    if (args.splitTime <= 0 || args.splitTime >= originalClip.duration) {
      throw new Error("Split time must be within clip duration");
    }
    
    // Get keyframes for the original clip
    const keyframes = await ctx.db
      .query("keyframes")
      .withIndex("by_clip", (q) => q.eq("clipId", args.clipId))
      .collect();
    
    // Create first clip (before split)
    const { _id: _, _creationTime: __, ...clipData } = originalClip;
    const firstClipId = await ctx.db.insert("timelineClips", {
      ...clipData,
      duration: args.splitTime,
      trimEnd: originalClip.trimEnd ? 
        originalClip.trimEnd + (originalClip.duration - args.splitTime) : 
        (originalClip.duration - args.splitTime),
    });
    
    // Create second clip (after split)
    const secondClipId = await ctx.db.insert("timelineClips", {
      ...clipData,
      startTime: originalClip.startTime + args.splitTime,
      duration: originalClip.duration - args.splitTime,
      trimStart: originalClip.trimStart ? 
        originalClip.trimStart + args.splitTime : 
        args.splitTime,
    });
    
    // Copy keyframes to both clips, adjusting times
    for (const keyframe of keyframes) {
      if (keyframe.time < args.splitTime) {
        // Keyframe belongs to first clip
        await ctx.db.insert("keyframes", {
          clipId: firstClipId,
          time: keyframe.time,
          properties: keyframe.properties,
          easing: keyframe.easing,
        });
      } else {
        // Keyframe belongs to second clip
        await ctx.db.insert("keyframes", {
          clipId: secondClipId,
          time: keyframe.time - args.splitTime,
          properties: keyframe.properties,
          easing: keyframe.easing,
        });
      }
    }
    
    // Get the created clips for redo data
    const [firstClip, secondClip] = await Promise.all([
      ctx.db.get(firstClipId),
      ctx.db.get(secondClipId),
    ]);
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: originalClip.projectId,
      type: "splitClip",
      description: `Split clip at ${args.splitTime.toFixed(2)}s`,
      undoData: {
        newClipIds: [firstClipId, secondClipId],
        originalClip,
      },
      redoData: {
        originalClipId: args.clipId,
        newClips: [firstClip, secondClip],
      },
    });
    
    // Delete original clip and its keyframes
    for (const keyframe of keyframes) {
      await ctx.db.delete(keyframe._id);
    }
    await ctx.db.delete(args.clipId);
    
    // Update project last modified
    await ctx.db.patch(originalClip.projectId, {
      lastModified: Date.now(),
    });
    
    return { firstClipId, secondClipId };
  },
});

// Get track count for a project
export const getTrackCount = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    if (clips.length === 0) return 3; // Default tracks
    
    const maxTrackIndex = Math.max(...clips.map(clip => clip.trackIndex));
    return maxTrackIndex + 1;
  },
});

// Move clip between tracks
export const moveClipToTrack = mutation({
  args: {
    clipId: v.id("timelineClips"),
    newTrackIndex: v.number(),
    newStartTime: v.number(),
  },
  handler: async (ctx, args) => {
    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");
    
    // Store previous state for undo
    const previousData = {
      trackIndex: clip.trackIndex,
      startTime: clip.startTime,
    };
    
    await ctx.db.patch(args.clipId, {
      trackIndex: args.newTrackIndex,
      startTime: args.newStartTime,
    });
    
    // Record command for undo/redo
    await ctx.runMutation(internal.commandHistory.recordCommand, {
      projectId: clip.projectId,
      type: "updateClip",
      description: `Moved clip to track ${args.newTrackIndex + 1}`,
      undoData: { clipId: args.clipId, previousData },
      redoData: {
        clipId: args.clipId,
        updateData: {
          trackIndex: args.newTrackIndex,
          startTime: args.newStartTime,
        },
      },
    });
    
    // Update project last modified
    await ctx.db.patch(clip.projectId, {
      lastModified: Date.now(),
    });
  },
});

// Delete clips by media asset ID (when deleting from media bin)
export const deleteClipsByMediaAsset = mutation({
  args: {
    projectId: v.id("projects"),
    mediaAssetId: v.id("mediaAssets"),
  },
  handler: async (ctx, args) => {
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("mediaAssetId"), args.mediaAssetId))
      .collect();
    
    for (const clip of clips) {
      // Delete keyframes first
      const keyframes = await ctx.db
        .query("keyframes")
        .withIndex("by_clip", (q) => q.eq("clipId", clip._id))
        .collect();
      
      for (const keyframe of keyframes) {
        await ctx.db.delete(keyframe._id);
      }
      
      // Delete clip
      await ctx.db.delete(clip._id);
    }
    
    if (clips.length > 0) {
      // Update project last modified
      await ctx.db.patch(args.projectId, {
        lastModified: Date.now(),
      });
    }
    
    return clips.length;
  },
});
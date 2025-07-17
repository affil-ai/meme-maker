import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";


// Get all media assets for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    // Resolve storage URLs for assets that have storageId
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        if (asset.storageId) {
          const storageUrl = await ctx.storage.getUrl(asset.storageId);
          return { ...asset, storageUrl };
        }
        return { ...asset, storageUrl: null };
      })
    );
    
    return assetsWithUrls;
  },
});

// Get all non-text media assets globally
export const listAllNonText = query({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db
      .query("mediaAssets")
      .filter((q) => q.neq(q.field("mediaType"), "text"))
      .collect();
    
    // Resolve storage URLs for assets that have storageId
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        if (asset.storageId) {
          const storageUrl = await ctx.storage.getUrl(asset.storageId);
          return { ...asset, storageUrl };
        }
        return { ...asset, storageUrl: null };
      })
    );
    
    return assetsWithUrls;
  },
});

// Get only text media assets for a project
export const listTextByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("mediaType"), "text"))
      .collect();
    
    // Text assets don't have storageId, but add storageUrl: null for consistency
    return assets.map(asset => ({ ...asset, storageUrl: null }));
  },
});

// Get a single media asset
export const get = query({
  args: { assetId: v.id("mediaAssets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assetId);
  },
});

// Create a new media asset (for text or preparing for upload)
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    mediaType: v.union(
      v.literal("video"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("text")
    ),
    width: v.number(),
    height: v.number(),
    duration: v.number(),
    textProperties: v.optional(v.object({
      textContent: v.string(),
      fontSize: v.number(),
      fontFamily: v.string(),
      color: v.string(),
      textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
      fontWeight: v.union(v.literal("normal"), v.literal("bold")),
    })),
  },
  handler: async (ctx, args) => {
    const assetId = await ctx.db.insert("mediaAssets", {
      ...args,
      uploadStatus: args.mediaType === "text" ? "completed" : "uploading",
      uploadProgress: args.mediaType === "text" ? 100 : 0,
    });
    return assetId;
  },
});

// Update media asset (e.g., after upload completion)
export const update = mutation({
  args: {
    assetId: v.id("mediaAssets"),
    storageId: v.optional(v.string()),
    thumbnailId: v.optional(v.string()),
    uploadProgress: v.optional(v.number()),
    uploadStatus: v.optional(v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )),
    textProperties: v.optional(v.object({
      textContent: v.string(),
      fontSize: v.number(),
      fontFamily: v.string(),
      color: v.string(),
      textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
      fontWeight: v.union(v.literal("normal"), v.literal("bold")),
    })),
  },
  handler: async (ctx, args) => {
    const { assetId, ...updateData } = args;
    await ctx.db.patch(assetId, updateData);
  },
});

// Delete media asset and all its timeline clips
export const remove = mutation({
  args: { assetId: v.id("mediaAssets") },
  handler: async (ctx, args) => {
    // Delete all timeline clips using this asset
    const clips = await ctx.db
      .query("timelineClips")
      .filter((q) => q.eq(q.field("mediaAssetId"), args.assetId))
      .collect();
    
    for (const clip of clips) {
      // Delete keyframes for each clip
      const keyframes = await ctx.db
        .query("keyframes")
        .withIndex("by_clip", (q) => q.eq("clipId", clip._id))
        .collect();
      
      for (const keyframe of keyframes) {
        await ctx.db.delete(keyframe._id);
      }
      
      await ctx.db.delete(clip._id);
    }
    
    // Delete the media asset
    await ctx.db.delete(args.assetId);
  },
});

// Generate upload URL for media files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
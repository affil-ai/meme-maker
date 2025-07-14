import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// Action to handle file upload completion
export const completeUpload = action({
  args: {
    storageId: v.string(),
    assetId: v.id("mediaAssets"),
  },
  handler: async (ctx, args) => {
    // Update the media asset with the storage ID
    await ctx.runMutation(api.mediaAssets.update, {
      assetId: args.assetId,
      storageId: args.storageId,
      uploadStatus: "completed",
      uploadProgress: 100,
    });
  },
});

// Action to generate thumbnail for video
export const generateVideoThumbnail = action({
  args: {
    storageId: v.string(),
    assetId: v.id("mediaAssets"),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would:
    // 1. Download the video from storage
    // 2. Extract a frame (e.g., first frame or middle frame)
    // 3. Create a thumbnail image
    // 4. Upload the thumbnail to storage
    // 5. Update the media asset with the thumbnail ID
    
    // For now, we'll just mark the asset as having completed processing
    await ctx.runMutation(api.mediaAssets.update, {
      assetId: args.assetId,
      uploadStatus: "completed",
    });
  },
});

// Get storage URL for a file
export const getFileUrl = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get multiple file URLs (batch operation)
export const getFileUrls = mutation({
  args: {
    storageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (storageId) => {
        const url = await ctx.storage.getUrl(storageId);
        return { storageId, url };
      })
    );
    return urls;
  },
});

// Delete a file from storage
export const deleteFile = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
  },
});
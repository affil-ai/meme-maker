import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

// Record a new command in the history
export const recordCommand = internalMutation({
  args: {
    projectId: v.id("projects"),
    type: v.union(
      v.literal("createClip"),
      v.literal("updateClip"),
      v.literal("deleteClip"),
      v.literal("splitClip"),
      v.literal("createKeyframe"),
      v.literal("updateKeyframe"),
      v.literal("deleteKeyframe"),
      v.literal("createMediaAsset"),
      v.literal("deleteMediaAsset")
    ),
    description: v.string(),
    undoData: v.any(),
    redoData: v.any(),
  },
  handler: async (ctx, args) => {
    // Mark all "redo" commands as undone (they're no longer valid after a new action)
    const futureCommands = await ctx.db
      .query("commandHistory")
      .withIndex("by_project_undone_time", (q) =>
        q.eq("projectId", args.projectId).eq("isUndone", true)
      )
      .collect();
    
    // Delete future commands (can't redo after new action)
    for (const command of futureCommands) {
      await ctx.db.delete(command._id);
    }
    
    // Add new command
    await ctx.db.insert("commandHistory", {
      projectId: args.projectId,
      timestamp: Date.now(),
      type: args.type,
      description: args.description,
      undoData: args.undoData,
      redoData: args.redoData,
      isUndone: false,
    });
  },
});

// Get the last command that can be undone
export const getLastUndoableCommand = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const command = await ctx.db
      .query("commandHistory")
      .withIndex("by_project_undone_time", (q) =>
        q.eq("projectId", args.projectId).eq("isUndone", false)
      )
      .order("desc")
      .first();
    
    return command;
  },
});

// Get the last command that can be redone
export const getLastRedoableCommand = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const command = await ctx.db
      .query("commandHistory")
      .withIndex("by_project_undone_time", (q) =>
        q.eq("projectId", args.projectId).eq("isUndone", true)
      )
      .order("asc")
      .first();
    
    return command;
  },
});

// Undo the last command
export const undo = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const command = await ctx.db
      .query("commandHistory")
      .withIndex("by_project_undone_time", (q) =>
        q.eq("projectId", args.projectId).eq("isUndone", false)
      )
      .order("desc")
      .first();
    
    if (!command) {
      return { success: false, message: "Nothing to undo" };
    }
    
    // Execute the undo based on command type
    try {
      switch (command.type) {
        case "createClip":
          // Delete the created clip
          if (command.undoData.clipId) {
            await ctx.db.delete(command.undoData.clipId as Id<"timelineClips">);
          }
          break;
          
        case "deleteClip":
          // Recreate the deleted clip
          if (command.undoData.clipData) {
            const { _id, _creationTime, ...clipData } = command.undoData.clipData;
            await ctx.db.insert("timelineClips", clipData);
          }
          break;
          
        case "updateClip":
          // Restore previous clip state
          if (command.undoData.clipId && command.undoData.previousData) {
            await ctx.db.patch(
              command.undoData.clipId as Id<"timelineClips">,
              command.undoData.previousData
            );
          }
          break;
          
        case "splitClip":
          // Delete the two new clips and recreate the original
          if (command.undoData.newClipIds && command.undoData.originalClip) {
            for (const clipId of command.undoData.newClipIds) {
              await ctx.db.delete(clipId as Id<"timelineClips">);
            }
            const { _id, _creationTime, ...clipData } = command.undoData.originalClip;
            await ctx.db.insert("timelineClips", clipData);
          }
          break;
          
        case "createKeyframe":
          // Delete the created keyframe
          if (command.undoData.keyframeId) {
            await ctx.db.delete(command.undoData.keyframeId as Id<"keyframes">);
          }
          break;
          
        case "deleteKeyframe":
          // Recreate the deleted keyframe
          if (command.undoData.keyframeData) {
            const { _id, _creationTime, ...keyframeData } = command.undoData.keyframeData;
            await ctx.db.insert("keyframes", keyframeData);
          }
          break;
          
        case "updateKeyframe":
          // Restore previous keyframe state
          if (command.undoData.keyframeId && command.undoData.previousData) {
            await ctx.db.patch(
              command.undoData.keyframeId as Id<"keyframes">,
              command.undoData.previousData
            );
          }
          break;
          
        case "createMediaAsset":
          // Delete the created media asset and its clips
          if (command.undoData.mediaAssetId) {
            // First delete all clips using this media asset
            const clips = await ctx.db
              .query("timelineClips")
              .filter((q) => q.eq(q.field("mediaAssetId"), command.undoData.mediaAssetId))
              .collect();
            for (const clip of clips) {
              await ctx.db.delete(clip._id);
            }
            // Then delete the media asset
            await ctx.db.delete(command.undoData.mediaAssetId as Id<"mediaAssets">);
          }
          break;
          
        case "deleteMediaAsset":
          // Recreate the deleted media asset
          if (command.undoData.mediaAssetData) {
            const { _id, _creationTime, ...assetData } = command.undoData.mediaAssetData;
            await ctx.db.insert("mediaAssets", assetData);
          }
          break;
      }
      
      // Mark command as undone
      await ctx.db.patch(command._id, { isUndone: true });
      
      // Update project's last modified time
      await ctx.db.patch(args.projectId, {
        lastModified: Date.now(),
      });
      
      return { success: true, message: `Undid: ${command.description}` };
    } catch (error) {
      console.error("Undo failed:", error);
      return { success: false, message: "Failed to undo command" };
    }
  },
});

// Redo the last undone command
export const redo = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const command = await ctx.db
      .query("commandHistory")
      .withIndex("by_project_undone_time", (q) =>
        q.eq("projectId", args.projectId).eq("isUndone", true)
      )
      .order("asc")
      .first();
    
    if (!command) {
      return { success: false, message: "Nothing to redo" };
    }
    
    // Execute the redo based on command type
    try {
      switch (command.type) {
        case "createClip":
          // Recreate the clip
          if (command.redoData.clipData) {
            const { _id, _creationTime, ...clipData } = command.redoData.clipData;
            await ctx.db.insert("timelineClips", clipData);
          }
          break;
          
        case "deleteClip":
          // Delete the clip again
          if (command.redoData.clipId) {
            await ctx.db.delete(command.redoData.clipId as Id<"timelineClips">);
          }
          break;
          
        case "updateClip":
          // Apply the update again
          if (command.redoData.clipId && command.redoData.updateData) {
            await ctx.db.patch(
              command.redoData.clipId as Id<"timelineClips">,
              command.redoData.updateData
            );
          }
          break;
          
        case "splitClip":
          // Delete original and create the two split clips
          if (command.redoData.originalClipId && command.redoData.newClips) {
            await ctx.db.delete(command.redoData.originalClipId as Id<"timelineClips">);
            for (const clipData of command.redoData.newClips) {
              const { _id, _creationTime, ...data } = clipData;
              await ctx.db.insert("timelineClips", data);
            }
          }
          break;
          
        case "createKeyframe":
          // Recreate the keyframe
          if (command.redoData.keyframeData) {
            const { _id, _creationTime, ...keyframeData } = command.redoData.keyframeData;
            await ctx.db.insert("keyframes", keyframeData);
          }
          break;
          
        case "deleteKeyframe":
          // Delete the keyframe again
          if (command.redoData.keyframeId) {
            await ctx.db.delete(command.redoData.keyframeId as Id<"keyframes">);
          }
          break;
          
        case "updateKeyframe":
          // Apply the update again
          if (command.redoData.keyframeId && command.redoData.updateData) {
            await ctx.db.patch(
              command.redoData.keyframeId as Id<"keyframes">,
              command.redoData.updateData
            );
          }
          break;
          
        case "createMediaAsset":
          // Recreate the media asset
          if (command.redoData.mediaAssetData) {
            const { _id, _creationTime, ...assetData } = command.redoData.mediaAssetData;
            await ctx.db.insert("mediaAssets", assetData);
          }
          break;
          
        case "deleteMediaAsset":
          // Delete the media asset and its clips again
          if (command.redoData.mediaAssetId) {
            // First delete all clips using this media asset
            const clips = await ctx.db
              .query("timelineClips")
              .filter((q) => q.eq(q.field("mediaAssetId"), command.redoData.mediaAssetId))
              .collect();
            for (const clip of clips) {
              await ctx.db.delete(clip._id);
            }
            // Then delete the media asset
            await ctx.db.delete(command.redoData.mediaAssetId as Id<"mediaAssets">);
          }
          break;
      }
      
      // Mark command as not undone
      await ctx.db.patch(command._id, { isUndone: false });
      
      // Update project's last modified time
      await ctx.db.patch(args.projectId, {
        lastModified: Date.now(),
      });
      
      return { success: true, message: `Redid: ${command.description}` };
    } catch (error) {
      console.error("Redo failed:", error);
      return { success: false, message: "Failed to redo command" };
    }
  },
});

// Get command history for a project
export const getCommandHistory = query({
  args: { 
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("commandHistory")
      .withIndex("by_project_and_time", (q) =>
        q.eq("projectId", args.projectId)
      )
      .order("desc");
    
    if (args.limit) {
      return await query.take(args.limit);
    }
    
    return await query.collect();
  },
});
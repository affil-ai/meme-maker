import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all projects
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .order("desc")
      .collect();
  },
});

// Get a single project by ID
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// Create a new project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    settings: v.object({
      fps: v.number(),
      resolution: v.object({
        width: v.number(),
        height: v.number(),
      }),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      settings: args.settings,
      isPublic: false,
      lastModified: Date.now(),
    });
    return projectId;
  },
});

// Update project
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    settings: v.optional(v.object({
      fps: v.number(),
      resolution: v.object({
        width: v.number(),
        height: v.number(),
      }),
      duration: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updateData } = args;
    await ctx.db.patch(projectId, {
      ...updateData,
      lastModified: Date.now(),
    });
  },
});

// Delete project and all associated data
export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Delete all timeline clips
    const clips = await ctx.db
      .query("timelineClips")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
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
    
    // Delete all media assets
    const mediaAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    for (const asset of mediaAssets) {
      await ctx.db.delete(asset._id);
    }
    
    // Delete all render jobs
    const renderJobs = await ctx.db
      .query("renderJobs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    for (const job of renderJobs) {
      await ctx.db.delete(job._id);
    }
    
    // Finally, delete the project
    await ctx.db.delete(args.projectId);
  },
});

// Search projects by name
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withSearchIndex("search_name", (q) => 
        q.search("name", args.searchTerm)
      )
      .collect();
  },
});
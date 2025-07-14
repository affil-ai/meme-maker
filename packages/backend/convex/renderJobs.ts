import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all render jobs for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("renderJobs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

// Get a specific render job
export const get = query({
  args: { jobId: v.id("renderJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// Get active render jobs
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const queued = await ctx.db
      .query("renderJobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
    
    const processing = await ctx.db
      .query("renderJobs")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();
    
    return [...queued, ...processing];
  },
});

// Create a new render job
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    settings: v.object({
      format: v.string(),
      quality: v.string(),
      resolution: v.object({
        width: v.number(),
        height: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("renderJobs", {
      projectId: args.projectId,
      status: "queued",
      settings: args.settings,
    });
    return jobId;
  },
});

// Update render job status
export const updateStatus = mutation({
  args: {
    jobId: v.id("renderJobs"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    outputUrl: v.optional(v.string()),
    storageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updateData } = args;
    
    const updates: Record<string, unknown> = {
      status: updateData.status,
    };
    
    if (updateData.progress !== undefined) {
      updates.progress = updateData.progress;
    }
    
    if (updateData.outputUrl !== undefined) {
      updates.outputUrl = updateData.outputUrl;
    }
    
    if (updateData.storageId !== undefined) {
      updates.storageId = updateData.storageId;
    }
    
    if (updateData.error !== undefined) {
      updates.error = updateData.error;
    }
    
    if (updateData.status === "processing" && !updates.startedAt) {
      updates.startedAt = Date.now();
    }
    
    if (updateData.status === "completed" || updateData.status === "failed") {
      updates.completedAt = Date.now();
    }
    
    await ctx.db.patch(jobId, updates);
  },
});

// Cancel a render job
export const cancel = mutation({
  args: { jobId: v.id("renderJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Render job not found");
    
    if (job.status !== "queued" && job.status !== "processing") {
      throw new Error("Can only cancel queued or processing jobs");
    }
    
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: "Cancelled by user",
      completedAt: Date.now(),
    });
  },
});

// Clean up old completed/failed render jobs
export const cleanupOld = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = (args.olderThanDays || 7) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - daysAgo;
    
    // Get completed jobs
    const completedJobs = await ctx.db
      .query("renderJobs")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) => q.lt(q.field("completedAt"), cutoffTime))
      .collect();
    
    // Get failed jobs
    const failedJobs = await ctx.db
      .query("renderJobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .filter((q) => q.lt(q.field("completedAt"), cutoffTime))
      .collect();
    
    const jobsToDelete = [...completedJobs, ...failedJobs];
    
    for (const job of jobsToDelete) {
      await ctx.db.delete(job._id);
    }
    
    return jobsToDelete.length;
  },
});
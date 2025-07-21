import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import {
  createTimelineClip,
  getTimelineClips,
  getClipsByTrack,
  getClipsInRange,
  getTimelineClip,
  updateTimelineClip,
  deleteTimelineClip,
  batchUpdateClips,
  splitClip,
} from "~/api/timelineClips";

export const timelineClipsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        mediaAssetId: z.string().uuid(),
        trackIndex: z.number().int(),
        startTime: z.number(),
        duration: z.number(),
        trimStart: z.number().optional(),
        trimEnd: z.number().optional(),
        position: z.object({ x: z.number(), y: z.number() }),
        size: z.object({ width: z.number(), height: z.number() }),
        rotation: z.number().default(0),
        opacity: z.number().min(0).max(1).default(1),
        scale: z.number().default(1),
        playbackSpeed: z.number().min(0.25).max(4).default(1),
        zIndex: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      return await createTimelineClip(input);
    }),

  list: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await getTimelineClips(input.projectId);
    }),

  listByTrack: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        trackIndex: z.number().int(),
      })
    )
    .query(async ({ input }) => {
      return await getClipsByTrack(input.projectId, input.trackIndex);
    }),

  listInRange: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        startTime: z.number(),
        endTime: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await getClipsInRange(input.projectId, input.startTime, input.endTime);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const clip = await getTimelineClip(input.id);
      if (!clip) {
        throw new Error("Timeline clip not found");
      }
      return clip;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          trackIndex: z.number().int().optional(),
          startTime: z.number().optional(),
          duration: z.number().optional(),
          trimStart: z.number().optional(),
          trimEnd: z.number().optional(),
          position: z.object({ x: z.number(), y: z.number() }).optional(),
          size: z.object({ width: z.number(), height: z.number() }).optional(),
          rotation: z.number().optional(),
          opacity: z.number().min(0).max(1).optional(),
          scale: z.number().optional(),
          playbackSpeed: z.number().min(0.25).max(4).optional(),
          zIndex: z.number().int().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return await updateTimelineClip(input.id, input.data);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await deleteTimelineClip(input.id);
      return { success: true };
    }),

  batchUpdate: publicProcedure
    .input(
      z.array(
        z.object({
          id: z.string().uuid(),
          data: z.object({
            trackIndex: z.number().int().optional(),
            startTime: z.number().optional(),
            duration: z.number().optional(),
            trimStart: z.number().optional(),
            trimEnd: z.number().optional(),
            position: z.object({ x: z.number(), y: z.number() }).optional(),
            size: z.object({ width: z.number(), height: z.number() }).optional(),
            rotation: z.number().optional(),
            opacity: z.number().min(0).max(1).optional(),
            scale: z.number().optional(),
            playbackSpeed: z.number().min(0.25).max(4).optional(),
            zIndex: z.number().int().optional(),
          }),
        })
      )
    )
    .mutation(async ({ input }) => {
      return await batchUpdateClips(input);
    }),

  split: publicProcedure
    .input(
      z.object({
        clipId: z.string().uuid(),
        splitTime: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await splitClip(input.clipId, input.splitTime);
    }),
});
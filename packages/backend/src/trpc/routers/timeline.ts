import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import {
  getTimelineData,
  getTrackCount,
  createClipFromDrop,
  moveClipToTrack,
  deleteClipsByMediaAsset,
} from "../../api/timeline";
import { splitClip } from "../../api/timelineClips";

export const timelineRouter = createTRPCRouter({
  getTimelineData: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await getTimelineData(input.projectId);
    }),

  getTrackCount: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await getTrackCount(input.projectId);
    }),

  createClipFromDrop: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        mediaAssetId: z.string().uuid(),
        trackIndex: z.number().int().min(0),
        startTime: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      return await createClipFromDrop(input);
    }),

  splitClip: publicProcedure
    .input(
      z.object({
        clipId: z.string().uuid(),
        splitTime: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      return await splitClip(input.clipId, input.splitTime);
    }),

  moveClipToTrack: publicProcedure
    .input(
      z.object({
        clipId: z.string().uuid(),
        newTrackIndex: z.number().int().min(0),
        newStartTime: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await moveClipToTrack(input);
    }),

  deleteClipsByMediaAsset: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        mediaAssetId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      return await deleteClipsByMediaAsset(input);
    }),
});
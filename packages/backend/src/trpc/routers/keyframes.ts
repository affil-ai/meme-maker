import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import {
  createKeyframe,
  getKeyframesByClip,
  getKeyframe,
  updateKeyframe,
  deleteKeyframe,
  insertKeyframeSchema,
} from "../../api/keyframes";

export const keyframesRouter = createTRPCRouter({
  create: publicProcedure
    .input(insertKeyframeSchema)
    .mutation(async ({ input }) => {
      return await createKeyframe(input);
    }),

  listByClip: publicProcedure
    .input(z.object({ clipId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await getKeyframesByClip(input.clipId);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const keyframe = await getKeyframe(input.id);
      if (!keyframe) {
        throw new Error("Keyframe not found");
      }
      return keyframe;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: insertKeyframeSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateKeyframe(input.id, input.data);
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await deleteKeyframe(input.id);
      return { success: true };
    }),
});
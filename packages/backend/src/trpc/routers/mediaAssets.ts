import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import {
  createMediaAsset,
  getMediaAssets,
  getMediaAssetsByType,
  getMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  deleteMediaAssets,
  insertMediaAssetSchema,
  mediaTypeEnum,
} from "../../api/mediaAssets";

export const mediaAssetsRouter = createTRPCRouter({
  create: publicProcedure
    .input(insertMediaAssetSchema)
    .mutation(async ({ input }) => {
      return await createMediaAsset(input);
    }),

  list: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await getMediaAssets(input.projectId);
    }),

  listByType: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        mediaType: mediaTypeEnum,
      })
    )
    .query(async ({ input }) => {
      return await getMediaAssetsByType(input.projectId, input.mediaType);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const asset = await getMediaAsset(input.id);
      if (!asset) {
        throw new Error("Media asset not found");
      }
      return asset;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: insertMediaAssetSchema.partial()
      })
    )
    .mutation(async ({ input }) => {
      return await updateMediaAsset(input.id, input.data);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await deleteMediaAsset(input.id);
      return { success: true };
    }),

  deleteBatch: publicProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      await deleteMediaAssets(input.ids);
      return { success: true };
    }),
});
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
} from "~/api/mediaAssets";

const mediaTypeEnum = z.enum(["video", "image", "audio", "text"]);
const uploadStatusEnum = z.enum(["uploading", "processing", "completed", "failed"]);

export const mediaAssetsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string(),
        mediaType: mediaTypeEnum,
        fileKey: z.string().optional(),
        thumbnailKey: z.string().optional(),
        width: z.number().int(),
        height: z.number().int(),
        duration: z.number(),
        textProperties: z.object({
          textContent: z.string(),
          fontSize: z.number(),
          fontFamily: z.string(),
          color: z.string(),
          textAlign: z.enum(["left", "center", "right"]),
          fontWeight: z.enum(["normal", "bold"]),
        }).optional(),
        uploadProgress: z.number().int().min(0).max(100).optional(),
        uploadStatus: uploadStatusEnum.default("uploading"),
      })
    )
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
        data: z.object({
          name: z.string().optional(),
          mediaType: mediaTypeEnum.optional(),
          fileKey: z.string().optional(),
          thumbnailKey: z.string().optional(),
          width: z.number().int().optional(),
          height: z.number().int().optional(),
          duration: z.number().optional(),
          textProperties: z.object({
            textContent: z.string(),
            fontSize: z.number(),
            fontFamily: z.string(),
            color: z.string(),
            textAlign: z.enum(["left", "center", "right"]),
            fontWeight: z.enum(["normal", "bold"]),
          }).optional(),
          uploadProgress: z.number().int().min(0).max(100).optional(),
          uploadStatus: uploadStatusEnum.optional(),
        }),
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
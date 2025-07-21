import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import {
  getFileUrls,
  completeUpload,
} from "../../api/fileStorage";

export const fileStorageRouter = createTRPCRouter({
  getFileUrls: publicProcedure
    .input(z.object({ fileKeys: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return await getFileUrls(input.fileKeys);
    }),

  completeUpload: publicProcedure
    .input(
      z.object({
        fileKey: z.string(),
        uploadedBytes: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await completeUpload(input);
    }),
});
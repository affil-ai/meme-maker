import { db } from "../db";
import { mediaAssets, mediaTypeEnum as dbMediaTypeEnum, type MediaAsset } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { createInsertSchema } from "drizzle-zod";

export const insertMediaAssetSchema = createInsertSchema(mediaAssets);
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export const mediaTypeEnum = z.enum(dbMediaTypeEnum.enumValues);


// Create a new media asset
export async function createMediaAsset(data: InsertMediaAsset) {
  const [asset] = await db.insert(mediaAssets).values(data).returning();
  return asset;
}

// Get all media assets for a project
export async function getMediaAssets(projectId: string) {
  return await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.projectId, projectId));
}

// Get media assets by type
export async function getMediaAssetsByType(projectId: string, mediaType: MediaAsset["mediaType"]) {
  return await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.projectId, projectId),
        eq(mediaAssets.mediaType, mediaType)
      )
    );
}

// Get a single media asset
export async function getMediaAsset(id: string) {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id));
  
  return asset;
}

// Update media asset (e.g., upload progress)
export async function updateMediaAsset(id: string, data: Partial<Omit<MediaAsset, "id" | "createdAt">>) {
  const [updated] = await db
    .update(mediaAssets)
    .set(data)
    .where(eq(mediaAssets.id, id))
    .returning();
  
  return updated;
}

// Delete a media asset
export async function deleteMediaAsset(id: string) {
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}

// Batch delete media assets
export async function deleteMediaAssets(ids: string[]) {
  for (const id of ids) {
    await deleteMediaAsset(id);
  }
}
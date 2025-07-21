import { db } from "../db";
import { keyframes, type Keyframe } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod/v4";
import { createInsertSchema } from "drizzle-zod";

export const insertKeyframeSchema = createInsertSchema(keyframes);
export type InsertKeyframe = z.infer<typeof insertKeyframeSchema>;

// Create a new keyframe
export async function createKeyframe(data: InsertKeyframe) {
  const [keyframe] = await db.insert(keyframes).values(data).returning();
  return keyframe;
}

// Get all keyframes for a clip
export async function getKeyframesByClip(clipId: string) {
  return await db
    .select()
    .from(keyframes)
    .where(eq(keyframes.clipId, clipId))
    .orderBy(asc(keyframes.time));
}

// Get a single keyframe
export async function getKeyframe(id: string) {
  const [keyframe] = await db
    .select()
    .from(keyframes)
    .where(eq(keyframes.id, id));
  
  return keyframe;
}

// Update a keyframe
export async function updateKeyframe(id: string, data: Partial<Omit<Keyframe, "id" | "createdAt">>) {
  const [updated] = await db
    .update(keyframes)
    .set(data)
    .where(eq(keyframes.id, id))
    .returning();
  
  return updated;
}

// Delete a keyframe
export async function deleteKeyframe(id: string) {
  await db.delete(keyframes).where(eq(keyframes.id, id));
}

// Delete all keyframes for a clip
export async function deleteKeyframesByClip(clipId: string) {
  await db.delete(keyframes).where(eq(keyframes.clipId, clipId));
}

// Batch create keyframes
export async function createKeyframes(data: InsertKeyframe[]) {
  if (data.length === 0) return [];
  
  const created = await db.insert(keyframes).values(data).returning();
  return created;
}

// Batch update keyframes
export async function batchUpdateKeyframes(updates: Array<{ id: string; data: Partial<Omit<Keyframe, "id" | "createdAt">> }>) {
  const results: Keyframe[] = [];
  
  for (const { id, data } of updates) {
    const updated = await updateKeyframe(id, data);
    results.push(updated);
  }
  
  return results;
}
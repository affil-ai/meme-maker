import { db } from "../db";
import { timelineClips, type NewTimelineClip, type TimelineClip } from "../db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";

// Create a new timeline clip
export async function createTimelineClip(data: Omit<NewTimelineClip, "id" | "createdAt">) {
  const [clip] = await db.insert(timelineClips).values(data).returning();
  return clip;
}

// Get all clips for a project
export async function getTimelineClips(projectId: string) {
  return await db
    .select()
    .from(timelineClips)
    .where(eq(timelineClips.projectId, projectId))
    .orderBy(asc(timelineClips.startTime), asc(timelineClips.trackIndex));
}

// Get clips by track
export async function getClipsByTrack(projectId: string, trackIndex: number) {
  return await db
    .select()
    .from(timelineClips)
    .where(
      and(
        eq(timelineClips.projectId, projectId),
        eq(timelineClips.trackIndex, trackIndex)
      )
    )
    .orderBy(asc(timelineClips.startTime));
}

// Get clips in time range
export async function getClipsInRange(projectId: string, startTime: number, endTime: number) {
  return await db
    .select()
    .from(timelineClips)
    .where(
      and(
        eq(timelineClips.projectId, projectId),
        gte(timelineClips.startTime, startTime),
        lte(timelineClips.startTime, endTime)
      )
    );
}

// Get a single clip
export async function getTimelineClip(id: string) {
  const [clip] = await db
    .select()
    .from(timelineClips)
    .where(eq(timelineClips.id, id));
  
  return clip;
}

// Update a timeline clip
export async function updateTimelineClip(id: string, data: Partial<Omit<TimelineClip, "id" | "createdAt">>) {
  const [updated] = await db
    .update(timelineClips)
    .set(data)
    .where(eq(timelineClips.id, id))
    .returning();
  
  return updated;
}

// Delete a timeline clip
export async function deleteTimelineClip(id: string) {
  await db.delete(timelineClips).where(eq(timelineClips.id, id));
}

// Batch update clips (useful for timeline operations)
export async function batchUpdateClips(updates: Array<{ id: string; data: Partial<Omit<TimelineClip, "id" | "createdAt">> }>) {
  const results: TimelineClip[] = [];
  
  for (const { id, data } of updates) {
    const updated = await updateTimelineClip(id, data);
    results.push(updated);
  }
  
  return results;
}

// Split a clip at a specific time
export async function splitClip(clipId: string, splitTime: number) {
  const originalClip = await getTimelineClip(clipId);
  if (!originalClip) throw new Error("Clip not found");

  // Create the second part of the split
  const { id, createdAt, ...clipData } = originalClip;
  const secondClip = await createTimelineClip({
    ...clipData,
    startTime: originalClip.startTime + splitTime,
    duration: originalClip.duration - splitTime,
    trimStart: (originalClip.trimStart || 0) + splitTime,
  });

  // Update the first part
  const firstClip = await updateTimelineClip(clipId, {
    duration: splitTime,
  });

  return { firstClip, secondClip };
}
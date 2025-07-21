import { db } from "../db";
import { timelineClips, mediaAssets, keyframes } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { createTimelineClip, deleteTimelineClip, updateTimelineClip } from "./timelineClips";

// Get complete timeline data for a project
export async function getTimelineData(projectId: string) {
  // Get all clips with their media assets
  const clips = await db
    .select({
      clip: timelineClips,
      mediaAsset: mediaAssets,
    })
    .from(timelineClips)
    .innerJoin(mediaAssets, eq(timelineClips.mediaAssetId, mediaAssets.id))
    .where(eq(timelineClips.projectId, projectId))
    .orderBy(timelineClips.startTime, timelineClips.trackIndex);

  // Get all keyframes for these clips
  const clipIds = clips.map(c => c.clip.id);
  const allKeyframes = clipIds.length > 0 
    ? await db
        .select()
        .from(keyframes)
        .where(sql`${keyframes.clipId} = ANY(${clipIds})`)
        .orderBy(keyframes.time)
    : [];

  // Group keyframes by clip
  const keyframesByClip = allKeyframes.reduce((acc, kf) => {
    if (!acc[kf.clipId]) acc[kf.clipId] = [];
    acc[kf.clipId].push(kf);
    return acc;
  }, {} as Record<string, typeof allKeyframes>);

  // Combine data
  return clips.map(({ clip, mediaAsset }) => ({
    ...clip,
    mediaAsset,
    keyframes: keyframesByClip[clip.id] || [],
  }));
}

// Get track count for a project
export async function getTrackCount(projectId: string) {
  const result = await db
    .select({
      maxTrack: sql<number>`COALESCE(MAX(${timelineClips.trackIndex}), -1)`,
    })
    .from(timelineClips)
    .where(eq(timelineClips.projectId, projectId));

  return (result[0]?.maxTrack ?? -1) + 1;
}

// Create clip from drag and drop
export async function createClipFromDrop(data: {
  projectId: string;
  mediaAssetId: string;
  trackIndex: number;
  startTime: number;
}) {
  // Get the media asset to determine duration
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, data.mediaAssetId));

  if (!asset) {
    throw new Error("Media asset not found");
  }

  // Create the clip with default properties
  return await createTimelineClip({
    projectId: data.projectId,
    mediaAssetId: data.mediaAssetId,
    trackIndex: data.trackIndex,
    startTime: data.startTime,
    duration: asset.duration || 5, // Default 5 seconds for images
    position: { x: 0, y: 0 },
    size: { width: asset.width, height: asset.height },
    zIndex: 0,
  });
}

// Move clip to a different track
export async function moveClipToTrack(data: {
  clipId: string;
  newTrackIndex: number;
  newStartTime?: number;
}) {
  const updateData: any = { trackIndex: data.newTrackIndex };
  if (data.newStartTime !== undefined) {
    updateData.startTime = data.newStartTime;
  }

  return await updateTimelineClip(data.clipId, updateData);
}

// Delete all clips that use a specific media asset
export async function deleteClipsByMediaAsset(data: {
  projectId: string;
  mediaAssetId: string;
}) {
  // Get all clips using this media asset
  const clipsToDelete = await db
    .select()
    .from(timelineClips)
    .where(
      and(
        eq(timelineClips.projectId, data.projectId),
        eq(timelineClips.mediaAssetId, data.mediaAssetId)
      )
    );

  // Delete each clip (this will cascade delete keyframes)
  for (const clip of clipsToDelete) {
    await deleteTimelineClip(clip.id);
  }

  return { deletedCount: clipsToDelete.length };
}
import type { FunctionReturnType } from "convex/server";
import type { api } from "@meme-maker/backend";
import { FPS, type VideoData, type TimelineDataItem } from "@meme-maker/video-compositions";

type TimelineData = FunctionReturnType<typeof api.timeline.getTimelineData>;

export function convertTimelineDataToVideoData(
  timelineData: TimelineData,
  pixelsPerSecond: number
): VideoData | null {
  if (!timelineData) {
    return null;
  }

  const timelineItem: TimelineDataItem = {
    scrubbers: timelineData.clips.map((clip) => {
      if (!clip.mediaAsset) {
        throw new Error(`Clip ${clip._id} has no media asset`);
      }

      return {
        id: clip._id,
        mediaType: clip.mediaAsset.mediaType,
        mediaUrl: clip.mediaAsset.storageUrl || null,
        mediaName: clip.mediaAsset.name,
        media_width: clip.mediaAsset.width,
        media_height: clip.mediaAsset.height,
        text: clip.mediaAsset.textProperties || null,
        startTime: clip.startTime,
        endTime: clip.startTime + clip.duration,
        duration: clip.duration,
        trackIndex: clip.trackIndex,
        left_player: clip.position.x,
        top_player: clip.position.y,
        width_player: clip.size.width,
        height_player: clip.size.height,
        trimBefore: clip.trimStart ? Math.round(clip.trimStart * FPS) : null,
        trimAfter: clip.trimEnd ? Math.round(clip.trimEnd * FPS) : null,
        rotation: clip.rotation,
        playbackSpeed: clip.playbackSpeed,
        keyframes: clip.keyframes?.map(kf => ({
          id: kf._id,
          time: kf.time,
          properties: kf.properties,
        })),
      };
    }),
  };

  return {
    timeline: [timelineItem],
    videoDimensions: {
      width: timelineData.projectSettings.resolution.width,
      height: timelineData.projectSettings.resolution.height,
    },
  };
}
import { VideoData } from "@meme-maker/video-compositions";


export function parseVideoDataForAI(data: VideoData): string {
  const { timeline, videoDimensions } = data;
  const transformedTimeline = timeline.map(track => ({
    ...track,
    scrubbers: track.scrubbers.map(scrubber => {
        const { left_player, top_player, width_player, height_player, ...rest } = scrubber;
        return {
          ...rest,
          // Rename player coordinates to match keyframe property names
          position: {
            x: left_player,
            y: top_player
          },
          size: {
            width: width_player,
            height: height_player
          }
        };
      })
  }));
  const timelineDataWithDimensions = {
    timeline: transformedTimeline,
    videoDimensions
  };
  return JSON.stringify(timelineDataWithDimensions, null, 2);
}
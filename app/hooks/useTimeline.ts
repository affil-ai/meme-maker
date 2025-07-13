import { useCallback } from "react";
import {
  PIXELS_PER_SECOND,
  type TimelineDataItem,
  type MediaBinItem,
} from "../components/timeline/types";
import { useTimelineStore } from "../stores/useTimelineStore";

export const useTimeline = () => {
  const {
    tracks,
    timelineWidth,
    zoomLevel,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleAddTrack,
    handleDeleteTrack,
    handleUpdateScrubber,
    handleDeleteScrubber,
    handleDeleteScrubbersByMediaBinId,
    handleAddScrubberToTrack,
    handleDropOnTrack: storeHandleDropOnTrack,
    handleDropOnNewTrack: storeHandleDropOnNewTrack,
    handleSplitScrubberAtRuler: storeHandleSplitScrubberAtRuler,
    getAllScrubbers,
    expandTimeline: storeExpandTimeline,
  } = useTimelineStore();

  const timeline = { tracks };

  const getPixelsPerSecond = useCallback(() => {
    return PIXELS_PER_SECOND * zoomLevel;
  }, [zoomLevel]);

  const getTimelineData = useCallback((): TimelineDataItem[] => {
    const pixelsPerSecond = getPixelsPerSecond();
    const timelineData = [
      {
        scrubbers: tracks.flatMap((track) =>
          track.scrubbers.map((scrubber) => ({
            id: scrubber.id,
            mediaType: scrubber.mediaType,
            mediaUrlLocal: scrubber.mediaUrlLocal,
            mediaUrlRemote: scrubber.mediaUrlRemote,
            width: scrubber.width,
            startTime: scrubber.left / pixelsPerSecond,
            endTime: (scrubber.left + scrubber.width) / pixelsPerSecond,
            duration: scrubber.width / pixelsPerSecond,
            trackId: track.id,
            trackIndex: scrubber.y || 0,
            media_width: scrubber.media_width,
            media_height: scrubber.media_height,
            text: scrubber.text,
            left_player: scrubber.left_player,
            top_player: scrubber.top_player,
            width_player: scrubber.width_player,
            height_player: scrubber.height_player,
            trimBefore: scrubber.trimBefore,
            trimAfter: scrubber.trimAfter,
            rotation: scrubber.rotation,
            playbackSpeed: scrubber.playbackSpeed,
          }))
        ),
      },
    ];

    return timelineData;
  }, [tracks, getPixelsPerSecond]);

  const expandTimeline = useCallback(
    (containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (!containerRef.current) return false;

      const containerWidth = containerRef.current.offsetWidth;
      const currentScrollLeft = containerRef.current.scrollLeft;
      const scrollRight = currentScrollLeft + containerWidth;

      return storeExpandTimeline(scrollRight);
    },
    [storeExpandTimeline]
  );

  const handleDropOnTrack = useCallback(
    (item: MediaBinItem, trackId: string, dropLeftPx: number) => {
      const pixelsPerSecond = getPixelsPerSecond();
      storeHandleDropOnTrack(item, trackId, dropLeftPx, pixelsPerSecond);
    },
    [getPixelsPerSecond, storeHandleDropOnTrack]
  );

  const handleDropOnNewTrack = useCallback(
    (item: MediaBinItem, dropLeftPx: number, trackCount: number) => {
      const pixelsPerSecond = getPixelsPerSecond();
      storeHandleDropOnNewTrack(item, dropLeftPx, trackCount, pixelsPerSecond);
    },
    [getPixelsPerSecond, storeHandleDropOnNewTrack]
  );

  const handleSplitScrubberAtRuler = useCallback((rulerPositionPx: number, selectedScrubberId: string | null) => {
    const pixelsPerSecond = getPixelsPerSecond();
    return storeHandleSplitScrubberAtRuler(rulerPositionPx, selectedScrubberId, pixelsPerSecond);
  }, [getPixelsPerSecond, storeHandleSplitScrubberAtRuler]);

  return {
    timeline,
    timelineWidth,
    zoomLevel,
    getPixelsPerSecond,
    getTimelineData,
    expandTimeline,
    handleAddTrack,
    handleDeleteTrack,
    getAllScrubbers,
    handleUpdateScrubber,
    handleDeleteScrubber,
    handleDeleteScrubbersByMediaBinId,
    handleAddScrubberToTrack,
    handleDropOnTrack,
    handleDropOnNewTrack,
    handleSplitScrubberAtRuler,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  };
};
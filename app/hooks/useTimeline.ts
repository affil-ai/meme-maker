import { useCallback, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useProject } from "~/contexts/ProjectContext";
import {
  PIXELS_PER_SECOND,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  type TimelineDataItem,
  type MediaBinItem,
  type ScrubberState,
  type TrackState,
  type TimelineState,
  FPS,
} from "../components/timeline/types";
import { generateUUID } from "../utils/uuid";
import { toast } from "sonner";

export const useTimeline = () => {
  const { projectId } = useProject();
  
  // Local state for UI-specific data
  const [timelineWidth, setTimelineWidth] = useState(2000);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  
  // Convex queries
  const timelineData = useQuery(
    api.timeline.getTimelineData,
    projectId ? { projectId } : "skip"
  );
  const trackCount = useQuery(
    api.timeline.getTrackCount,
    projectId ? { projectId } : "skip"
  );
  
  // Convex mutations
  const createClip = useMutation(api.timeline.createClipFromDrop);
  const updateClip = useMutation(api.timelineClips.update);
  const deleteClip = useMutation(api.timelineClips.remove);
  const splitClipMutation = useMutation(api.timeline.splitClip);
  const moveClipToTrack = useMutation(api.timeline.moveClipToTrack);
  const deleteClipsByMediaAsset = useMutation(api.timeline.deleteClipsByMediaAsset);
  const createKeyframe = useMutation(api.keyframes.create);
  const updateKeyframe = useMutation(api.keyframes.update);
  const deleteKeyframe = useMutation(api.keyframes.remove);
  
  const getPixelsPerSecond = useCallback(() => {
    return PIXELS_PER_SECOND * zoomLevel;
  }, [zoomLevel]);
  
  // Convert Convex data to legacy format for compatibility
  const timeline = useMemo((): TimelineState => {
    if (!timelineData || !trackCount) {
      return { tracks: [
        { id: 'track-1', scrubbers: [] },
        { id: 'track-2', scrubbers: [] },
        { id: 'track-3', scrubbers: [] },
      ]};
    }
    
    const pixelsPerSecond = getPixelsPerSecond();
    const tracks: TrackState[] = [];
    
    // Initialize tracks
    for (let i = 0; i < Math.max(3, trackCount); i++) {
      tracks.push({
        id: `track-${i + 1}`,
        scrubbers: [],
      });
    }
    
    // Convert clips to scrubbers
    timelineData.clips.forEach((clip) => {
      if (!clip.mediaAsset) return;
      
      const scrubber: ScrubberState = {
        id: clip._id,
        left: clip.startTime * pixelsPerSecond,
        width: clip.duration * pixelsPerSecond,
        mediaType: clip.mediaAsset.mediaType,
        mediaUrlLocal: null, // We'll use remote URLs from Convex
        mediaUrlRemote: clip.mediaAsset.storageId || null,
        y: clip.trackIndex,
        name: clip.mediaAsset.name,
        durationInSeconds: clip.duration,
        media_width: clip.mediaAsset.width,
        media_height: clip.mediaAsset.height,
        text: clip.mediaAsset.textProperties || null,
        sourceMediaBinId: clip.mediaAssetId,
        left_player: clip.position.x,
        top_player: clip.position.y,
        width_player: clip.size.width,
        height_player: clip.size.height,
        is_dragging: false,
        uploadProgress: null,
        isUploading: false,
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
      
      if (tracks[clip.trackIndex]) {
        tracks[clip.trackIndex].scrubbers.push(scrubber);
      }
    });
    
    return { tracks };
  }, [timelineData, trackCount, getPixelsPerSecond]);
  
  const getAllScrubbers = useCallback((): ScrubberState[] => {
    return timeline.tracks.flatMap(track => track.scrubbers);
  }, [timeline]);
  
  const getTimelineData = useCallback((): TimelineDataItem[] => {
    const pixelsPerSecond = getPixelsPerSecond();
    return [{
      scrubbers: getAllScrubbers().map(scrubber => ({
        id: scrubber.id,
        mediaType: scrubber.mediaType,
        mediaUrlLocal: scrubber.mediaUrlLocal,
        mediaUrlRemote: scrubber.mediaUrlRemote,
        media_width: scrubber.media_width,
        media_height: scrubber.media_height,
        text: scrubber.text,
        startTime: scrubber.left / pixelsPerSecond,
        endTime: (scrubber.left + scrubber.width) / pixelsPerSecond,
        duration: scrubber.width / pixelsPerSecond,
        trackIndex: scrubber.y || 0,
        left_player: scrubber.left_player,
        top_player: scrubber.top_player,
        width_player: scrubber.width_player,
        height_player: scrubber.height_player,
        trimBefore: scrubber.trimBefore,
        trimAfter: scrubber.trimAfter,
        rotation: scrubber.rotation,
        playbackSpeed: scrubber.playbackSpeed,
        keyframes: scrubber.keyframes,
      })),
    }];
  }, [getAllScrubbers, getPixelsPerSecond]);
  
  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev * 1.5));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev / 1.5));
  }, []);
  
  const handleZoomReset = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM);
  }, []);
  
  // Track handlers
  const handleAddTrack = useCallback(() => {
    // Tracks are dynamically created when clips are added
    // This is a no-op now but kept for compatibility
    return generateUUID();
  }, []);
  
  const handleDeleteTrack = useCallback((trackId: string) => {
    // In Convex, we don't explicitly manage tracks
    // They're implicit based on clip trackIndex
    toast.info("Track management is automatic");
  }, []);
  
  // Scrubber/Clip handlers
  const handleUpdateScrubber = useCallback(async (updatedScrubber: ScrubberState) => {
    if (!projectId) return;
    
    const pixelsPerSecond = getPixelsPerSecond();
    const clipId = updatedScrubber.id as Id<"timelineClips">;
    
    try {
      await updateClip({
        clipId,
        trackIndex: updatedScrubber.y,
        startTime: updatedScrubber.left / pixelsPerSecond,
        duration: updatedScrubber.width / pixelsPerSecond,
        position: {
          x: updatedScrubber.left_player,
          y: updatedScrubber.top_player,
        },
        size: {
          width: updatedScrubber.width_player,
          height: updatedScrubber.height_player,
        },
        rotation: updatedScrubber.rotation,
        playbackSpeed: updatedScrubber.playbackSpeed,
        trimStart: updatedScrubber.trimBefore ? updatedScrubber.trimBefore / FPS : undefined,
        trimEnd: updatedScrubber.trimAfter ? updatedScrubber.trimAfter / FPS : undefined,
      });
    } catch (error) {
      console.error("Failed to update clip:", error);
      toast.error("Failed to update clip");
    }
  }, [projectId, updateClip, getPixelsPerSecond]);
  
  const handleDeleteScrubber = useCallback(async (scrubberId: string) => {
    const clipId = scrubberId as Id<"timelineClips">;
    try {
      await deleteClip({ clipId });
    } catch (error) {
      console.error("Failed to delete clip:", error);
      toast.error("Failed to delete clip");
    }
  }, [deleteClip]);
  
  const handleDeleteScrubbersByMediaBinId = useCallback(async (mediaBinId: string) => {
    if (!projectId) return;
    
    const mediaAssetId = mediaBinId as Id<"mediaAssets">;
    try {
      const deletedCount = await deleteClipsByMediaAsset({ projectId, mediaAssetId });
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} clip${deletedCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error("Failed to delete clips:", error);
      toast.error("Failed to delete clips");
    }
  }, [projectId, deleteClipsByMediaAsset]);
  
  const handleAddScrubberToTrack = useCallback((trackId: string, newScrubber: ScrubberState) => {
    // This is handled by handleDropOnTrack now
    console.log("handleAddScrubberToTrack called - use handleDropOnTrack instead");
  }, []);
  
  const handleDropOnTrack = useCallback(async (item: MediaBinItem, trackId: string, dropLeftPx: number) => {
    if (!projectId) return;
    
    const trackIndex = parseInt(trackId.split('-')[1]) - 1;
    const mediaAssetId = item.id as Id<"mediaAssets">;
    const pixelsPerSecond = getPixelsPerSecond();
    
    try {
      await createClip({
        projectId,
        mediaAssetId,
        trackIndex,
        dropPositionPx: dropLeftPx,
        pixelsPerSecond,
      });
      toast.success(`Added ${item.name} to timeline`);
    } catch (error) {
      console.error("Failed to create clip:", error);
      toast.error("Failed to add to timeline");
    }
  }, [projectId, createClip, getPixelsPerSecond]);
  
  const handleDropOnNewTrack = useCallback(async (item: MediaBinItem, dropLeftPx: number, trackCount: number) => {
    if (!projectId) return;
    
    const mediaAssetId = item.id as Id<"mediaAssets">;
    const pixelsPerSecond = getPixelsPerSecond();
    
    try {
      await createClip({
        projectId,
        mediaAssetId,
        trackIndex: trackCount,
        dropPositionPx: dropLeftPx,
        pixelsPerSecond,
      });
      toast.success(`Added ${item.name} to new track`);
    } catch (error) {
      console.error("Failed to create clip:", error);
      toast.error("Failed to add to timeline");
    }
  }, [projectId, createClip, getPixelsPerSecond]);
  
  const handleSplitScrubberAtRuler = useCallback(async (rulerPositionPx: number, selectedScrubberId: string | null) => {
    if (!selectedScrubberId || !projectId) return 0;
    
    const pixelsPerSecond = getPixelsPerSecond();
    const splitTimeInTimeline = rulerPositionPx / pixelsPerSecond;
    
    // Find the scrubber
    const scrubber = getAllScrubbers().find(s => s.id === selectedScrubberId);
    if (!scrubber) return 0;
    
    const scrubberStartTime = scrubber.left / pixelsPerSecond;
    const scrubberEndTime = (scrubber.left + scrubber.width) / pixelsPerSecond;
    
    // Check if ruler is within scrubber bounds
    if (splitTimeInTimeline <= scrubberStartTime || splitTimeInTimeline >= scrubberEndTime) {
      return 0;
    }
    
    const splitTimeRelativeToClip = splitTimeInTimeline - scrubberStartTime;
    const clipId = selectedScrubberId as Id<"timelineClips">;
    
    try {
      await splitClipMutation({
        clipId,
        splitTime: splitTimeRelativeToClip,
      });
      return 1;
    } catch (error) {
      console.error("Failed to split clip:", error);
      toast.error("Failed to split clip");
      return 0;
    }
  }, [projectId, splitClipMutation, getAllScrubbers, getPixelsPerSecond]);
  
  const expandTimeline = useCallback((containerRef: React.RefObject<HTMLDivElement | null>) => {
    if (!containerRef.current) return false;
    
    const containerWidth = containerRef.current.offsetWidth;
    const currentScrollLeft = containerRef.current.scrollLeft;
    const scrollRight = currentScrollLeft + containerWidth;
    const distanceToEnd = timelineWidth - scrollRight;
    
    const EXPANSION_THRESHOLD = 200;
    const EXPANSION_AMOUNT = 1000;
    
    if (distanceToEnd < EXPANSION_THRESHOLD) {
      setTimelineWidth(prev => prev + EXPANSION_AMOUNT);
      return true;
    }
    return false;
  }, [timelineWidth]);
  
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
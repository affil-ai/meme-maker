// base type for all scrubbers
export interface BaseScrubber {
  id: string;
  mediaType: "video" | "image" | "audio" | "text";
  mediaUrl: string | null; // null for text or when URL not resolved
  media_width: number; // width of the media in pixels
  media_height: number; // height of the media in pixels
  text: TextProperties | null;
}

export interface TextProperties {
  textContent: string; // Only present when mediaType is "text"
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
}

// state of the scrubber in the media bin
export interface MediaBinItem extends BaseScrubber {
  name: string;
  durationInSeconds: number; // For media, to calculate initial width
  
  // Upload tracking properties
  uploadProgress: number | null; // 0-100, null when upload complete
  isUploading: boolean; // True while upload is in progress
}

// state of the scrubber in the timeline
export interface ScrubberState extends MediaBinItem {
  left: number; // in pixels (for the scrubber in the timeline)
  y: number; // track position (0-based index)
  width: number; // width is a css property for the scrubber width
  sourceMediaBinId: string; // ID of the media bin item this scrubber was created from

  // the following are the properties of the scrubber in <Player>
  left_player: number;
  top_player: number;
  width_player: number;
  height_player: number;
  is_dragging: boolean;

  // for video scrubbers (and audio in the future)
  trimBefore: number | null; // in frames
  trimAfter: number | null; // in frames

  // Transform properties
  rotation?: number; // rotation in degrees
  
  // Playback properties
  playbackSpeed?: number; // playback speed multiplier (0.25 to 4)

  // Text properties (for easier access)
  textContent?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
  
  // Animation keyframes
  keyframes?: Keyframe[];
}

// state of the track in the timeline
export interface TrackState {
  id: string;
  scrubbers: ScrubberState[];
}

// state of the timeline
export interface TimelineState {
  tracks: TrackState[];
}

// the most important type. gets converted to json and gets rendered. Everything else is just a helper type. (formed using getTimelineData() in useTimeline.ts from timelinestate)
export interface TimelineDataItem {
  scrubbers: (BaseScrubber & {
    startTime: number;
    endTime: number;
    duration: number; // TODO: this should be calculated from the start and end time, for trimming, it should be done with the trimmer. This should be refactored later.
    trackIndex: number; // track index in the timeline

    // the following are the properties of the scrubber in <Player>
    left_player: number;
    top_player: number;
    width_player: number;
    height_player: number;

    // for video scrubbers (and audio in the future)
    trimBefore: number | null; // in frames
    trimAfter: number | null; // in frames

    // Transform properties
    rotation?: number; // rotation in degrees
    
    // Playback properties
    playbackSpeed?: number; // playback speed multiplier (0.25 to 4)
    
    // Animation keyframes
    keyframes?: Keyframe[];
  })[];
}

export interface VideoData {
  timeline: TimelineDataItem[];
  videoDimensions: {
    width: number;
    height: number;
  };
}

// Keyframe types
export interface Keyframe {
  id: string;
  time: number; // time in seconds from the start of the scrubber
  properties: AnimatableProperties;
}

export interface AnimatableProperties {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  scale?: number;
}

export interface KeyframeAnimation {
  scrubberId: string;
  keyframes: Keyframe[];
}

// Constants
export const PIXELS_PER_SECOND = 100;
export const DEFAULT_TRACK_HEIGHT = 60;
export const FPS = 30;
export const RULER_HEIGHT = 32;

// Zoom constants
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

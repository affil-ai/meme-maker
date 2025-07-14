import { Player, type PlayerRef } from "@remotion/player";
import { Sequence, AbsoluteFill, Img, Video, OffthreadVideo, Audio, useCurrentFrame, interpolate } from "remotion";
import React, { useCallback, useState } from "react";
import type {
  ScrubberState,
  TimelineDataItem,
  TimelineState,
  TrackState,
} from "./types";
import { SortedOutlines, layerContainer, outer } from "./DragDrop";

type TimelineCompositionProps = {
  timelineData: TimelineDataItem[];
  isRendering: boolean; // it's either render (True) or preview (False)
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
  timeline: TimelineState;
  handleUpdateScrubber: (updateScrubber: ScrubberState) => void;
};

// props for the preview mode player
export type VideoPlayerProps = {
  timelineData: TimelineDataItem[];
  durationInFrames: number; // this is for the player to know how long to render (used in preview mode)
  ref: React.Ref<PlayerRef>;
  compositionWidth: number | null; // if null, the player width = max(width)
  compositionHeight: number | null; // if null, the player height = max(height)
  timeline: TimelineState;
  handleUpdateScrubber: (updateScrubber: ScrubberState) => void;
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
};

// Component to handle animated properties for each media item
interface AnimatedScrubber {
  left_player: number;
  top_player: number;
  width_player: number;
  height_player: number;
  rotation?: number;
  keyframes?: Array<{
    time: number;
    properties: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      opacity?: number;
      scale?: number;
    };
  }>;
}

const AnimatedMediaItem: React.FC<{
  scrubber: AnimatedScrubber;
  children: React.ReactNode;
}> = ({ scrubber, children }) => {
  const frame = useCurrentFrame();
  const FPS = 30;
  
  // Log scrubber info
  console.log('🎬 AnimatedMediaItem - Scrubber:', {
    hasKeyframes: !!scrubber.keyframes,
    keyframeCount: scrubber.keyframes?.length || 0,
    currentFrame: frame,
    baseProperties: {
      x: scrubber.left_player,
      y: scrubber.top_player,
      width: scrubber.width_player,
      height: scrubber.height_player,
      rotation: scrubber.rotation || 0,
    }
  });
  
  // Get base properties
  const baseProperties = {
    x: scrubber.left_player,
    y: scrubber.top_player,
    width: scrubber.width_player,
    height: scrubber.height_player,
    rotation: scrubber.rotation || 0,
    opacity: 1,
    scale: 1,
  };
  
  // If no keyframes, use base properties
  if (!scrubber.keyframes || scrubber.keyframes.length === 0) {
    console.log('📍 No keyframes - using base properties');
    return (
      <AbsoluteFill
        style={{
          left: baseProperties.x,
          top: baseProperties.y,
          width: baseProperties.width,
          height: baseProperties.height,
          transform: `rotate(${baseProperties.rotation}deg) scale(${baseProperties.scale})`,
          opacity: baseProperties.opacity,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  
  // Sort keyframes by time
  const sortedKeyframes = [...scrubber.keyframes].sort((a, b) => a.time - b.time);
  
  console.log('🔑 Keyframes:', sortedKeyframes.map(kf => ({
    time: kf.time,
    frame: Math.round(kf.time * FPS),
    properties: kf.properties
  })));
  
  // If only one keyframe, use its properties directly
  if (sortedKeyframes.length === 1) {
    const kf = sortedKeyframes[0];
    if (!kf) {
      return null;
    }
    console.log('📍 Single keyframe - using keyframe properties:', kf.properties);
    return (
      <AbsoluteFill
        style={{
          left: kf.properties.x ?? baseProperties.x,
          top: kf.properties.y ?? baseProperties.y,
          width: kf.properties.width ?? baseProperties.width,
          height: kf.properties.height ?? baseProperties.height,
          transform: `rotate(${kf.properties.rotation ?? baseProperties.rotation}deg) scale(${kf.properties.scale ?? baseProperties.scale})`,
          opacity: kf.properties.opacity ?? baseProperties.opacity,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  
  // Create frame ranges for interpolation
  const frameRanges = sortedKeyframes.map((kf) => Math.round(kf.time * FPS));
  
  console.log('🎯 Interpolation setup:', {
    currentFrame: frame,
    frameRanges,
    xValues: sortedKeyframes.map((kf) => kf.properties.x ?? baseProperties.x),
    yValues: sortedKeyframes.map((kf) => kf.properties.y ?? baseProperties.y),
  });
  
  // Interpolate each property
  const animatedX = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.x ?? baseProperties.x),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const animatedY = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.y ?? baseProperties.y),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const animatedWidth = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.width ?? baseProperties.width),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const animatedHeight = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.height ?? baseProperties.height),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const animatedRotation = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.rotation ?? baseProperties.rotation),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const animatedOpacity = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.opacity ?? baseProperties.opacity),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const animatedScale = interpolate(
    frame,
    frameRanges,
    sortedKeyframes.map((kf) => kf.properties.scale ?? baseProperties.scale),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  console.log('🎨 Animated values:', {
    frame,
    x: animatedX,
    y: animatedY,
    width: animatedWidth,
    height: animatedHeight,
    rotation: animatedRotation,
    opacity: animatedOpacity,
    scale: animatedScale,
  });
  
  return (
    <AbsoluteFill
      style={{
        left: animatedX,
        top: animatedY,
        width: animatedWidth,
        height: animatedHeight,
        transform: `rotate(${animatedRotation}deg) scale(${animatedScale})`,
        opacity: animatedOpacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
 
export function TimelineComposition({
  timelineData,
  isRendering,
  selectedItem,
  setSelectedItem,
  timeline,
  handleUpdateScrubber,
}: TimelineCompositionProps) {
  const FPS = 30; // Must match the Player fps setting

  // Temporary array to store items with trackIndex for sorting
  const tempItems: { content: React.ReactNode; trackIndex: number }[] = [];

  for (const timeline of timelineData) {
    for (const scrubber of timeline.scrubbers) {
      let content: React.ReactNode = null;

      switch (scrubber.mediaType) {
        case "text":
          content = (
            <AnimatedMediaItem
              scrubber={scrubber}
            >
              <div
                style={{
                  textAlign: scrubber.text?.textAlign || "center",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    color: scrubber.text?.color || "white",
                    fontSize: scrubber.text?.fontSize
                      ? `${scrubber.text.fontSize}px`
                      : "48px",
                    fontFamily:
                      scrubber.text?.fontFamily || "Comic Sans MS, cursive, sans-serif",
                    fontWeight: scrubber.text?.fontWeight || "normal",
                    margin: 0,
                    padding: "20px",
                  }}
                >
                  {scrubber.text?.textContent || ""}
                </p>
              </div>
            </AnimatedMediaItem>
          );
          break;
        case "image": {
          const imageUrl = scrubber.mediaUrl;
          content = (
            <AnimatedMediaItem
              scrubber={scrubber}
            >
              <Img src={imageUrl!} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AnimatedMediaItem>
          );
          break;
        }
        case "video": {
          const videoUrl = scrubber.mediaUrl;
          content = (
            <AnimatedMediaItem
              scrubber={scrubber}
            >
              <Video 
                src={videoUrl!} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                trimBefore={scrubber.trimBefore || undefined} 
                trimAfter={scrubber.trimAfter || undefined}
                playbackRate={scrubber.playbackSpeed || 1}
              />
            </AnimatedMediaItem>
          );
          break;
        }
        case "audio": {
          const audioUrl = scrubber.mediaUrl;
          content = <Audio src={audioUrl!} />;
          break;
        }
        default:
          console.warn(`Unknown media type: ${scrubber.mediaType}`);
          break;
      }

      if (content) {
        tempItems.push({
          content: (
            <Sequence
              from={Math.round(scrubber.startTime * FPS)}
              durationInFrames={Math.round(scrubber.duration * FPS)}
              key={scrubber.id}
            >
              {content}
            </Sequence>
          ),
          trackIndex: scrubber.trackIndex,
        });
      }
    }
  }

  // Sort by trackIndex (ascending) so higher track numbers appear on top
  const items: React.ReactNode[] = tempItems
    .sort((a, b) => a.trackIndex - b.trackIndex)
    .map(item => item.content);

  if (isRendering) {
    return (
      <AbsoluteFill style={outer}>
        <AbsoluteFill style={layerContainer}>{items}</AbsoluteFill>
      </AbsoluteFill>
    );
  } else {
    return (
      <AbsoluteFill style={outer}>
        <AbsoluteFill style={layerContainer}>{items}</AbsoluteFill>
        <SortedOutlines
          handleUpdateScrubber={handleUpdateScrubber}
          selectedItem={selectedItem}
          timeline={timeline}
          setSelectedItem={setSelectedItem}
        />
      </AbsoluteFill>
    );
  }
}

export function VideoPlayer({
  timelineData,
  durationInFrames,
  ref,
  compositionWidth,
  compositionHeight,
  timeline,
  handleUpdateScrubber,
  selectedItem,
  setSelectedItem,
}: VideoPlayerProps) {
  // Calculate composition width if not provided
  if (compositionWidth === null) {
    let maxWidth = 720; // Default minimum width
    for (const item of timelineData) {
      for (const scrubber of item.scrubbers) {
        // Use player dimensions (resized) if available, otherwise fall back to media dimensions
        const width = scrubber.width_player || scrubber.media_width || 0;
        const rightEdge = (scrubber.left_player || 0) + width;
        if (rightEdge > maxWidth) {
          maxWidth = rightEdge;
        }
      }
    }
    compositionWidth = maxWidth || 1920; // Default to 1920 if no media found
  }

  // Calculate composition height if not provided
  if (compositionHeight === null) {
    let maxHeight = 480; // Default minimum height
    for (const item of timelineData) {
      for (const scrubber of item.scrubbers) {
        // Use player dimensions (resized) if available, otherwise fall back to media dimensions
        const height = scrubber.height_player || scrubber.media_height || 0;
        const bottomEdge = (scrubber.top_player || 0) + height;
        if (bottomEdge > maxHeight) {
          maxHeight = bottomEdge;
        }
      }
    }
    compositionHeight = maxHeight || 1080; // Default to 1080 if no media found
  }

  return (
    <Player
      ref={ref}
      component={TimelineComposition}
      inputProps={{
        timelineData,
        durationInFrames,
        isRendering: false,
        selectedItem,
        setSelectedItem,
        timeline,
        handleUpdateScrubber,
      }}
      durationInFrames={durationInFrames || 10}
      compositionWidth={compositionWidth}
      compositionHeight={compositionHeight}
      fps={30}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        zIndex: 1,
      }}
      acknowledgeRemotionLicense
    />
  );
}
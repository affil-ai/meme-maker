import type { Keyframe, AnimatableProperties } from "@meme-maker/video-compositions";

export function interpolateKeyframes(
  keyframes: Keyframe[] | undefined,
  currentTime: number,
  baseProperties: AnimatableProperties
): AnimatableProperties {
  if (!keyframes || keyframes.length === 0) {
    return baseProperties;
  }

  // Sort keyframes by time
  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  // If we're before the first keyframe, return base properties
  if (currentTime <= sortedKeyframes[0].time) {
    return { ...baseProperties, ...sortedKeyframes[0].properties };
  }

  // If we're after the last keyframe, return the last keyframe's properties
  if (currentTime >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    return { ...baseProperties, ...sortedKeyframes[sortedKeyframes.length - 1].properties };
  }

  // Find the two keyframes we're between
  let prevKeyframe: Keyframe | null = null;
  let nextKeyframe: Keyframe | null = null;

  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    if (currentTime >= sortedKeyframes[i].time && currentTime <= sortedKeyframes[i + 1].time) {
      prevKeyframe = sortedKeyframes[i];
      nextKeyframe = sortedKeyframes[i + 1];
      break;
    }
  }

  if (!prevKeyframe || !nextKeyframe) {
    return baseProperties;
  }

  // Calculate interpolation factor (0 to 1)
  const timeDiff = nextKeyframe.time - prevKeyframe.time;
  const progress = (currentTime - prevKeyframe.time) / timeDiff;

  // Interpolate each property
  const interpolated: AnimatableProperties = { ...baseProperties };

  // Helper function to interpolate a single value
  const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t;
  };

  // Interpolate each property if it exists in both keyframes
  const prevProps = { ...baseProperties, ...prevKeyframe.properties };
  const nextProps = { ...baseProperties, ...nextKeyframe.properties };

  if (prevProps.x !== undefined && nextProps.x !== undefined) {
    interpolated.x = lerp(prevProps.x, nextProps.x, progress);
  }

  if (prevProps.y !== undefined && nextProps.y !== undefined) {
    interpolated.y = lerp(prevProps.y, nextProps.y, progress);
  }

  if (prevProps.width !== undefined && nextProps.width !== undefined) {
    interpolated.width = lerp(prevProps.width, nextProps.width, progress);
  }

  if (prevProps.height !== undefined && nextProps.height !== undefined) {
    interpolated.height = lerp(prevProps.height, nextProps.height, progress);
  }

  if (prevProps.rotation !== undefined && nextProps.rotation !== undefined) {
    interpolated.rotation = lerp(prevProps.rotation, nextProps.rotation, progress);
  }

  if (prevProps.opacity !== undefined && nextProps.opacity !== undefined) {
    interpolated.opacity = lerp(prevProps.opacity, nextProps.opacity, progress);
  }

  if (prevProps.scale !== undefined && nextProps.scale !== undefined) {
    interpolated.scale = lerp(prevProps.scale, nextProps.scale, progress);
  }

  return interpolated;
}

export function getBaseProperties(scrubber: { left_player: number; top_player: number; width_player: number; height_player: number; rotation?: number }): AnimatableProperties {
  return {
    x: scrubber.left_player,
    y: scrubber.top_player,
    width: scrubber.width_player,
    height: scrubber.height_player,
    rotation: scrubber.rotation || 0,
    opacity: 1,
    scale: 1,
  };
}
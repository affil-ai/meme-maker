# Video Compositions

Shared Remotion components and compositions used by both the editor and renderer.

## 🎬 Overview

This package contains all the Remotion video components that define how timeline data is rendered into actual video. It serves as the bridge between the editor's timeline representation and the final video output.

## 🛠️ Tech Stack

- **Remotion** - React-based video framework
- **React 19** - Component library
- **TypeScript** - Type definitions
- **CSS-in-JS** - Dynamic styling for video elements

## 📁 Project Structure

```
video-compositions/
├── src/
│   ├── index.ts           # Main exports
│   ├── types.ts          # Shared type definitions
│   ├── VideoPlayer.tsx   # Main video composition
│   └── DragDrop.tsx      # Drag and drop video component
├── package.json          # Package configuration
└── tsconfig.json         # TypeScript configuration
```

## 🚀 Getting Started

### Installation

```bash
# From the repository root
pnpm install

# Or install just this package
pnpm --filter video-compositions install
```

### Usage

```typescript
// In editor or renderer
import { VideoPlayer } from '@meme-maker/video-compositions';
import type { TimelineData } from '@meme-maker/video-compositions/types';

// Use in Remotion composition
<VideoPlayer timeline={timelineData} />
```

## 🎨 Core Components

### VideoPlayer
The main composition that renders timeline data:

```typescript
interface VideoPlayerProps {
  timeline: TimelineData;
  currentFrame: number;
  fps: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  timeline,
  currentFrame,
  fps,
}) => {
  // Renders all tracks and clips at correct positions
};
```

### DragDrop
Special composition for drag-and-drop preview:

```typescript
interface DragDropProps {
  mediaUrl: string;
  type: 'video' | 'image' | 'audio';
  width: number;
  height: number;
}

export const DragDrop: React.FC<DragDropProps> = (props) => {
  // Renders media with drop zone indicators
};
```

## 📐 Timeline Data Structure

```typescript
interface TimelineData {
  tracks: Track[];
  duration: number;
  settings: {
    fps: number;
    resolution: {
      width: number;
      height: number;
    };
  };
}

interface Track {
  id: string;
  clips: Clip[];
  order: number;
}

interface Clip {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  startFrame: number;
  duration: number;
  mediaUrl: string;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
  };
  trimStart?: number;
  trimEnd?: number;
  keyframes?: Keyframe[];
}
```

## 🎯 Features

### Media Support
- **Video**: MP4, WebM, MOV
- **Audio**: MP3, WAV, AAC
- **Images**: JPG, PNG, GIF, WebP
- **Text**: Rich text with styling

### Transformations
- Position (x, y)
- Scale
- Rotation
- Opacity
- Custom effects via keyframes

### Keyframe Animation
```typescript
interface Keyframe {
  frame: number;
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity';
  value: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
```

## 🧩 Creating New Components

### Component Template
```typescript
import { AbsoluteFill, Video, Img, Audio } from 'remotion';
import { TimelineClip } from '../types';

export const MyComponent: React.FC<{ clip: TimelineClip }> = ({ clip }) => {
  // Calculate position based on current frame
  const transform = calculateTransform(clip);
  
  return (
    <AbsoluteFill style={{ transform }}>
      {/* Render media based on clip type */}
    </AbsoluteFill>
  );
};
```

### Best Practices
1. Use Remotion's built-in components
2. Keep components pure (no side effects)
3. Calculate animations based on frame number
4. Handle all media types gracefully
5. Optimize for rendering performance

## 🎥 Remotion Concepts

### Composition
- Define video dimensions and duration
- Set FPS (frames per second)
- Configure audio/video codecs

### Sequences
- Organize clips in time
- Handle overlapping content
- Manage z-index layering

### Interpolation
```typescript
import { interpolate, useCurrentFrame } from 'remotion';

const frame = useCurrentFrame();
const opacity = interpolate(
  frame,
  [0, 30], // Input range (frames)
  [0, 1],  // Output range (opacity)
  {
    extrapolateRight: 'clamp',
  }
);
```

## 🧪 Testing

### Type Checking
```bash
pnpm --filter video-compositions typecheck
```

### Visual Testing
1. Use Remotion Studio for development
2. Test with various media formats
3. Verify animations at different frame rates
4. Check edge cases (empty timeline, single frame clips)

## ⚡ Performance Tips

1. **Lazy Load Media**
   ```typescript
   <Video 
     src={url}
     startFrom={trimStart}
     endAt={trimEnd}
   />
   ```

2. **Memoize Calculations**
   ```typescript
   const transform = useMemo(
     () => calculateTransform(clip, frame),
     [clip, frame]
   );
   ```

3. **Optimize Re-renders**
   - Use React.memo for static components
   - Avoid inline style objects
   - Pre-calculate keyframe values

## 🔧 Troubleshooting

### Common Issues

1. **Media not playing**
   - Check file format compatibility
   - Verify URL accessibility
   - Ensure correct CORS headers

2. **Performance issues**
   - Reduce video resolution
   - Limit concurrent videos
   - Use proxy files for preview

3. **Sync problems**
   - Verify FPS settings match
   - Check frame calculations
   - Ensure consistent time base

## 🤝 Contributing

When adding new components:

1. Follow existing patterns
2. Add TypeScript types
3. Document props clearly
4. Test with multiple media types
5. Consider performance impact

## 📚 Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Remotion Discord](https://remotion.dev/discord)
- [Video Codecs Guide](https://www.remotion.dev/docs/encoding)
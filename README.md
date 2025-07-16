# Video Editor - Open Source Video Editing Platform

A modern video editor built with React and Remotion, structured as a Turborepo monorepo. This open-source alternative to tools like CapCut and Canva provides non-linear video editing capabilities with a scalable architecture.

## 🏗️ System Architecture

### Technology Stack

**Frontend (apps/editor):**
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React version
- **TypeScript** - Full type safety
- **Remotion Player** - Video preview and playback
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Headless UI components
- **Framer Motion** - Animations

**Backend Services:**
- **Convex** - Real-time backend (packages/backend)
- **Remotion Renderer** - Video processing service (apps/renderer)
- **Serverless Framework** - AWS Lambda deployment
- **Express** - API server for rendering

**Shared Packages:**
- **video-compositions** - Shared Remotion compositions
- **backend** - Convex schema and functions

### Monorepo Structure

```
videoeditor/
├── apps/
│   ├── editor/             # Next.js video editor application
│   │   ├── app/           # App Router pages and components
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   └── renderer/          # Remotion rendering service
│       └── src/           # Rendering handlers and API
├── packages/
│   ├── backend/           # Convex backend
│   │   └── convex/        # Database schema and functions
│   └── video-compositions/# Shared video components
│       └── src/           # Reusable Remotion compositions
├── turbo.json             # Turborepo configuration
├── pnpm-workspace.yaml    # PNPM workspace config
└── package.json           # Root package scripts
```

## 🎯 Core Features

### 1. **Non-Linear Video Editing**
- Multi-track timeline with drag-and-drop support
- Frame-accurate scrubbing and positioning
- Real-time preview using Remotion Player
- Support for video, audio, images, and text overlays


### 2. **Media Management**
- Drag-and-drop media bin
- Progress tracking for uploads
- Split audio from video
- Clone and delete operations

## 🧠 State Management Architecture

The application uses a **hooks-based local state** architecture rather than global state management libraries. This provides simplicity and direct control over state updates.

### Key State Management Patterns

#### 1. **Custom Hooks Architecture**
```typescript
// Core state management hooks
useTimeline()   // Timeline tracks and scrubbers
useMediaBin()   // Media assets management
useRuler()      // Playback position sync
useRenderer()   // Video export state
```

#### 2. **State Structure**
```typescript
Timeline = {
  tracks: [{
    id: string,
    scrubbers: [{
      id: string,
      left: number,           // Position in pixels
      width: number,          // Width in pixels
      mediaType: "video" | "image" | "audio" | "text",
      mediaUrlLocal: string,  // Blob URL
      mediaUrlRemote: string, // Server URL
      // Player positioning
      left_player: number,
      top_player: number,
      width_player: number,
      height_player: number,
      // Trim points
      trimBefore: number,
      trimAfter: number,
    }]
  }]
}
```

#### 3. **Data Flow**
1. State is held in the main `TimelineEditor` component
2. State and update functions passed down as props
3. Child components call update functions to modify state
4. Immutable updates ensure predictable state changes

#### 4. **Timeline-Player Synchronization**
- Bidirectional sync between video player and timeline
- Frame-based positioning (30 FPS standard)
- Zoom-aware coordinate transformation
- Ref-based update loop prevention


## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 10.13.1+ (package manager)
- Convex account (for backend)
- AWS account (optional, for Lambda deployment)

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd videoeditor
```

2. **Install dependencies**
```bash
# Install all workspace dependencies
pnpm install
```

3. **Set up environment variables**
```bash
# Create .env files in necessary packages
# apps/editor/.env.local - for Next.js environment
# packages/backend/.env.local - for Convex credentials
```

4. **Start development servers**
```bash
# Start all dev servers (editor, backend, renderer)
pnpm dev

# Or start specific apps:
pnpm --filter editor dev      # Video editor UI
pnpm --filter backend dev     # Convex backend
pnpm --filter renderer dev    # Rendering service
```

### Build & Deploy

```bash
# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Deploy Convex backend
pnpm --filter backend deploy

# Deploy renderer to AWS Lambda
pnpm deploy:renderer
```

## 📦 Packages Overview

### apps/editor
The main Next.js application providing the video editing interface. Features include:
- Timeline-based video editing
- Media bin with drag-and-drop
- Real-time preview with Remotion Player
- Keyframe animation support
- Project management with Convex

### apps/renderer
Serverless video rendering service that can be deployed to AWS Lambda:
- Express API for rendering requests
- Remotion CLI integration
- Serverless framework configuration
- Support for batch rendering

### packages/backend
Convex backend providing real-time data synchronization:
- Project and timeline state management
- File storage integration
- Render job queue
- Media asset management
- Command history for undo/redo

### packages/video-compositions
Shared Remotion components used by both editor and renderer:
- Video player composition
- Drag-and-drop video component
- Type definitions for timeline data
- Reusable video effects

## 🎥 How Video Rendering Works

The video rendering uses Remotion, a React-based video creation framework:

1. **Composition**: Video is defined as React components in video-compositions package
2. **Timeline mapping**: Timeline scrubbers map to Remotion sequences
3. **Rendering**: Renderer service processes the composition
4. **Output**: Final video with all edits applied

## 🔄 Development Workflow

### Code Organization
- **Components**: Modular, reusable UI pieces
- **Hooks**: Encapsulated state logic
- **Utils**: Shared helper functions
- **Types**: TypeScript definitions

### Best Practices
- Immutable state updates
- Props-based component communication
- useCallback for performance optimization
- TypeScript for type safety
- Tailwind for consistent styling

## 🚧 Current Status

### Implemented Features
- ✅ Monorepo architecture with Turborepo
- ✅ Real-time backend with Convex
- ✅ Timeline-based editing interface
- ✅ Keyframe animation support
- ✅ Serverless rendering with AWS Lambda
- ✅ Project management and persistence
- ✅ Undo/redo with command history

### Known Limitations
1. **Performance** - Large projects may experience lag
2. **Browser Support** - Optimized for Chrome/Edge
3. **Mobile** - Desktop-only interface currently

## 🔮 Roadmap

### Short Term
- [ ] Audio waveform visualization
- [ ] More transition effects
- [ ] Export presets (resolution, format)
- [ ] Collaborative editing

### Medium Term
- [ ] Plugin system for custom effects
- [ ] AI-powered features (auto-cut, scene detection)
- [ ] Mobile responsive design
- [ ] Advanced color grading

### Long Term
- [ ] Desktop app with Electron
- [ ] GPU acceleration for rendering
- [ ] Real-time collaboration
- [ ] Template marketplace

## 🤝 Contributing

This is an open-source project. Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[License information here]

## 🙏 Acknowledgments

Built with:
- [Remotion](https://www.remotion.dev/) - Video in React
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
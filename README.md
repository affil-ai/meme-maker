# Video Editor - Open Source Video Editing Platform

A modern video editor built with React and Remotion. This open-source alternative to tools like CapCut and Canva provides non-linear video editing capabilities.

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- **React Router v7** - Modern React framework with SSR support
- **React 19** - Latest React version
- **TypeScript** - Full type safety
- **Remotion** - Core video rendering engine
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless UI components
- **Vite** - Lightning-fast build tool

**Backend:**
- **React Router v7** - Server-side rendering and API routes
- **Remotion Renderer** - Video processing integrated into React Router
- **Docker** - Containerized deployment
- **Nginx** - Reverse proxy

### Project Structure

```
videoeditor/
├── app/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── timeline/      # Timeline editing UI
│   │   ├── editor/       # Main editor components
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── routes/           # Application routes
├── public/               # Static assets
└── docker/              # Docker configurations
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
- pnpm package manager
- Docker & Docker Compose (for production)

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd videoeditor
```

2. **Install dependencies**
```bash
# Frontend
pnpm install

```

3. **Start development server**
```bash
pnpm dev
```

### Production Deployment

Use Docker Compose for production deployment:

```bash
docker-compose up -d
```

This starts:
- Nginx reverse proxy (port 80)
- React frontend
- Video rendering service

## 🎥 How Video Rendering Works

The video rendering uses Remotion, a React-based video creation framework:

1. **Composition**: Video is defined as React components
2. **Timeline mapping**: Scrubbers map to Remotion sequences
3. **Rendering**: React Router action handles video export
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

## 🚧 Current Limitations

1. **No state persistence** - Changes lost on reload
2. **No undo/redo** - Direct state manipulation only
3. **Props drilling** - Can become complex in deep hierarchies
4. **Development CORS** - Needs configuration for production

## 🔮 Future Enhancements

1. **State Management**
   - Add persistence (localStorage/IndexedDB)
   - Implement undo/redo with command pattern
   - Consider Context API for deeply nested components

2. **Timeline Features**
   - Transitions and effects
   - Audio waveform visualization
   - Keyframe animation
   - Advanced trimming tools

3. **Performance**
   - Virtual scrolling for long timelines
   - Web Workers for heavy computations
   - Optimistic UI updates
   - Lazy loading of media

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
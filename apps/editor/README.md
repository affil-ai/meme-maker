# Video Editor Frontend

The main Next.js application that provides the video editing interface.

## 🎬 Overview

This is the core video editing application built with Next.js 15 and React 19. It provides a comprehensive timeline-based editing interface with real-time preview capabilities powered by Remotion Player.

## 🛠️ Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with improved performance
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Modern utility-first styling
- **Radix UI** - Accessible component primitives
- **Remotion Player** - Real-time video preview
- **Convex** - Real-time backend integration
- **Framer Motion** - Smooth animations

## 📁 Project Structure

```
editor/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── project/[id]/      # Project editing pages
│   └── providers.tsx      # App-wide providers
├── components/            # React components
│   ├── editor/           # Editor-specific components
│   ├── media/            # Media handling components
│   ├── timeline/         # Timeline UI components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
│   ├── useTimeline.ts    # Timeline state management
│   ├── useMediaBin.ts    # Media asset management
│   ├── useRenderer.ts    # Rendering state
│   └── useUndoRedo.ts    # Command history
├── contexts/             # React contexts
└── utils/                # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.13.1+
- Convex account for backend

### Installation

```bash
# From the repository root
pnpm install

# Or install just this package
pnpm --filter editor install
```

### Environment Variables

Create a `.env.local` file:

```env
# Convex deployment URL
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# API endpoints
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Development

```bash
# Start the development server
pnpm --filter editor dev

# The app will be available at http://localhost:3000
```

### Building

```bash
# Build for production
pnpm --filter editor build

# Start production server
pnpm --filter editor start
```

## 🎯 Key Features

### Timeline Editor
- Multi-track timeline with drag-and-drop
- Frame-accurate scrubbing
- Zoom controls for precision editing
- Real-time preview synchronization

### Media Management
- Drag-and-drop media bin
- Support for video, audio, images, and text
- Progress tracking for uploads
- Thumbnail generation

### Keyframe Animation
- Visual keyframe editor
- Bezier curve interpolation
- Property animation (position, scale, rotation, opacity)
- Copy/paste keyframes

### Project Management
- Create and manage multiple projects
- Auto-save with Convex backend
- Project thumbnail generation
- Search and filter projects

## 🔧 Development Guide

### Adding New Components

1. Create component in appropriate directory
2. Follow existing naming conventions
3. Use TypeScript interfaces for props
4. Implement with Radix UI primitives when possible

### State Management

The app uses custom hooks for state management:

```typescript
// Example: Using timeline hook
const { tracks, addTrack, updateScrubber } = useTimeline();
```

### Styling

Use Tailwind CSS classes with the `cn` utility:

```typescript
import { cn } from "~/lib/utils";

<div className={cn("flex items-center", className)} />
```

### Adding UI Components

```bash
# Add new shadcn/ui components
pnpm dlx shadcn@latest add button
```

## 🧪 Testing

```bash
# Run type checking
pnpm --filter editor typecheck

# Run linting
pnpm --filter editor lint
```

## 📝 Code Conventions

- Use functional components with hooks
- Implement proper TypeScript types
- Follow ESLint rules
- Use path alias `~` for imports
- Keep components focused and reusable

## 🐛 Troubleshooting

### Common Issues

1. **Convex connection failed**
   - Check NEXT_PUBLIC_CONVEX_URL in .env.local
   - Ensure backend is running

2. **Media upload fails**
   - Verify file size limits
   - Check Convex storage configuration

3. **Timeline sync issues**
   - Clear browser cache
   - Check for console errors

## 🤝 Contributing

When contributing to the editor:

1. Follow the existing code style
2. Add proper TypeScript types
3. Test thoroughly with different media types
4. Update this README if adding major features
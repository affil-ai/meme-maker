# Backend - Convex Real-time Database

Real-time backend powered by Convex for the video editor application.

## 🔥 Overview

This package contains all the backend logic for the video editor, including database schema, server functions, and real-time synchronization. Built with Convex, it provides instant updates, automatic scaling, and type-safe database operations.

## 🛠️ Tech Stack

- **Convex** - Real-time backend platform
- **TypeScript** - Full type safety
- **React Query** - Client-side data fetching (via Convex hooks)

## 📁 Project Structure

```
backend/
├── convex/
│   ├── _generated/         # Auto-generated Convex files
│   ├── schema.ts          # Database schema definitions
│   ├── projects.ts        # Project management functions
│   ├── timeline.ts        # Timeline state functions
│   ├── timelineClips.ts   # Timeline clip operations
│   ├── mediaAssets.ts     # Media file management
│   ├── fileStorage.ts     # File upload/storage
│   ├── keyframes.ts       # Keyframe animations
│   ├── renderJobs.ts      # Render job queue
│   ├── commandHistory.ts  # Undo/redo history
│   └── types.ts          # Shared TypeScript types
├── convex.config.ts       # Convex configuration
└── package.json          # Package configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.13.1+
- Convex account (free tier available)

### Installation

```bash
# From the repository root
pnpm install

# Or install just this package
pnpm --filter backend install
```

### Environment Setup

1. **Create a Convex project**
```bash
pnpm --filter backend exec convex init
```

2. **Set up environment variables**
Create `.env.local`:
```env
CONVEX_DEPLOYMENT=<your-deployment-name>
```

### Development

```bash
# Start Convex dev server
pnpm --filter backend dev

# This will:
# - Watch for file changes
# - Regenerate types
# - Push functions to dev deployment
# - Provide real-time logs
```

### Deployment

```bash
# Deploy to production
pnpm --filter backend deploy
```

## 📊 Database Schema

### Projects
```typescript
projects: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  settings: v.object({
    fps: v.number(),
    resolution: v.object({
      width: v.number(),
      height: v.number(),
    }),
  }),
})
```

### Timeline
```typescript
timeline: defineTable({
  projectId: v.id("projects"),
  tracks: v.array(v.object({
    id: v.string(),
    name: v.string(),
    locked: v.boolean(),
    muted: v.boolean(),
  })),
  duration: v.number(),
})
```

### Media Assets
```typescript
mediaAssets: defineTable({
  projectId: v.id("projects"),
  type: v.union(
    v.literal("video"),
    v.literal("audio"),
    v.literal("image"),
    v.literal("text")
  ),
  url: v.string(),
  storageId: v.optional(v.string()),
  metadata: v.object({
    duration: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  }),
})
```

## 🔧 Key Functions

### Project Management
```typescript
// Create a new project
export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Implementation
  },
});

// Get project with all related data
export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Returns project, timeline, clips, assets
  },
});
```

### Timeline Operations
```typescript
// Update timeline state
export const updateTimeline = mutation({
  args: {
    projectId: v.id("projects"),
    tracks: v.array(timelineTrackSchema),
  },
  handler: async (ctx, args) => {
    // Updates and broadcasts changes
  },
});
```

### File Storage
```typescript
// Generate upload URL
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Store file metadata
export const storeFile = mutation({
  args: {
    storageId: v.string(),
    projectId: v.id("projects"),
    metadata: mediaMetadataSchema,
  },
  handler: async (ctx, args) => {
    // Store file reference
  },
});
```

## 🎯 Features

### Real-time Sync
- Automatic synchronization across all clients
- Optimistic updates for instant feedback
- Conflict resolution built-in

### Command History
- Full undo/redo support
- Command pattern implementation
- Persistent history across sessions

### File Management
- Direct file uploads to Convex storage
- Automatic thumbnail generation
- Progress tracking for uploads

### Render Queue
- Job queue for video rendering
- Status tracking and progress updates
- Error handling and retries

## 🧪 Testing

```bash
# Type checking
pnpm --filter backend typecheck

# Convex function testing
pnpm --filter backend exec convex test
```

## 📈 Performance

### Optimizations
- Indexed queries for fast lookups
- Pagination for large datasets
- Selective field updates
- Batch operations where possible

### Best Practices
1. Use indexes for frequently queried fields
2. Minimize data transferred in subscriptions
3. Batch related mutations
4. Use optimistic updates on client

## 🔒 Security

### Built-in Features
- Automatic HTTPS
- Authentication integration ready
- Row-level security possible
- Input validation on all mutations

### Implementation Tips
```typescript
// Add authentication check
export const authenticatedMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    // ... rest of handler
  },
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Type generation fails**
   - Ensure convex dev is running
   - Check for syntax errors in schema
   - Clear _generated folder and restart

2. **Subscription not updating**
   - Verify correct query arguments
   - Check for errors in dev console
   - Ensure mutations are completing

3. **File upload errors**
   - Check file size limits
   - Verify storage configuration
   - Ensure valid upload URL

## 🤝 Contributing

When contributing to the backend:

1. Follow schema conventions
2. Add proper TypeScript types
3. Include error handling
4. Write efficient queries
5. Document new functions

## 📚 Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex Discord](https://convex.dev/community)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
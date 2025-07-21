# Migration Guide: Convex to Supabase + Drizzle + UploadThing

This guide helps you migrate from Convex to the new backend stack.

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save your project URL and anon key
3. Get your database connection string from Settings > Database

### 2. Create UploadThing App

1. Go to [uploadthing.com](https://uploadthing.com) and create an account
2. Create a new app
3. Save your secret key and app ID

### 3. Configure Environment Variables

Create a `.env.local` file in the backend package:

```env
# Supabase
DATABASE_URL="your-supabase-database-url"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# UploadThing
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"
```

### 4. Run Database Migrations

```bash
cd packages/backend

# Generate migration files
pnpm db:generate

# Push schema to database
pnpm db:push

# Or run migrations
pnpm db:migrate
```

### 5. View Database

```bash
# Open Drizzle Studio to view/edit data
pnpm db:studio
```

## API Usage Examples

### Projects API

```typescript
import { createProject, getProjects, updateProject } from '@meme-maker/backend/api/projects';

// Create project
const project = await createProject({
  name: "My Video",
  settings: {
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    duration: 60
  },
  isPublic: false
});

// Get all projects
const projects = await getProjects();

// Update project
await updateProject(project.id, {
  name: "Updated Name"
});
```

### Media Assets with UploadThing

```typescript
import { createMediaAsset, updateMediaAsset } from '@meme-maker/backend/api/mediaAssets';
import { uploadFiles } from '@uploadthing/react';

// Upload file
const [uploaded] = await uploadFiles("mediaAsset", {
  files: [file],
  input: { projectId }
});

// Create media asset record
const asset = await createMediaAsset({
  projectId,
  name: file.name,
  mediaType: "video",
  fileKey: uploaded.key,
  width: 1920,
  height: 1080,
  duration: 120,
  uploadStatus: "completed"
});
```

### Timeline Operations

```typescript
import { createTimelineClip, updateTimelineClip } from '@meme-maker/backend/api/timelineClips';

// Add clip to timeline
const clip = await createTimelineClip({
  projectId,
  mediaAssetId: asset.id,
  trackIndex: 0,
  startTime: 5,
  duration: 10,
  position: { x: 0, y: 0 },
  size: { width: 1920, height: 1080 },
  zIndex: 0
});

// Update clip position
await updateTimelineClip(clip.id, {
  position: { x: 100, y: 50 }
});
```

## Frontend Integration

### 1. Update Convex Hooks

Replace Convex hooks with React Query or SWR:

```typescript
// Before (Convex)
const projects = useQuery(api.projects.getProjects);

// After (with React Query)
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: () => getProjects()
});
```

### 2. Update File Uploads

Replace Convex file storage with UploadThing:

```typescript
// Before (Convex)
const upload = useConvexFileUpload();
const storageId = await upload(file);

// After (UploadThing)
const { startUpload } = useUploadThing("mediaAsset");
const [result] = await startUpload([file]);
const fileKey = result.key;
```

### 3. Real-time Updates

For real-time updates, use Supabase Realtime:

```typescript
import { supabase } from '@meme-maker/backend/lib/supabase';

// Subscribe to project changes
const subscription = supabase
  .channel('project-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects',
    filter: `id=eq.${projectId}`
  }, (payload) => {
    // Handle changes
  })
  .subscribe();
```

## Migration Checklist

- [ ] Set up Supabase project and get credentials
- [ ] Set up UploadThing app and get credentials
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Update frontend API calls
- [ ] Replace file upload logic
- [ ] Implement real-time subscriptions (if needed)
- [ ] Test all functionality
- [ ] Migrate existing data (if any)

## Key Differences

1. **IDs**: Convex uses auto-generated IDs, we now use CUID2
2. **File Storage**: Convex storage → UploadThing
3. **Real-time**: Convex subscriptions → Supabase Realtime or polling
4. **Queries**: Convex functions → Drizzle ORM queries
5. **Type Safety**: Still maintained with Drizzle's type inference

## Notes

- The new setup provides more flexibility and control
- UploadThing handles file uploads with progress tracking
- Supabase provides auth, real-time, and vector embeddings if needed
- Drizzle ORM offers type-safe database queries with great DX
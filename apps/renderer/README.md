# Video Renderer Service

Serverless video rendering service powered by Remotion and AWS Lambda.

## 🎥 Overview

This service handles the actual video rendering process, taking timeline data from the editor and producing final video files. It can run locally as an Express server or be deployed to AWS Lambda for scalable, serverless rendering.

## 🛠️ Tech Stack

- **Remotion** - React-based video rendering engine
- **Express** - Local development server
- **AWS Lambda** - Serverless deployment
- **Serverless Framework** - Infrastructure as code
- **TypeScript** - Type-safe development

## 📁 Project Structure

```
renderer/
├── src/
│   ├── handler.ts           # Main Lambda handler
│   ├── remotion-handler.ts  # Remotion-specific logic
│   ├── videorender.ts       # Local Express server
│   ├── Composition.tsx      # Root video composition
│   └── index.ts            # Exports
├── serverless.yml          # AWS Lambda configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.13.1+
- AWS CLI (for deployment)
- FFmpeg (installed automatically by Remotion)

### Installation

```bash
# From the repository root
pnpm install

# Or install just this package
pnpm --filter renderer install
```

### Local Development

```bash
# Start the local rendering server
pnpm --filter renderer dev

# Server runs on http://localhost:3001
```

### API Endpoints

#### POST /render
Render a video from timeline data

```typescript
// Request body
{
  composition: "VideoComposition",
  timeline: {
    tracks: [...],
    duration: 300
  },
  outputOptions: {
    fps: 30,
    width: 1920,
    height: 1080,
    codec: "h264"
  }
}

// Response
{
  jobId: "render-123",
  status: "processing",
  progress: 0
}
```

#### GET /render/:jobId
Check render job status

```typescript
// Response
{
  jobId: "render-123",
  status: "completed",
  progress: 100,
  outputUrl: "https://..."
}
```

## 🚢 Deployment

### AWS Lambda Setup

1. **Configure AWS credentials**
```bash
aws configure
```

2. **Update serverless.yml**
```yaml
# Set your AWS region and other parameters
provider:
  region: us-east-1
  memorySize: 3008
  timeout: 900
```

3. **Deploy to AWS**
```bash
# Build and deploy
pnpm --filter renderer build
pnpm --filter renderer deploy
```

### Environment Variables

For Lambda deployment, set these in serverless.yml:

```yaml
environment:
  NODE_ENV: production
  REMOTION_LICENSE_KEY: ${env:REMOTION_LICENSE_KEY}
  S3_BUCKET: ${env:S3_BUCKET}
```

## 🎬 How It Works

1. **Receive render request** - Timeline data from the editor
2. **Create composition** - Build Remotion composition from timeline
3. **Render frames** - Remotion renders each frame
4. **Encode video** - FFmpeg combines frames into video
5. **Upload result** - Video uploaded to S3
6. **Return URL** - Client receives video URL

## ⚡ Performance Optimization

### Lambda Configuration
- **Memory**: 3008 MB (maximum for better CPU)
- **Timeout**: 15 minutes
- **Concurrency**: Configure based on needs

### Rendering Tips
- Use appropriate resolution for output
- Enable frame caching for repeated renders
- Consider chunked rendering for long videos

## 🧪 Testing

### Local Testing
```bash
# Type checking
pnpm --filter renderer typecheck

# Test render locally
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{"composition": "test", "timeline": {...}}'
```

### Lambda Testing
```bash
# Invoke function directly
serverless invoke -f render -d '{"body": "{...}"}'

# Check logs
serverless logs -f render -t
```

## 📊 Monitoring

### CloudWatch Metrics
- Invocation count
- Duration
- Errors
- Throttles

### Custom Metrics
- Render progress
- Frame rate
- Output file size

## 🔧 Troubleshooting

### Common Issues

1. **Out of memory errors**
   - Increase Lambda memory size
   - Reduce video resolution
   - Enable swap for local development

2. **Timeout errors**
   - Split long videos into chunks
   - Increase Lambda timeout
   - Use step functions for complex workflows

3. **FFmpeg errors**
   - Check codec compatibility
   - Verify input format support
   - Update Remotion version

## 🤝 Contributing

When contributing to the renderer:

1. Test with various video formats
2. Optimize for performance
3. Handle errors gracefully
4. Update documentation for new features

## 📚 Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Serverless Framework Guide](https://www.serverless.com/framework/docs)
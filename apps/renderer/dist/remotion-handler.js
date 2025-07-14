import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'remotion-lambda-renderer',
        region: 'us-east-1',
        functionName: process.env.REMOTION_LAMBDA_FUNCTION_NAME,
        bucketName: process.env.REMOTION_S3_BUCKET_NAME,
    });
});
// Render endpoint using Remotion Lambda
app.post('/render', async (req, res) => {
    try {
        const { timelineData, durationInFrames, compositionWidth, compositionHeight, } = req.body;
        // Validate required environment variables
        const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
        const serveUrl = process.env.REMOTION_SERVE_URL;
        const region = 'us-east-1';
        if (!functionName || !serveUrl) {
            res.status(500).json({
                error: 'Server configuration error',
                message: 'Remotion Lambda is not properly configured. Please run deploy:remotion script.',
            });
            return;
        }
        const inputProps = {
            timelineData,
            durationInFrames,
            compositionWidth,
            compositionHeight,
            isRendering: true,
        };
        console.log('Starting render with input props:', JSON.stringify(inputProps, null, 2));
        // Start the render on Lambda
        const { renderId, bucketName } = await renderMediaOnLambda({
            region: region,
            functionName,
            serveUrl,
            composition: 'TimelineComposition',
            inputProps,
            codec: 'h264',
            imageFormat: 'jpeg',
            maxRetries: 1,
            privacy: 'public',
            downloadBehavior: {
                type: 'download',
                fileName: 'video.mp4',
            },
            outName: `render-${Date.now()}.mp4`,
        });
        console.log(`Render started: ${renderId} in bucket ${bucketName}`);
        // Poll for progress
        let progress;
        let lastProgress = 0;
        const startTime = Date.now();
        const timeout = 900000; // 15 minutes
        while (true) {
            progress = await getRenderProgress({
                renderId,
                bucketName,
                functionName,
                region: region,
            });
            if (progress.overallProgress !== lastProgress) {
                console.log(`Render progress: ${Math.round(progress.overallProgress * 100)}%`);
                lastProgress = progress.overallProgress;
            }
            if (progress.done) {
                console.log('Render completed successfully');
                break;
            }
            if (progress.fatalErrorEncountered) {
                console.error('Render failed:', progress.errors);
                res.status(500).json({
                    error: 'Render failed',
                    message: progress.errors?.[0]?.message || 'Unknown error occurred during rendering',
                    errors: progress.errors,
                });
                return;
            }
            // Check timeout
            if (Date.now() - startTime > timeout) {
                res.status(504).json({
                    error: 'Render timeout',
                    message: 'Rendering took too long and was terminated',
                });
                return;
            }
            // Wait before polling again
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        // Get the output URL
        if (progress.outputFile) {
            // Construct the S3 URL
            const downloadUrl = `https://${bucketName}.s3.${region}.amazonaws.com/renders/${renderId}/${progress.outputFile}`;
            res.json({
                success: true,
                renderId,
                downloadUrl,
                outputFile: progress.outputFile,
                renderTime: Date.now() - startTime,
            });
        }
        else {
            res.status(500).json({
                error: 'Render completed but no output file',
                message: 'The render completed but no output file was generated',
            });
        }
    }
    catch (error) {
        console.error('Render error:', error);
        res.status(500).json({
            error: 'Render failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
});
// Get render status endpoint
app.get('/render/:renderId', async (req, res) => {
    try {
        const { renderId } = req.params;
        const bucketName = process.env.REMOTION_S3_BUCKET_NAME;
        const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
        const region = 'us-east-1';
        if (!bucketName || !functionName) {
            res.status(500).json({
                error: 'Server configuration error',
                message: 'Remotion Lambda is not properly configured',
            });
            return;
        }
        const progress = await getRenderProgress({
            renderId: renderId || '',
            bucketName,
            functionName,
            region: region,
        });
        res.json({
            renderId,
            progress: Math.round(progress.overallProgress * 100),
            done: progress.done,
            error: progress.fatalErrorEncountered,
            errors: progress.errors,
            outputFile: progress.outputFile,
        });
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to check render status',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
const port = process.env.PORT || 8000;
// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🚀 Remotion Lambda API running on http://localhost:${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`🎬 Video rendering: POST http://localhost:${port}/render`);
        console.log(`📈 Render status: GET http://localhost:${port}/render/:renderId`);
    });
}
export const handler = serverless(app);
//# sourceMappingURL=remotion-handler.js.map
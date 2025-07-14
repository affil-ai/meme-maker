import type { ActionFunctionArgs } from "react-router";
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs/promises';
import type { TimelineDataItem } from '~/components/timeline/types';

const compositionId = 'TimelineComposition';

let bundleLocation: string | null = null;

async function getBundleLocation() {
  if (!bundleLocation) {
    bundleLocation = await bundle({
      entryPoint: path.resolve('./app/videorender/index.ts'),
      webpackOverride: (config) => config,
    });
  }
  return bundleLocation;
}

async function ensureOutputDirectory() {
  const outDir = path.resolve('out');
  try {
    await fs.access(outDir);
  } catch {
    await fs.mkdir(outDir, { recursive: true });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const inputProps = {
      timelineData: body.timelineData as TimelineDataItem[],
      durationInFrames: body.durationInFrames,
      compositionWidth: body.compositionWidth,
      compositionHeight: body.compositionHeight,
      isRendering: true
    };

    console.log("Input props:", JSON.stringify(inputProps, null, 2));
    
    console.log("🔍 Checking keyframes in timeline data:");
    const timelineData = inputProps.timelineData;
    timelineData?.forEach((timeline, tIdx) => {
      timeline.scrubbers?.forEach((scrubber, sIdx) => {
        console.log(`  Scrubber [${tIdx}][${sIdx}] id=${scrubber.id}:`, {
          hasKeyframes: !!scrubber.keyframes,
          keyframeCount: scrubber.keyframes?.length || 0,
          keyframes: scrubber.keyframes
        });
      });
    });

    await ensureOutputDirectory();
    const bundleUrl = await getBundleLocation();

    const composition = await selectComposition({
      serveUrl: bundleUrl,
      id: compositionId,
      inputProps,
    });

    const outputPath = path.resolve(`out/${compositionId}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundleUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      concurrency: 3,
      verbose: true,
      logLevel: 'verbose',
      onBrowserLog: (log) => {
        console.log('🌐 Browser log:', log.text);
      },
      ffmpegOverride: ({ args }) => {
        return [
          ...args,
          '-preset', 'fast',
          '-crf', '28',
          '-threads', '3',
          '-tune', 'film',
          '-x264-params', 'ref=3:me=hex:subme=6:trellis=1',
          '-g', '30',
          '-bf', '2',
          '-maxrate', '5M',
          '-bufsize', '10M',
        ];
      },
      timeoutInMilliseconds: 900000,
    });

    console.log('✅ Render completed successfully');

    const fileData = await fs.readFile(outputPath);
    
    return new Response(fileData, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${compositionId}.mp4"`,
      },
    });

  } catch (err) {
    console.error('❌ Render failed:', err);

    try {
      const outputPath = path.resolve(`out/${compositionId}.mp4`);
      await fs.unlink(outputPath);
      console.log('🧹 Cleaned up partial file');
    } catch (cleanupErr) {
      console.warn('⚠️ Could not clean up:', cleanupErr);
    }

    return new Response(
      JSON.stringify({
        error: 'Video rendering failed',
        message: 'Your laptop might be under heavy load. Try closing other apps and rendering again.',
        tip: 'Videos are limited to 5 seconds at half resolution for performance.',
        details: err instanceof Error ? err.message : String(err)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
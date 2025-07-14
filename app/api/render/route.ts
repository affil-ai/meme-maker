import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
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
        console.log(`  Timeline ${tIdx}, Scrubber ${sIdx}: has keyframes`);
        if (scrubber.keyframes && scrubber.keyframes.length > 0) {
          console.log(`    Keyframes:`, JSON.stringify(scrubber.keyframes, null, 2));
        }
      });
    });

    const bundleLocation = await getBundleLocation();
    console.log('Bundle location:', bundleLocation);
    
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps
    });

    console.log('Composition:', composition);

    const outputLocation = path.resolve(`out/output-${Date.now()}.mp4`);
    
    await ensureOutputDirectory();

    console.log('Starting render...');
    const startTime = Date.now();
    
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation,
      inputProps,
      onProgress: ({ progress }) => {
        console.log(`Rendering is ${(progress * 100).toFixed(2)}% complete`);
      },
    });

    const endTime = Date.now();
    console.log(`Render completed in ${(endTime - startTime) / 1000} seconds`);

    const fileData = await fs.readFile(outputLocation);
    const base64 = fileData.toString('base64');
    
    await fs.unlink(outputLocation);

    return NextResponse.json({
      success: true,
      video: `data:video/mp4;base64,${base64}`
    });
  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
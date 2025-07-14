import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { TimelineComposition } from '@meme-maker/video-compositions';
export default function RenderComposition() {
    const inputProps = getInputProps();
    console.log("Input props:", inputProps);
    return (React.createElement(Composition, { id: "TimelineComposition", component: TimelineComposition, durationInFrames: inputProps.durationInFrames ?? 300, fps: 30, width: inputProps.compositionWidth, height: inputProps.compositionHeight, defaultProps: {
            timelineData: [
                {
                    scrubbers: [
                        { id: "1-1", startTime: 0, endTime: 3, duration: 3, mediaType: "text", media_width: 80, media_height: 80, mediaUrl: null, text: { textContent: "Hello, world!", fontSize: 16, fontFamily: "Arial", color: "#000000", textAlign: "left", fontWeight: "normal" }, left_player: 100, top_player: 100, width_player: 200, height_player: 200, trackIndex: 0, trimBefore: null, trimAfter: null },
                    ],
                }
            ],
            isRendering: false,
            selectedItem: null,
            setSelectedItem: () => { },
            timeline: { tracks: [] },
            handleUpdateScrubber: () => { },
        } }));
}
//# sourceMappingURL=Composition.js.map
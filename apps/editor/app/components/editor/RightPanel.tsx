import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { Slider } from '~/components/ui/slider';
import { type ScrubberState, FPS, PIXELS_PER_SECOND } from "@meme-maker/video-compositions";
import KeyframeEditor from './KeyframeEditor';
import { useTimeline } from '~/hooks/useTimeline';

interface RightPanelProps {
  selectedScrubber: ScrubberState | null;
  onUpdateScrubber: (id: string, updates: Partial<ScrubberState>) => void;
}

export default function RightPanel({ selectedScrubber, onUpdateScrubber }: RightPanelProps) {
  const { zoomLevel } = useTimeline();
  const pixelsPerSecond = PIXELS_PER_SECOND * zoomLevel;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const parseTime = (timeStr: string): number | null => {
    // Support various formats: mm:ss.ms, ss.ms, or just seconds
    const colonMatch = timeStr.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
    if (colonMatch) {
      const minutes = parseInt(colonMatch[1], 10);
      const seconds = parseInt(colonMatch[2], 10);
      const ms = colonMatch[3] ? parseInt(colonMatch[3].padEnd(3, '0'), 10) : 0;
      return minutes * 60 + seconds + ms / 1000;
    }
    
    const decimalMatch = timeStr.match(/^(\d+)(?:\.(\d+))?$/);
    if (decimalMatch) {
      const seconds = parseInt(decimalMatch[1], 10);
      const ms = decimalMatch[2] ? parseInt(decimalMatch[2].padEnd(3, '0'), 10) : 0;
      return seconds + ms / 1000;
    }
    
    return null;
  };

  if (!selectedScrubber) {
    return (
      <div className="h-full p-4">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a media item to edit its properties
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCommonPropertyChange = (property: string, value: string | number) => {
    onUpdateScrubber(selectedScrubber.id, { [property]: value });
  };

  const handlePlayerPropertyChange = (property: string, value: string | number) => {
    const playerProperty = `${property}_player` as keyof ScrubberState;
    onUpdateScrubber(selectedScrubber.id, { 
      [playerProperty]: value,
      is_dragging: false  // Ensure drag state is false when updating from panel
    });
  };

  const handleTextPropertyChange = (property: string, value: string | number) => {
    const currentText = selectedScrubber.text || {
      textContent: '',
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      textAlign: 'left' as const,
      fontWeight: 'normal' as const
    };
    
    onUpdateScrubber(selectedScrubber.id, {
      text: {
        ...currentText,
        [property]: value
      }
    });
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input 
              value={selectedScrubber.name} 
              onChange={(e) => handleCommonPropertyChange('name', e.target.value)}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={selectedScrubber.mediaType} disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Timing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start Time</Label>
              <Input 
                type="text" 
                value={formatTime(selectedScrubber.left / pixelsPerSecond)}
                onChange={(e) => {
                  const newTime = parseTime(e.target.value);
                  if (newTime !== null && newTime >= 0) {
                    const newLeft = newTime * pixelsPerSecond;
                    onUpdateScrubber(selectedScrubber.id, { left: newLeft });
                  }
                }}
                placeholder="mm:ss.ms"
                title="Format: mm:ss.ms or ss.ms"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input 
                type="text" 
                value={formatTime((selectedScrubber.left + selectedScrubber.width) / pixelsPerSecond)}
                onChange={(e) => {
                  const newEndTime = parseTime(e.target.value);
                  if (newEndTime !== null && newEndTime >= 0) {
                    const startTime = selectedScrubber.left / pixelsPerSecond;
                    if (newEndTime > startTime) {
                      const newWidth = (newEndTime - startTime) * pixelsPerSecond;
                      onUpdateScrubber(selectedScrubber.id, { width: newWidth });
                    }
                  }
                }}
                placeholder="mm:ss.ms"
                title="Format: mm:ss.ms or ss.ms"
              />
            </div>
          </div>
          <div>
            <Label>Duration</Label>
            <Input 
              type="text" 
              value={formatTime(selectedScrubber.width / pixelsPerSecond)}
              disabled
              className="text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Transform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>X Position</Label>
              <Input 
                type="number" 
                value={selectedScrubber.left_player || 0} 
                onChange={(e) => handlePlayerPropertyChange('left', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Y Position</Label>
              <Input 
                type="number" 
                value={selectedScrubber.top_player || 0} 
                onChange={(e) => handlePlayerPropertyChange('top', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <Input 
                type="number" 
                value={selectedScrubber.width_player || 100} 
                onChange={(e) => handlePlayerPropertyChange('width', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Height</Label>
              <Input 
                type="number" 
                value={selectedScrubber.height_player || 100} 
                onChange={(e) => handlePlayerPropertyChange('height', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label>Rotation</Label>
            <Input 
              type="number" 
              value={selectedScrubber.rotation || 0} 
              onChange={(e) => handleCommonPropertyChange('rotation', parseFloat(e.target.value))}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {selectedScrubber.mediaType === 'text' && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Text Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Text Content</Label>
              <Textarea 
                value={selectedScrubber.text?.textContent || ''} 
                onChange={(e) => handleTextPropertyChange('textContent', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Font Size</Label>
              <Slider
                value={[selectedScrubber.text?.fontSize || 16]}
                onValueChange={(value) => handleTextPropertyChange('fontSize', value[0])}
                min={8}
                max={200}
                step={1}
              />
              <span className="text-sm text-gray-500">{selectedScrubber.text?.fontSize || 16}px</span>
            </div>
            <div>
              <Label>Font Family</Label>
              <Select 
                value={selectedScrubber.text?.fontFamily || 'Arial'} 
                onValueChange={(value) => handleTextPropertyChange('fontFamily', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Input 
                type="color" 
                value={selectedScrubber.text?.color || '#000000'} 
                onChange={(e) => handleTextPropertyChange('color', e.target.value)}
              />
            </div>
            <div>
              <Label>Text Align</Label>
              <Select 
                value={selectedScrubber.text?.textAlign || 'left'} 
                onValueChange={(value) => handleTextPropertyChange('textAlign', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Font Weight</Label>
              <Select 
                value={selectedScrubber.text?.fontWeight || 'normal'} 
                onValueChange={(value) => handleTextPropertyChange('fontWeight', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {(selectedScrubber.mediaType === 'video' || selectedScrubber.mediaType === 'audio') && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Playback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Speed</Label>
              <Slider
                value={[selectedScrubber.playbackSpeed || 1]}
                onValueChange={(value) => handleCommonPropertyChange('playbackSpeed', value[0])}
                min={0.25}
                max={4}
                step={0.25}
              />
              <span className="text-sm text-gray-500">{selectedScrubber.playbackSpeed || 1}x</span>
            </div>
          </CardContent>
        </Card>
      )}

      <KeyframeEditor selectedScrubber={selectedScrubber} pixelsPerSecond={pixelsPerSecond} />
    </div>
  );
}
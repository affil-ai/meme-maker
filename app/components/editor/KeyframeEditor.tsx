import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { type ScrubberState, type Keyframe, type AnimatableProperties } from '../timeline/types';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from 'sonner';

interface KeyframeEditorProps {
  selectedScrubber: ScrubberState;
  pixelsPerSecond: number;
}

export default function KeyframeEditor({ selectedScrubber, pixelsPerSecond }: KeyframeEditorProps) {
  const createKeyframe = useMutation(api.keyframes.create);
  const updateKeyframe = useMutation(api.keyframes.update);
  const deleteKeyframe = useMutation(api.keyframes.remove);

  const formatTime = (seconds: number): string => {
    return seconds.toFixed(2) + 's';
  };

  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.match(/^(\d+(?:\.\d+)?)\s*s?$/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  };

  const handleAddNewKeyframe = async () => {
    const scrubberDuration = selectedScrubber.width / pixelsPerSecond;
    const newTime = scrubberDuration / 2; // Add keyframe at middle of scrubber
    
    const properties: AnimatableProperties = {
      x: selectedScrubber.left_player,
      y: selectedScrubber.top_player,
      width: selectedScrubber.width_player,
      height: selectedScrubber.height_player,
      rotation: selectedScrubber.rotation || 0,
      opacity: 1,
      scale: 1,
    };
    
    try {
      await createKeyframe({
        clipId: selectedScrubber.id as Id<"timelineClips">,
        time: newTime,
        properties,
      });
      toast.success('Keyframe added');
    } catch (error) {
      console.error('Failed to add keyframe:', error);
      toast.error('Failed to add keyframe');
    }
  };

  const handlePropertyChange = async (keyframeId: string, property: keyof AnimatableProperties, value: number) => {
    const keyframe = selectedScrubber.keyframes?.find(kf => kf.id === keyframeId);
    if (!keyframe) return;
    
    const updatedProperties = {
      ...keyframe.properties,
      [property]: value
    };
    
    try {
      await updateKeyframe({
        keyframeId: keyframeId as Id<"keyframes">,
        properties: updatedProperties,
      });
    } catch (error) {
      console.error('Failed to update keyframe:', error);
      toast.error('Failed to update keyframe');
    }
  };

  const keyframes = selectedScrubber.keyframes || [];
  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Keyframes</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleAddNewKeyframe}
            className="h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedKeyframes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Double-click on the scrubber to add keyframes
          </p>
        ) : (
          sortedKeyframes.map((keyframe, index) => (
            <div key={keyframe.id} className="space-y-2 p-3 border rounded-md">
              <div className="flex items-center justify-between">
                <Label>Keyframe {index + 1} - {formatTime(keyframe.time)}</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await deleteKeyframe({ keyframeId: keyframe.id as Id<"keyframes"> });
                      toast.success('Keyframe deleted');
                    } catch (error) {
                      console.error('Failed to delete keyframe:', error);
                      toast.error('Failed to delete keyframe');
                    }
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={keyframe.properties.x || 0}
                    onChange={(e) => handlePropertyChange(keyframe.id, 'x', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={keyframe.properties.y || 0}
                    onChange={(e) => handlePropertyChange(keyframe.id, 'y', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="number"
                    value={keyframe.properties.width || 100}
                    onChange={(e) => handlePropertyChange(keyframe.id, 'width', parseFloat(e.target.value) || 100)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="number"
                    value={keyframe.properties.height || 100}
                    onChange={(e) => handlePropertyChange(keyframe.id, 'height', parseFloat(e.target.value) || 100)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Rotation</Label>
                  <Input
                    type="number"
                    value={keyframe.properties.rotation || 0}
                    onChange={(e) => handlePropertyChange(keyframe.id, 'rotation', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Opacity</Label>
                  <Input
                    type="number"
                    value={keyframe.properties.opacity || 1}
                    min="0"
                    max="1"
                    step="0.1"
                    onChange={(e) => handlePropertyChange(keyframe.id, 'opacity', parseFloat(e.target.value) || 1)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
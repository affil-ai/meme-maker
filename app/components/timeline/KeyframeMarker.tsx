import React from 'react';
import type { Keyframe } from './types';

interface KeyframeMarkerProps {
  keyframe: Keyframe;
  scrubberDuration: number;
  isSelected?: boolean;
  onSelect?: (keyframeId: string) => void;
  onMove?: (keyframeId: string, newTime: number) => void;
  onDelete?: (keyframeId: string) => void;
}

export const KeyframeMarker: React.FC<KeyframeMarkerProps> = ({
  keyframe,
  scrubberDuration,
  isSelected = false,
  onSelect,
  onMove,
  onDelete,
}) => {
  const position = (keyframe.time / scrubberDuration) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(keyframe.id);
    }
    
    const startX = e.clientX;
    const startTime = keyframe.time;
    const scrubberElement = e.currentTarget.parentElement;
    if (!scrubberElement) return;
    
    const scrubberWidth = scrubberElement.offsetWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!onMove) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / scrubberWidth) * scrubberDuration;
      const newTime = Math.max(0, Math.min(scrubberDuration, startTime + deltaTime));
      
      onMove(keyframe.id, newTime);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(keyframe.id);
    }
  };

  return (
    <div
      className={`absolute top-0 h-full w-[2px] cursor-ew-resize ${
        isSelected ? 'bg-yellow-400' : 'bg-yellow-600'
      } hover:bg-yellow-400 transition-colors`}
      style={{ left: `${position}%` }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={`Keyframe at ${keyframe.time.toFixed(2)}s`}
    >
      <div
        className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
          isSelected ? 'bg-yellow-400' : 'bg-yellow-600'
        } hover:bg-yellow-400 transition-colors`}
      />
    </div>
  );
};
import React, { useCallback, useMemo } from "react";
import { useCurrentScale, Sequence } from "remotion";
import {
  FPS,
  PIXELS_PER_SECOND,
  type ScrubberState,
  type TimelineState,
  type TrackState,
} from "./types";

const HANDLE_SIZE = 10;

export const ResizeHandle: React.FC<{
  type: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  setItem: (updatedScrubber: ScrubberState) => void;
  ScrubberState: ScrubberState;
}> = ({ type, setItem, ScrubberState }) => {
  // console.log("ResizeHandle", JSON.stringify(ScrubberState, null, 2));
  const scale = useCurrentScale();
  const size = Math.round(HANDLE_SIZE / scale);
  const borderSize = 1 / scale;
  const newScrubberStateRef = React.useRef<ScrubberState>(ScrubberState);
  
  // Update ref when ScrubberState changes
  React.useEffect(() => {
    newScrubberStateRef.current = ScrubberState;
  }, [ScrubberState]);

  const sizeStyle: React.CSSProperties = useMemo(() => {
    return {
      position: "absolute",
      height: size,
      width: size,
      backgroundColor: "white",
      border: `${borderSize}px solid rgb(59, 130, 246)`, // Use consistent blue
      borderRadius: "2px",
    };
  }, [borderSize, size]);

  const margin = -size / 2 - borderSize;

  const style: React.CSSProperties = useMemo(() => {
    if (type === "top-left") {
      return {
        ...sizeStyle,
        marginLeft: margin,
        marginTop: margin,
        cursor: "nwse-resize",
      };
    }

    if (type === "top-right") {
      return {
        ...sizeStyle,
        marginTop: margin,
        marginRight: margin,
        right: 0,
        cursor: "nesw-resize",
      };
    }

    if (type === "bottom-left") {
      return {
        ...sizeStyle,
        marginBottom: margin,
        marginLeft: margin,
        bottom: 0,
        cursor: "nesw-resize",
      };
    }

    if (type === "bottom-right") {
      return {
        ...sizeStyle,
        marginBottom: margin,
        marginRight: margin,
        right: 0,
        bottom: 0,
        cursor: "nwse-resize",
      };
    }

    throw new Error("Unknown type: " + JSON.stringify(type));
  }, [margin, sizeStyle, type]);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      // console.log('onPointerDown is called');
      e.stopPropagation();
      if (e.button !== 0) {
        return;
      }

      const initialX = e.clientX;
      const initialY = e.clientY;

      const onPointerMove = (pointerMoveEvent: PointerEvent) => {
        const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
        const offsetY = (pointerMoveEvent.clientY - initialY) / scale;

        const isLeft = type === "top-left" || type === "bottom-left";
        const isTop = type === "top-left" || type === "top-right";

        const newWidth =
          ScrubberState.width_player + (isLeft ? -offsetX : offsetX);
        const newHeight =
          ScrubberState.height_player + (isTop ? -offsetY : offsetY);
        const newLeft = ScrubberState.left_player + (isLeft ? offsetX : 0);
        const newTop = ScrubberState.top_player + (isTop ? offsetY : 0);
        // console.log('newWidth', newWidth);
        // console.log('newHeight', newHeight);
        // console.log('newLeft', newLeft);
        // console.log('newTop', newTop);
        // console.log('ScrubberState before openpointermove update', ScrubberState);
        newScrubberStateRef.current = {
          ...newScrubberStateRef.current,
          width_player: Math.max(1, Math.round(newWidth)),
          height_player: Math.max(1, Math.round(newHeight)),
          left_player: Math.round(newLeft),
          top_player: Math.round(newTop),
          is_dragging: true,
        };
        setItem(newScrubberStateRef.current);
        // console.log('ScrubberState after openpointermove update',
        //   JSON.stringify(ScrubberState, null, 2)
        // );
      };

      const onPointerUp = (e: PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setItem({
          ...newScrubberStateRef.current,
          is_dragging: false,
        });
        window.removeEventListener("pointermove", onPointerMove);
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, {
        once: true,
      });
    },
    [ScrubberState, scale, setItem, type]
  );

  return <div onPointerDown={onPointerDown} style={style} />;
};

export const SelectionOutline: React.FC<{
  ScrubberState: ScrubberState;
  changeItem: (updatedScrubber: ScrubberState) => void;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
  selectedItem: string | null;
  isDragging: boolean;
}> = ({
  ScrubberState,
  changeItem,
  setSelectedItem,
  selectedItem,
  isDragging,
}) => {
  // console.log("SelectionOutline", JSON.stringify(ScrubberState, null, 2));
  const scale = useCurrentScale();
  const scaledBorder = Math.ceil(2 / scale);
  const newScrubberStateRef = React.useRef<ScrubberState>(ScrubberState);
  
  // Update ref when ScrubberState changes
  React.useEffect(() => {
    newScrubberStateRef.current = ScrubberState;
  }, [ScrubberState]);

  const [hovered, setHovered] = React.useState(false);

  const onMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const isSelected = ScrubberState.id === selectedItem;
  // console.log("isSelected", isSelected);
  const style: React.CSSProperties = useMemo(() => {
    return {
      width: ScrubberState.width_player,
      height: ScrubberState.height_player,
      left: ScrubberState.left_player,
      top: ScrubberState.top_player,
      position: "absolute",
      outline:
        (hovered && !isDragging) || isSelected
          ? `${scaledBorder}px solid rgb(59, 130, 246)` // Use a consistent blue
          : undefined,
      userSelect: "none",
      touchAction: "none",
    };
  }, [ScrubberState, hovered, isDragging, isSelected, scaledBorder]);

  const startDragging = useCallback(
    (e: PointerEvent | React.MouseEvent) => {
      e.stopPropagation();
      const initialX = e.clientX;
      const initialY = e.clientY;
      
      // Store initial positions from current state
      const initialLeftPlayer = ScrubberState.left_player;
      const initialTopPlayer = ScrubberState.top_player;

      const onPointerMove = (pointerMoveEvent: PointerEvent) => {
        const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
        const offsetY = (pointerMoveEvent.clientY - initialY) / scale;
        newScrubberStateRef.current = {
          ...newScrubberStateRef.current,
          left_player: Math.round(initialLeftPlayer + offsetX),
          top_player: Math.round(initialTopPlayer + offsetY),
          is_dragging: true,
        };
        changeItem(newScrubberStateRef.current);
      };

      const onPointerUp = (e: PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        // console.log(
        //   "onPointerUp is called",
        //   JSON.stringify(ScrubberState, null, 2)
        // );
        
        // Maintain selection after drag
        const currentId = newScrubberStateRef.current.id;
        if (selectedItem === currentId) {
          // Re-select after update to maintain selection
          setTimeout(() => {
            setSelectedItem(currentId);
          }, 0);
        }
        
        changeItem({
          ...newScrubberStateRef.current,
          is_dragging: false,
        });
        window.removeEventListener("pointermove", onPointerMove);
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });

      window.addEventListener("pointerup", onPointerUp, {
        once: true,
      });
    },
    [ScrubberState, scale, changeItem, selectedItem, setSelectedItem]
  );

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (e.button !== 0) {
        return;
      }

      setSelectedItem(ScrubberState.id);
      startDragging(e);
    },
    [ScrubberState, setSelectedItem, startDragging]
  );

  return (
    <div
      data-item-type="canvas-item"
      onPointerDown={onPointerDown}
      onPointerEnter={onMouseEnter}
      onPointerLeave={onMouseLeave}
      style={style}
    >
      {isSelected ? (
        <>
          <ResizeHandle
            ScrubberState={ScrubberState}
            setItem={changeItem}
            type="top-left"
          />
          <ResizeHandle
            ScrubberState={ScrubberState}
            setItem={changeItem}
            type="top-right"
          />
          <ResizeHandle
            ScrubberState={ScrubberState}
            setItem={changeItem}
            type="bottom-left"
          />
          <ResizeHandle
            ScrubberState={ScrubberState}
            setItem={changeItem}
            type="bottom-right"
          />
        </>
      ) : null}
    </div>
  );
};

const displaySelectedItemOnTop = (
  items: ScrubberState[],
  selectedItem: string | null
): ScrubberState[] => {
  const selectedItems = items.filter(
    (ScrubberState) => ScrubberState.id === selectedItem
  );
  const unselectedItems = items.filter(
    (ScrubberState) => ScrubberState.id !== selectedItem
  );

  return [...unselectedItems, ...selectedItems];
};

export const layerContainer: React.CSSProperties = {
  overflow: "hidden",
};

export const outer: React.CSSProperties = {
  backgroundColor: "#ffffff", // White background for video preview
  position: "absolute",
  width: "100%",
  height: "100%",
};

export const SortedOutlines: React.FC<{
  timeline: TimelineState;
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
  handleUpdateScrubber: (updateScrubber: ScrubberState) => void;
}> = ({ timeline, selectedItem, setSelectedItem, handleUpdateScrubber }) => {
  // const items = timeline.tracks.flatMap((track: TrackState) => track.scrubbers);
  // console.log('timeline', timeline);
  const itemsToDisplay = React.useMemo(() => {
    return displaySelectedItemOnTop(
      timeline.tracks.flatMap((track: TrackState) => track.scrubbers),
      selectedItem
    );
  }, [timeline, selectedItem]);

  const isDragging = React.useMemo(
    () =>
      timeline.tracks
        .flatMap((track: TrackState) => track.scrubbers)
        .some((ScrubberState) => ScrubberState.is_dragging),
    [timeline]
  );

  return itemsToDisplay.map((ScrubberState) => {
    return (
      <Sequence
        key={ScrubberState.id}
        from={Math.round((ScrubberState.left / PIXELS_PER_SECOND) * FPS)}
        durationInFrames={Math.round(
          (ScrubberState.width / PIXELS_PER_SECOND) * FPS
        )}
        layout="none"
      >
        <SelectionOutline
          changeItem={handleUpdateScrubber}
          ScrubberState={ScrubberState}
          setSelectedItem={setSelectedItem}
          selectedItem={selectedItem}
          isDragging={isDragging}
        />
      </Sequence>
    );
  });
};

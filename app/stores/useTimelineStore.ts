import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  PIXELS_PER_SECOND,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  type TimelineState,
  type TrackState,
  type ScrubberState,
  type MediaBinItem,
  type Keyframe,
  type AnimatableProperties,
  FPS,
} from '../components/timeline/types'
import { generateUUID } from '../utils/uuid'

interface TimelineStore extends TimelineState {
  timelineWidth: number
  zoomLevel: number
  
  setTimeline: (timeline: TimelineState) => void
  setTimelineWidth: (width: number) => void
  setZoomLevel: (level: number) => void
  
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleZoomReset: () => void
  
  handleAddTrack: () => string
  handleDeleteTrack: (trackId: string) => void
  
  handleUpdateScrubber: (updatedScrubber: ScrubberState) => void
  handleDeleteScrubber: (scrubberId: string) => void
  handleDeleteScrubbersByMediaBinId: (mediaBinId: string) => void
  handleAddScrubberToTrack: (trackId: string, newScrubber: ScrubberState) => void
  
  handleDropOnTrack: (item: MediaBinItem, trackId: string, dropLeftPx: number, pixelsPerSecond: number) => void
  handleDropOnNewTrack: (item: MediaBinItem, dropLeftPx: number, trackCount: number, pixelsPerSecond: number) => void
  handleSplitScrubberAtRuler: (rulerPositionPx: number, selectedScrubberId: string | null, pixelsPerSecond: number) => number
  
  handleAddKeyframe: (scrubberId: string, time: number, properties: AnimatableProperties) => void
  handleUpdateKeyframe: (scrubberId: string, keyframeId: string, properties: AnimatableProperties) => void
  handleDeleteKeyframe: (scrubberId: string, keyframeId: string) => void
  handleMoveKeyframe: (scrubberId: string, keyframeId: string, newTime: number) => void
  
  getAllScrubbers: () => ScrubberState[]
  expandTimeline: (currentScrollRight: number) => boolean
}

const EXPANSION_THRESHOLD = 200
const EXPANSION_AMOUNT = 1000

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      tracks: [
        { id: 'track-1', scrubbers: [] },
        { id: 'track-2', scrubbers: [] },
        { id: 'track-3', scrubbers: [] },
      ],
      timelineWidth: 2000,
      zoomLevel: DEFAULT_ZOOM,

      setTimeline: (timeline) => set({ tracks: timeline.tracks }),
      setTimelineWidth: (width) => set({ timelineWidth: width }),
      setZoomLevel: (level) => set({ zoomLevel: level }),

      handleZoomIn: () => {
        const currentZoom = get().zoomLevel
        const newZoom = Math.min(MAX_ZOOM, currentZoom * 1.5)
        const zoomRatio = newZoom / currentZoom

        set((state) => ({
          zoomLevel: newZoom,
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => ({
              ...scrubber,
              left: scrubber.left * zoomRatio,
              width: scrubber.width * zoomRatio,
            })),
          })),
        }))
      },

      handleZoomOut: () => {
        const currentZoom = get().zoomLevel
        const newZoom = Math.max(MIN_ZOOM, currentZoom / 1.5)
        const zoomRatio = newZoom / currentZoom

        set((state) => ({
          zoomLevel: newZoom,
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => ({
              ...scrubber,
              left: scrubber.left * zoomRatio,
              width: scrubber.width * zoomRatio,
            })),
          })),
        }))
      },

      handleZoomReset: () => {
        const currentZoom = get().zoomLevel
        const newZoom = DEFAULT_ZOOM
        const zoomRatio = newZoom / currentZoom

        set((state) => ({
          zoomLevel: newZoom,
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => ({
              ...scrubber,
              left: scrubber.left * zoomRatio,
              width: scrubber.width * zoomRatio,
            })),
          })),
        }))
      },

      handleAddTrack: () => {
        const newTrackId = generateUUID()
        const newTrack: TrackState = {
          id: newTrackId,
          scrubbers: [],
        }
        set((state) => ({
          tracks: [...state.tracks, newTrack],
        }))
        return newTrackId
      },

      handleDeleteTrack: (trackId) => {
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== trackId),
        }))
      },

      getAllScrubbers: () => {
        const state = get()
        return state.tracks.flatMap((track) => track.scrubbers)
      },

      handleUpdateScrubber: (updatedScrubber) => {
        set((state) => {
          const currentTrackIndex = state.tracks.findIndex((track) =>
            track.scrubbers.some((scrubber) => scrubber.id === updatedScrubber.id)
          )

          const newTrackIndex = updatedScrubber.y || 0

          if (currentTrackIndex === newTrackIndex) {
            return {
              tracks: state.tracks.map((track) => ({
                ...track,
                scrubbers: track.scrubbers.map((scrubber) =>
                  scrubber.id === updatedScrubber.id ? updatedScrubber : scrubber
                ),
              })),
            }
          }

          return {
            tracks: state.tracks.map((track, index) => {
              if (index === currentTrackIndex) {
                return {
                  ...track,
                  scrubbers: track.scrubbers.filter((scrubber) => scrubber.id !== updatedScrubber.id),
                }
              } else if (index === newTrackIndex) {
                return {
                  ...track,
                  scrubbers: [...track.scrubbers, updatedScrubber],
                }
              }
              return track
            }),
          }
        })
      },

      handleDeleteScrubber: (scrubberId) => {
        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.filter((scrubber) => scrubber.id !== scrubberId),
          })),
        }))
      },

      handleDeleteScrubbersByMediaBinId: (mediaBinId) => {
        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.filter(
              (scrubber) => scrubber.sourceMediaBinId !== mediaBinId
            ),
          })),
        }))
      },

      handleAddScrubberToTrack: (trackId, newScrubber) => {
        console.log("Adding scrubber to track", trackId, newScrubber)
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId
              ? { ...track, scrubbers: [...track.scrubbers, newScrubber] }
              : track
          ),
        }))
      },

      handleDropOnNewTrack: (item, dropLeftPx, trackCount, pixelsPerSecond) => {
        console.log("Creating new tracks and dropping media", item.name)
        
        let widthPx = item.mediaType === "text" ? 80 : 150
        if ((item.mediaType === "video" || item.mediaType === "audio") && item.durationInSeconds) {
          widthPx = item.durationInSeconds * pixelsPerSecond
        } else if (item.mediaType === "image") {
          widthPx = 100
        }
        widthPx = Math.max(20, widthPx)

        const playerWidth =
          item.mediaType === "text" && item.media_width === 0
            ? Math.max(
                200,
                (item.text?.textContent?.length || 10) *
                (item.text?.fontSize || 48) *
                0.6
              )
            : item.media_width
        const playerHeight =
          item.mediaType === "text" && item.media_height === 0
            ? Math.max(80, (item.text?.fontSize || 48) * 1.5)
            : item.media_height

        set((state) => {
          const currentTrackCount = state.tracks.length
          const tracksToCreate = Math.max(0, trackCount - currentTrackCount + 1)
          
          const newTracks: TrackState[] = []
          for (let i = 0; i < tracksToCreate; i++) {
            newTracks.push({
              id: generateUUID(),
              scrubbers: [],
            })
          }
          
          const targetTrackIndex = trackCount
          const newScrubber: ScrubberState = {
            id: generateUUID(),
            left: dropLeftPx,
            width: widthPx,
            mediaType: item.mediaType,
            mediaUrlLocal: item.mediaUrlLocal,
            mediaUrlRemote: item.mediaUrlRemote,
            y: targetTrackIndex,
            name: item.name,
            durationInSeconds: item.durationInSeconds,
            media_width: item.media_width,
            media_height: item.media_height,
            text: item.text,
            sourceMediaBinId: item.id,
            left_player: 100,
            top_player: 100,
            width_player: playerWidth,
            height_player: playerHeight,
            is_dragging: false,
            uploadProgress: item.uploadProgress,
            isUploading: item.isUploading,
            trimBefore: null,
            trimAfter: null,
          }
          
          if (newTracks.length > 0) {
            newTracks[newTracks.length - 1].scrubbers.push(newScrubber)
          }
          
          return {
            tracks: [...state.tracks, ...newTracks],
          }
        })
      },

      handleDropOnTrack: (item, trackId, dropLeftPx, pixelsPerSecond) => {
        console.log("Dropped", item.name, "on track", trackId, "at", dropLeftPx, "px")

        const state = get()
        const targetTrackIndex = state.tracks.findIndex((t) => t.id === trackId)
        if (targetTrackIndex === -1) return

        let widthPx = item.mediaType === "text" ? 80 : 150
        if ((item.mediaType === "video" || item.mediaType === "audio") && item.durationInSeconds) {
          widthPx = item.durationInSeconds * pixelsPerSecond
        } else if (item.mediaType === "image") {
          widthPx = 100
        }
        widthPx = Math.max(20, widthPx)

        const playerWidth =
          item.mediaType === "text" && item.media_width === 0
            ? Math.max(
                200,
                (item.text?.textContent?.length || 10) *
                (item.text?.fontSize || 48) *
                0.6
              )
            : item.media_width
        const playerHeight =
          item.mediaType === "text" && item.media_height === 0
            ? Math.max(80, (item.text?.fontSize || 48) * 1.5)
            : item.media_height

        const newScrubber: ScrubberState = {
          id: generateUUID(),
          left: dropLeftPx,
          width: widthPx,
          mediaType: item.mediaType,
          mediaUrlLocal: item.mediaUrlLocal,
          mediaUrlRemote: item.mediaUrlRemote,
          y: targetTrackIndex,
          name: item.name,
          durationInSeconds: item.durationInSeconds,
          media_width: item.media_width,
          media_height: item.media_height,
          text: item.text,
          sourceMediaBinId: item.id,
          left_player: 100,
          top_player: 100,
          width_player: playerWidth,
          height_player: playerHeight,
          is_dragging: false,
          uploadProgress: item.uploadProgress,
          isUploading: item.isUploading,
          trimBefore: null,
          trimAfter: null,
        }

        get().handleAddScrubberToTrack(trackId, newScrubber)
      },

      handleSplitScrubberAtRuler: (rulerPositionPx, selectedScrubberId, pixelsPerSecond) => {
        if (!selectedScrubberId) {
          return 0
        }

        const splitTimeInSeconds = rulerPositionPx / pixelsPerSecond
        const allScrubbers = get().getAllScrubbers()
        const selectedScrubber = allScrubbers.find((scrubber) => scrubber.id === selectedScrubberId)

        if (!selectedScrubber) {
          return 0
        }

        const startTime = selectedScrubber.left / pixelsPerSecond
        const endTime = (selectedScrubber.left + selectedScrubber.width) / pixelsPerSecond

        if (splitTimeInSeconds <= startTime || splitTimeInSeconds >= endTime) {
          return 0
        }

        const scrubberDuration = endTime - startTime
        const splitOffsetTime = splitTimeInSeconds - startTime

        const currentTrimBefore = selectedScrubber.trimBefore || 0
        const currentTrimAfter = selectedScrubber.trimAfter || 0

        const splitFrameOffset = Math.round(splitOffsetTime * FPS)
        const splitFrameInOriginal = currentTrimBefore + splitFrameOffset

        const displayedDurationFrames = Math.round(scrubberDuration * FPS)
        const originalDurationFrames = selectedScrubber.durationInSeconds
          ? Math.round(selectedScrubber.durationInSeconds * FPS)
          : currentTrimBefore + displayedDurationFrames + currentTrimAfter

        const firstScrubber: ScrubberState = {
          ...selectedScrubber,
          id: generateUUID(),
          width: splitOffsetTime * pixelsPerSecond,
          trimBefore: currentTrimBefore,
          trimAfter: originalDurationFrames - splitFrameInOriginal,
        }

        const secondScrubber: ScrubberState = {
          ...selectedScrubber,
          id: generateUUID(),
          left: selectedScrubber.left + splitOffsetTime * pixelsPerSecond,
          width: (scrubberDuration - splitOffsetTime) * pixelsPerSecond,
          trimBefore: splitFrameInOriginal,
          trimAfter: currentTrimAfter,
        }

        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.flatMap((scrubber) => {
              if (scrubber.id === selectedScrubberId) {
                return [firstScrubber, secondScrubber]
              }
              return [scrubber]
            }),
          })),
        }))

        return 1
      },

      handleAddKeyframe: (scrubberId, time, properties) => {
        const newKeyframe: Keyframe = {
          id: generateUUID(),
          time,
          properties,
        }

        console.log('➕ Adding keyframe:', {
          scrubberId,
          time,
          properties,
          keyframeId: newKeyframe.id,
        })

        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => {
              if (scrubber.id === scrubberId) {
                const keyframes = scrubber.keyframes || []
                const updatedKeyframes = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time)
                console.log('✅ Keyframes after adding:', updatedKeyframes)
                return {
                  ...scrubber,
                  keyframes: updatedKeyframes,
                }
              }
              return scrubber
            }),
          })),
        }))
      },

      handleUpdateKeyframe: (scrubberId, keyframeId, properties) => {
        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => {
              if (scrubber.id === scrubberId && scrubber.keyframes) {
                return {
                  ...scrubber,
                  keyframes: scrubber.keyframes.map((kf) =>
                    kf.id === keyframeId ? { ...kf, properties } : kf
                  ),
                }
              }
              return scrubber
            }),
          })),
        }))
      },

      handleDeleteKeyframe: (scrubberId, keyframeId) => {
        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => {
              if (scrubber.id === scrubberId && scrubber.keyframes) {
                return {
                  ...scrubber,
                  keyframes: scrubber.keyframes.filter((kf) => kf.id !== keyframeId),
                }
              }
              return scrubber
            }),
          })),
        }))
      },

      handleMoveKeyframe: (scrubberId, keyframeId, newTime) => {
        set((state) => ({
          tracks: state.tracks.map((track) => ({
            ...track,
            scrubbers: track.scrubbers.map((scrubber) => {
              if (scrubber.id === scrubberId && scrubber.keyframes) {
                return {
                  ...scrubber,
                  keyframes: scrubber.keyframes
                    .map((kf) => (kf.id === keyframeId ? { ...kf, time: newTime } : kf))
                    .sort((a, b) => a.time - b.time),
                }
              }
              return scrubber
            }),
          })),
        }))
      },

      expandTimeline: (currentScrollRight) => {
        const state = get()
        const distanceToEnd = state.timelineWidth - currentScrollRight

        if (distanceToEnd < EXPANSION_THRESHOLD) {
          set({ timelineWidth: state.timelineWidth + EXPANSION_AMOUNT })
          return true
        }
        return false
      },
    }),
    {
      name: 'timeline-storage',
      partialize: (state) => ({
        tracks: state.tracks,
        timelineWidth: state.timelineWidth,
        zoomLevel: state.zoomLevel,
      }),
    }
  )
)
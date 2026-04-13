import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NormalizedTimelineEvent, TimelineViewport } from '../lib/types';

type TimelineMiniMapProps = {
  events: NormalizedTimelineEvent[];
  viewport: TimelineViewport;
  height: number;
  domainStartMs: number;
  domainEndMs: number;
  variant?: 'default' | 'nano';
  onViewportChange?: (nextViewport: TimelineViewport) => void;
};

type DragState = {
  pointerStartY: number;
  viewportTopStart: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function mapToMiniMapY(ts: number, domainStartMs: number, domainEndMs: number, height: number) {
  const duration = domainEndMs - domainStartMs;
  if (duration <= 0 || height <= 0) {
    return 0;
  }
  return clamp01((ts - domainStartMs) / duration) * height;
}

function buildDensityBins(
  events: NormalizedTimelineEvent[],
  domainStartMs: number,
  domainEndMs: number,
  height: number
) {
  const binCount = Math.max(24, Math.min(120, Math.round(height / 4)));
  const bins = Array.from({ length: binCount }, () => 0);
  const duration = domainEndMs - domainStartMs;

  if (duration <= 0 || height <= 0) {
    return { bins, binCount, maxCount: 0 };
  }

  for (const event of events) {
    const startRatio = clamp01((event.startMs - domainStartMs) / duration);
    const endRatio = clamp01((event.endMs - domainStartMs) / duration);
    const startIndex = Math.max(0, Math.min(binCount - 1, Math.floor(startRatio * (binCount - 1))));
    const endIndex = Math.max(startIndex, Math.min(binCount - 1, Math.ceil(endRatio * (binCount - 1))));

    for (let index = startIndex; index <= endIndex; index += 1) {
      bins[index] += 1;
    }
  }

  const maxCount = bins.reduce((max, count) => Math.max(max, count), 0);
  return { bins, binCount, maxCount };
}

function getDensityColor(intensity: number) {
  const clamped = clamp01(intensity);
  return `color-mix(in srgb, var(--tl-color-minimap-density-low) ${(1 - clamped) * 100}%, var(--tl-color-minimap-density-high) ${clamped * 100}%)`;
}

function centerViewportOnRatio(
  ratio: number,
  viewport: TimelineViewport,
  domainStartMs: number,
  domainEndMs: number
) {
  const domainDuration = domainEndMs - domainStartMs;
  const viewportDuration = viewport.visibleEndMs - viewport.visibleStartMs;

  if (domainDuration <= 0 || viewportDuration <= 0) {
    return viewport;
  }

  const clampedRatio = clamp01(ratio);
  const targetMs = domainStartMs + clampedRatio * domainDuration;
  const maxStartMs = Math.max(domainStartMs, domainEndMs - viewportDuration);
  const nextStartMs = Math.min(
    Math.max(domainStartMs, targetMs - viewportDuration / 2),
    maxStartMs
  );

  return {
    ...viewport,
    visibleStartMs: nextStartMs,
    visibleEndMs: nextStartMs + viewportDuration,
  };
}

export function TimelineMiniMap({
  events,
  viewport,
  height,
  domainStartMs,
  domainEndMs,
  variant = 'default',
  onViewportChange,
}: TimelineMiniMapProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [bodyHeight, setBodyHeight] = useState(height);

  useLayoutEffect(() => {
    const node = bodyRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = node.clientHeight;
      if (nextHeight > 0) {
        setBodyHeight(nextHeight);
      }
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, [height]);

  const miniMapHeight = bodyHeight > 0 ? bodyHeight : height;
  const viewportTop = mapToMiniMapY(viewport.visibleStartMs, domainStartMs, domainEndMs, miniMapHeight);
  const viewportBottom = mapToMiniMapY(viewport.visibleEndMs, domainStartMs, domainEndMs, miniMapHeight);
  const viewportHeight = Math.max(18, viewportBottom - viewportTop);
  const viewportSafeTop = Math.min(
    Math.max(0, viewportTop),
    Math.max(0, miniMapHeight - viewportHeight)
  );
  const viewportDuration = viewport.visibleEndMs - viewport.visibleStartMs;
  const domainDuration = domainEndMs - domainStartMs;

  useEffect(() => {
    if (!dragState) {
      return;
    }
    const activeDrag = dragState;

    function handlePointerMove(event: PointerEvent) {
      if (!onViewportChange || domainDuration <= viewportDuration || miniMapHeight <= viewportHeight) {
        return;
      }

      const deltaY = event.clientY - activeDrag.pointerStartY;
      const maxTop = Math.max(0, miniMapHeight - viewportHeight);
      const nextTop = Math.max(0, Math.min(maxTop, activeDrag.viewportTopStart + deltaY));
      const ratio = maxTop <= 0 ? 0 : nextTop / maxTop;
      const nextStartMs = domainStartMs + ratio * (domainDuration - viewportDuration);
      const nextEndMs = nextStartMs + viewportDuration;

      onViewportChange({
        ...viewport,
        visibleStartMs: nextStartMs,
        visibleEndMs: nextEndMs,
      });
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    dragState,
    domainDuration,
    domainStartMs,
    miniMapHeight,
    onViewportChange,
    viewport,
    viewportDuration,
    viewportHeight,
  ]);

  const majorYears = [domainStartMs, (domainStartMs + domainEndMs) / 2, domainEndMs].map((ts) =>
    new Date(ts).getUTCFullYear()
  );
  const { bins, binCount, maxCount } = buildDensityBins(
    events,
    domainStartMs,
    domainEndMs,
    miniMapHeight
  );
  const binHeight = binCount > 0 ? miniMapHeight / binCount : miniMapHeight;
  const isNano = variant === 'nano';

  function jumpToPointerY(clientY: number) {
    if (!onViewportChange || miniMapHeight <= 0) {
      return;
    }

    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect || rect.height <= 0) {
      return;
    }

    const ratio = (clientY - rect.top) / rect.height;
    onViewportChange(centerViewportOnRatio(ratio, viewport, domainStartMs, domainEndMs));
  }

  return (
    <aside className={`tl-minimap${isNano ? ' tl-minimap-nano' : ''}`} aria-label="Timeline overview">
      {!isNano ? (
        <div className="tl-minimap-header">
          <span>Overview</span>
          <span className="tl-minimap-range">
            {new Date(domainStartMs).getUTCFullYear()} - {new Date(domainEndMs).getUTCFullYear()}
          </span>
        </div>
      ) : null}
      <div
        ref={bodyRef}
        className="tl-minimap-body"
        onPointerDown={(event) => {
          jumpToPointerY(event.clientY);
        }}
      >
        <div className="tl-minimap-track" />
        <div className="tl-minimap-density">
          {bins.map((count, index) => {
            if (count <= 0 || maxCount <= 0) {
              return null;
            }
            const intensity = count / maxCount;
            const top = index * binHeight;
            const safeTop = Math.min(top, Math.max(0, miniMapHeight - binHeight));
            return (
              <div
                key={`density-${index}`}
                className="tl-minimap-density-bin"
                title={`${count} events`}
                style={{
                  top: safeTop,
                  height: Math.max(3, binHeight),
                  width: isNano ? '5px' : `${8 + intensity * 18}px`,
                  backgroundColor: getDensityColor(intensity),
                }}
              />
            );
          })}
        </div>
        <div
          className="tl-minimap-viewport"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragState({
              pointerStartY: event.clientY,
              viewportTopStart: viewportSafeTop,
            });
          }}
          style={{
            top: viewportSafeTop,
            height: viewportHeight,
          }}
        />
        {!isNano
          ? majorYears.map((year, index) => (
              <div
                key={`${year}-${index}`}
                className="tl-minimap-label"
                style={{ top: `${index * 50}%` }}
              >
                {year}
              </div>
            ))
          : null}
      </div>
    </aside>
  );
}

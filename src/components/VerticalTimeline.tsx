import { useEffect, useRef, useState } from 'react';
import type { WheelEvent } from 'react';
import type { VerticalTimelineProps } from '../lib/types';
import {
  clampZoomUnit,
  generateTicks,
  getZoomedInUnit,
  getZoomedOutUnit,
  normalizeDateInput,
  shiftViewport,
  zoomViewport,
} from '../lib/timeScale';
import { normalizeEvents } from '../lib/normalizeEvents';
import { useTimelineViewport } from '../hooks/useTimelineViewport';
import { TimelineAxis } from './TimelineAxis';
import { TimelineEventLayer } from './TimelineEventLayer';
import { TimelineMiniMap } from './TimelineMiniMap';
import '../styles/tokens.css';
import '../styles/verticalTimeline.css';

export function VerticalTimeline({
  events,
  startBound,
  endBound,
  maxZoomUnit = 'century',
  minZoomUnit = 'day',
  initialZoomUnit = 'year',
  initialStart,
  initialEnd,
  initialCenter,
  viewport: controlledViewport,
  onViewportChange,
  renderEvent,
  onEventClick,
  height = 800,
  unitHeight = 100,
  clusterLaneLimit = 3,
  className,
  style,
}: VerticalTimelineProps) {
  const normalizedEvents = normalizeEvents(events);
  const effectiveInitialZoom = clampZoomUnit(initialZoomUnit, maxZoomUnit, minZoomUnit);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState(
    typeof height === 'number' ? height : 800
  );
  const { viewport, setViewport, startBoundMs, endBoundMs } = useTimelineViewport({
    events: normalizedEvents,
    startBound,
    endBound,
    maxZoomUnit,
    minZoomUnit,
    initialZoomUnit: effectiveInitialZoom,
    viewportHeight: measuredHeight,
    unitHeight,
    initialStart,
    initialEnd,
    initialCenter,
    viewport: controlledViewport,
    onViewportChange,
  });

  useEffect(() => {
    if (typeof height === 'number') {
      setMeasuredHeight(height);
      return;
    }
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.height) {
        setMeasuredHeight(entry.contentRect.height);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [height]);

  const ticks = generateTicks(viewport);
  const viewportDuration = viewport.visibleEndMs - viewport.visibleStartMs;
  const atTopBound =
    startBoundMs !== null && Math.abs(viewport.visibleStartMs - startBoundMs) < 1;
  const atBottomBound =
    endBoundMs !== null && Math.abs(viewport.visibleEndMs - endBoundMs) < 1;

  function updateZoom(direction: 'in' | 'out') {
    const nextZoom =
      direction === 'in'
        ? getZoomedInUnit(viewport.zoomUnit, minZoomUnit)
        : getZoomedOutUnit(viewport.zoomUnit, maxZoomUnit);
    const focalMs = viewport.visibleStartMs + (viewport.visibleEndMs - viewport.visibleStartMs) / 2;
    setViewport(
      zoomViewport(viewport, nextZoom, focalMs, measuredHeight, unitHeight, startBoundMs, endBoundMs)
    );
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
      const focalMs =
        viewport.visibleStartMs + (viewport.visibleEndMs - viewport.visibleStartMs) * ratio;
      const nextZoom =
        event.deltaY > 0
          ? getZoomedOutUnit(viewport.zoomUnit, maxZoomUnit)
          : getZoomedInUnit(viewport.zoomUnit, minZoomUnit);
      setViewport(
        zoomViewport(
          viewport,
          nextZoom,
          focalMs,
          measuredHeight,
          unitHeight,
          startBoundMs,
          endBoundMs
        )
      );
      return;
    }

    const deltaDirection = Math.sign(event.deltaY);
    if ((deltaDirection < 0 && atTopBound) || (deltaDirection > 0 && atBottomBound)) {
      return;
    }

    event.preventDefault();
    const rawRatio = event.deltaY / Math.max(measuredHeight, 1);
    const ratio = Math.max(-0.16, Math.min(0.16, rawRatio));
    if (viewportDuration <= 0 || ratio === 0) {
      return;
    }
    setViewport(shiftViewport(viewport, ratio, startBoundMs, endBoundMs));
  }

  const containerStyle = {
    ...style,
    height,
  };

  const boundsSummary =
    normalizeDateInput(startBound) !== null || normalizeDateInput(endBound) !== null
      ? `${startBound ? new Date(normalizeDateInput(startBound)!).getUTCFullYear() : '...'} - ${
          endBound ? new Date(normalizeDateInput(endBound)!).getUTCFullYear() : '...'
        }`
      : null;
  const eventDomainStartMs =
    startBoundMs ?? normalizedEvents.reduce((min, event) => Math.min(min, event.startMs), Number.POSITIVE_INFINITY);
  const eventDomainEndMs =
    endBoundMs ?? normalizedEvents.reduce((max, event) => Math.max(max, event.endMs), Number.NEGATIVE_INFINITY);
  const domainStartMs = Number.isFinite(eventDomainStartMs) ? eventDomainStartMs : viewport.visibleStartMs;
  const domainEndMs = Number.isFinite(eventDomainEndMs) ? eventDomainEndMs : viewport.visibleEndMs;

  return (
    <div
      ref={rootRef}
      className={`tl-root${className ? ` ${className}` : ''}`}
      style={containerStyle}
      onWheel={handleWheel}
    >
      <div className="tl-controls">
        <button type="button" className="tl-control-button" onClick={() => updateZoom('out')}>
          -
        </button>
        <div className="tl-zoom-readout">
          <span className="tl-zoom-unit">{viewport.zoomUnit}</span>
          {boundsSummary ? <span className="tl-bounds">{boundsSummary}</span> : null}
        </div>
        <button type="button" className="tl-control-button" onClick={() => updateZoom('in')}>
          +
        </button>
      </div>

      <div className="tl-surface">
        <TimelineAxis
          viewport={viewport}
          majorTicks={ticks.majorTicks}
          minorTicks={ticks.minorTicks}
          height={measuredHeight}
        />
        <TimelineEventLayer
          events={normalizedEvents}
          viewport={viewport}
          height={measuredHeight}
          laneLimit={clusterLaneLimit}
          renderEvent={renderEvent}
          onEventClick={onEventClick}
        />
        <TimelineMiniMap
          events={normalizedEvents}
          viewport={viewport}
          height={measuredHeight}
          domainStartMs={domainStartMs}
          domainEndMs={domainEndMs}
          onViewportChange={setViewport}
        />
      </div>
    </div>
  );
}

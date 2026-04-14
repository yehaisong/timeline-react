import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, WheelEvent } from 'react';
import type {
  NormalizedTimelineEvent,
  TimelineGeoJSONGeometry,
  TimelineResponsiveConfig,
  TimelineViewport,
  VerticalTimelineProps,
} from '../lib/types';
import {
  clampZoomUnit,
  generateTicks,
  getZoomedInUnit,
  getZoomedOutUnit,
  normalizeDateInput,
  shiftViewport,
  zoomViewport,
} from '../lib/timeScale';
import { formatNormalizedEventDate } from '../lib/eventDisplay';
import { normalizeEvents } from '../lib/normalizeEvents';
import { useTimelineViewport } from '../hooks/useTimelineViewport';
import { useResponsiveTimelineConfig } from '../hooks/useResponsiveTimelineConfig';
import { TimelineAxis } from './TimelineAxis';
import { TimelineEventLayer } from './TimelineEventLayer';
import { TimelineMiniMap } from './TimelineMiniMap';

const PAN_GESTURE_THRESHOLD_PX = 4;
const PINCH_ZOOM_IN_THRESHOLD = 1.07;
const PINCH_ZOOM_OUT_THRESHOLD = 0.93;

function summarizeGeometry(geometry: TimelineGeoJSONGeometry) {
  if (geometry.type === 'Point') {
    const [longitude, latitude] = geometry.coordinates;
    return `Point ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
  if (geometry.type === 'LineString') {
    return `LineString with ${geometry.coordinates.length} points`;
  }
  return `Polygon with ${geometry.coordinates.length} rings`;
}

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
  renderDetail,
  onEventClick,
  detailMode = 'slide',
  height = 800,
  unitHeight = 100,
  clusterLaneLimit = 3,
  display,
  theme,
  className,
  style,
}: VerticalTimelineProps) {
  const normalizedEvents = normalizeEvents(events);
  const mobileGroupCount = new Set(
    normalizedEvents.map((event) => event.groupId?.trim() || 'Ungrouped')
  ).size;
  const effectiveInitialZoom = clampZoomUnit(initialZoomUnit, maxZoomUnit, minZoomUnit);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const detailCloseTimeoutRef = useRef<number | null>(null);
  const activePointersRef = useRef<
    Map<number, { clientX: number; clientY: number; pointerType: string }>
  >(new Map());
  const panStateRef = useRef<{
    pointerId: number;
    startY: number;
    startViewport: {
      visibleStartMs: number;
      visibleEndMs: number;
    };
    moved: boolean;
  } | null>(null);
  const pinchStateRef = useRef<{
    distance: number;
    viewport: {
      visibleStartMs: number;
      visibleEndMs: number;
      zoomUnit: TimelineViewport['zoomUnit'];
    };
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [measuredWidth, setMeasuredWidth] = useState(1200);
  const [measuredHeight, setMeasuredHeight] = useState(
    typeof height === 'number' ? height : 800
  );
  const [detailEvent, setDetailEvent] = useState<NormalizedTimelineEvent | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const baseResponsive = useResponsiveTimelineConfig({ containerWidth: measuredWidth });
  const responsive: TimelineResponsiveConfig = {
    ...baseResponsive,
    showMiniMap: display?.showMiniMap ?? baseResponsive.showMiniMap,
    showMajorTicks: display?.showMajorTicks ?? baseResponsive.showMajorTicks,
    showMajorLabels: display?.showMajorLabels ?? baseResponsive.showMajorLabels,
    showMinorTicks: display?.showMinorTicks ?? baseResponsive.showMinorTicks,
    showMinorLabels: display?.showMinorLabels ?? baseResponsive.showMinorLabels,
    miniMapWidth: display?.miniMapWidth ?? baseResponsive.miniMapWidth,
    clusterLaneLimit: display?.clusterLaneLimit ?? baseResponsive.clusterLaneLimit,
  };
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
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const nextWidth = node.clientWidth;
      const nextHeight = typeof height === 'number' ? height : node.clientHeight;
      if (nextWidth > 0) {
        setMeasuredWidth(nextWidth);
      }
      if (typeof nextHeight === 'number' && nextHeight > 0) {
        setMeasuredHeight(nextHeight);
      }
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry?.contentRect) {
        return;
      }
      if (entry.contentRect.width > 0) {
        setMeasuredWidth(entry.contentRect.width);
      }
      if (typeof height !== 'number' && entry.contentRect.height > 0) {
        setMeasuredHeight(entry.contentRect.height);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    return () => {
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (detailMode === 'none') {
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
        detailCloseTimeoutRef.current = null;
      }
      setDetailVisible(false);
      setDetailEvent(null);
    }
  }, [detailMode]);

  useEffect(() => {
    if (!detailEvent) {
      return;
    }

    const stillExists = normalizedEvents.some((event) => event.id === detailEvent.id);
    if (!stillExists) {
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
        detailCloseTimeoutRef.current = null;
      }
      setDetailVisible(false);
      setDetailEvent(null);
    }
  }, [detailEvent, normalizedEvents]);

  useEffect(() => {
    if (!detailEvent) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setDetailVisible(true);
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDetail();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailEvent]);

  const ticks = generateTicks(viewport);
  const effectiveClusterLaneLimit = Math.min(
    display?.clusterLaneLimit ?? clusterLaneLimit,
    responsive.clusterLaneLimit
  );
  const collapseMobileGroups = responsive.mode === 'mobile' && mobileGroupCount > 2;
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

  function getTouchPair() {
    const touchPointers = Array.from(activePointersRef.current.entries()).filter(
      ([, pointer]) => pointer.pointerType === 'touch'
    );
    return touchPointers.length >= 2 ? touchPointers.slice(0, 2) : null;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }

    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType,
    });

    const touchPair = getTouchPair();
    if (touchPair) {
      const [, firstPointer] = touchPair[0];
      const [, secondPointer] = touchPair[1];
      pinchStateRef.current = {
        distance: Math.hypot(
          secondPointer.clientX - firstPointer.clientX,
          secondPointer.clientY - firstPointer.clientY
        ),
        viewport: {
          visibleStartMs: viewport.visibleStartMs,
          visibleEndMs: viewport.visibleEndMs,
          zoomUnit: viewport.zoomUnit,
        },
      };
      panStateRef.current = null;
      suppressClickRef.current = true;
      event.preventDefault();
      return;
    }

    if (!event.isPrimary) {
      return;
    }

    panStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startViewport: {
        visibleStartMs: viewport.visibleStartMs,
        visibleEndMs: viewport.visibleEndMs,
      },
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const activePointer = activePointersRef.current.get(event.pointerId);
    if (activePointer) {
      activePointer.clientX = event.clientX;
      activePointer.clientY = event.clientY;
    }

    const touchPair = getTouchPair();
    const pinchState = pinchStateRef.current;
    if (touchPair && pinchState) {
      const [, firstPointer] = touchPair[0];
      const [, secondPointer] = touchPair[1];
      const distance = Math.hypot(
        secondPointer.clientX - firstPointer.clientX,
        secondPointer.clientY - firstPointer.clientY
      );

      if (distance > 0 && pinchState.distance > 0) {
        const scale = distance / pinchState.distance;
        const rect = event.currentTarget.getBoundingClientRect();
        const midpointY = (firstPointer.clientY + secondPointer.clientY) / 2;
        const ratio = rect.height > 0 ? (midpointY - rect.top) / rect.height : 0.5;
        const focalMs =
          pinchState.viewport.visibleStartMs +
          (pinchState.viewport.visibleEndMs - pinchState.viewport.visibleStartMs) * ratio;

        let nextZoom = pinchState.viewport.zoomUnit;
        if (scale >= PINCH_ZOOM_IN_THRESHOLD) {
          nextZoom = getZoomedInUnit(pinchState.viewport.zoomUnit, minZoomUnit);
        } else if (scale <= PINCH_ZOOM_OUT_THRESHOLD) {
          nextZoom = getZoomedOutUnit(pinchState.viewport.zoomUnit, maxZoomUnit);
        }

        if (nextZoom !== pinchState.viewport.zoomUnit) {
          const nextViewport = zoomViewport(
            {
              visibleStartMs: pinchState.viewport.visibleStartMs,
              visibleEndMs: pinchState.viewport.visibleEndMs,
              zoomUnit: pinchState.viewport.zoomUnit,
            },
            nextZoom,
            focalMs,
            measuredHeight,
            unitHeight,
            startBoundMs,
            endBoundMs
          );
          setViewport(nextViewport);
          pinchStateRef.current = {
            distance,
            viewport: nextViewport,
          };
        }
      }

      suppressClickRef.current = true;
      event.preventDefault();
      return;
    }

    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - panState.startY;
    if (Math.abs(deltaY) > PAN_GESTURE_THRESHOLD_PX) {
      panState.moved = true;
      suppressClickRef.current = true;
    }

    const ratio = -deltaY / Math.max(measuredHeight, 1);
    if (ratio === 0) {
      return;
    }

    event.preventDefault();
    setViewport(
      shiftViewport(
        {
          visibleStartMs: panState.startViewport.visibleStartMs,
          visibleEndMs: panState.startViewport.visibleEndMs,
          zoomUnit: viewport.zoomUnit,
        },
        ratio,
        startBoundMs,
        endBoundMs
      )
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    activePointersRef.current.delete(event.pointerId);

    const panState = panStateRef.current;
    if (panState && panState.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      panStateRef.current = null;
    }

    const touchPair = getTouchPair();
    if (!touchPair) {
      pinchStateRef.current = null;
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) {
      return;
    }

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  const containerStyle = {
    ...style,
    height,
    ['--tl-axis-width' as string]: `${theme?.axisWidth ?? responsive.axisWidth}px`,
    ['--tl-axis-offset' as string]: `${theme?.axisOffset ?? responsive.axisOffset}px`,
    ['--tl-card-width' as string]: `${theme?.cardWidth ?? responsive.cardWidth}px`,
    ['--tl-card-max-width' as string]: `${theme?.cardMaxWidth ?? responsive.cardMaxWidth}px`,
    ['--tl-card-stack-offset' as string]: `${theme?.stackOffset ?? responsive.stackOffset}px`,
    ['--tl-label-shift' as string]: `${theme?.labelShift ?? responsive.labelShift}px`,
    ['--tl-minimap-width' as string]: `${responsive.miniMapWidth}px`,
    ['--tl-color-axis' as string]: theme?.axisColor,
    ['--tl-color-major-tick' as string]: theme?.majorTickColor,
    ['--tl-color-minor-tick' as string]: theme?.minorTickColor,
    ['--tl-label-pill-bg' as string]: theme?.labelPillBg,
    ['--tl-label-pill-text' as string]: theme?.labelPillText,
    ['--tl-color-event-card-bg' as string]: theme?.eventCardBg,
    ['--tl-color-event-card-text' as string]: theme?.eventCardText,
    ['--tl-color-event-card-border' as string]: theme?.eventCardBorder,
    ['--tl-color-event-card-hover-bg' as string]: theme?.eventCardHoverBg,
    ['--tl-color-event-card-active-border' as string]: theme?.eventCardActiveBorder,
    ['--tl-color-minimap-bg' as string]: theme?.miniMapBg,
    ['--tl-color-minimap-border' as string]: theme?.miniMapBorder,
    ['--tl-color-minimap-track' as string]: theme?.miniMapTrackColor,
    ['--tl-color-minimap-viewport-border' as string]: theme?.miniMapViewportBorder,
    ['--tl-color-minimap-viewport-bg' as string]: theme?.miniMapViewportBg,
    ['--tl-color-minimap-density-low' as string]: theme?.miniMapDensityLow,
    ['--tl-color-minimap-density-high' as string]: theme?.miniMapDensityHigh,
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
  const showBuiltInDetail = detailMode !== 'none' && detailEvent !== null;

  function handleEventClick(event: NormalizedTimelineEvent) {
    if (detailMode !== 'none') {
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
        detailCloseTimeoutRef.current = null;
      }
      setDetailEvent(event);
      setDetailVisible(false);
    }
    onEventClick?.(event);
  }

  function closeDetail() {
    if (detailCloseTimeoutRef.current !== null) {
      window.clearTimeout(detailCloseTimeoutRef.current);
    }
    setDetailVisible(false);
    detailCloseTimeoutRef.current = window.setTimeout(() => {
      setDetailEvent(null);
      detailCloseTimeoutRef.current = null;
    }, 220);
  }

  return (
    <div
      ref={rootRef}
      className={`tl-root tl-mode-${responsive.mode}${responsive.showMiniMap ? '' : ' tl-hide-minimap'}${collapseMobileGroups ? ' tl-mobile-collapsed-groups' : ''}${className ? ` ${className}` : ''}`}
      data-layout-mode={responsive.mode}
      style={containerStyle}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClickCapture={handleClickCapture}
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
          showMajorTicks={responsive.showMajorTicks}
          showMajorLabels={responsive.showMajorLabels}
          showMinorTicks={responsive.showMinorTicks}
          showMinorLabels={responsive.showMinorLabels}
        />
        <TimelineEventLayer
          events={normalizedEvents}
          viewport={viewport}
          height={measuredHeight}
          laneLimit={effectiveClusterLaneLimit}
          collapseGroups={collapseMobileGroups}
          renderEvent={renderEvent}
          onEventClick={handleEventClick}
        />
        {responsive.showMiniMap ? (
          <TimelineMiniMap
            events={normalizedEvents}
            viewport={viewport}
            height={measuredHeight}
            domainStartMs={domainStartMs}
            domainEndMs={domainEndMs}
            variant={responsive.mode === 'mobile' ? 'nano' : 'default'}
            onViewportChange={setViewport}
          />
        ) : null}
      </div>

      {showBuiltInDetail ? (
        <>
          <div
            className={`tl-detail-backdrop${detailMode === 'modal' ? ' tl-detail-backdrop-visible' : ' tl-detail-backdrop-soft'}${detailVisible ? ' tl-detail-backdrop-open' : ''}`}
            onClick={closeDetail}
          />
          <aside
            className={`tl-detail-surface tl-detail-surface-${detailMode}${detailVisible ? ' tl-detail-surface-open' : ''}`}
            aria-modal={detailMode === 'modal' ? 'true' : undefined}
            role={detailMode === 'modal' ? 'dialog' : 'complementary'}
          >
            <div className="tl-detail-header">
              <div>
                <p className="tl-detail-eyebrow">Event Detail</p>
                <h2 className="tl-detail-title">{detailEvent.title}</h2>
              </div>
              <button
                type="button"
                className="tl-detail-close"
                onClick={closeDetail}
                aria-label="Close event detail"
              >
                ×
              </button>
            </div>

            {renderDetail ? (
              <div className="tl-detail-body">{renderDetail(detailEvent)}</div>
            ) : (
              <div className="tl-detail-body">
                <p className="tl-detail-date">{formatNormalizedEventDate(detailEvent)}</p>

                {detailEvent.description ? (
                  <section className="tl-detail-section">
                    <h3 className="tl-detail-section-title">Summary</h3>
                    <p className="tl-detail-copy">{detailEvent.description}</p>
                  </section>
                ) : null}

                <section className="tl-detail-section">
                  <h3 className="tl-detail-section-title">Details</h3>
                  <dl className="tl-detail-grid">
                    <div>
                      <dt>ID</dt>
                      <dd>{detailEvent.id}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{detailEvent.isRange ? 'Range event' : 'Point event'}</dd>
                    </div>
                    <div>
                      <dt>Importance</dt>
                      <dd>{detailEvent.importance}</dd>
                    </div>
                    <div>
                      <dt>All day</dt>
                      <dd>{detailEvent.allDay ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt>Media</dt>
                      <dd>{detailEvent.media?.length ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Attachments</dt>
                      <dd>{detailEvent.attachments?.length ?? 0}</dd>
                    </div>
                  </dl>
                </section>

                {detailEvent.geo ? (
                  <section className="tl-detail-section">
                    <h3 className="tl-detail-section-title">Location</h3>
                    <p className="tl-detail-copy">
                      {detailEvent.geo.properties?.label
                        ? `${String(detailEvent.geo.properties.label)} · `
                        : ''}
                      {summarizeGeometry(detailEvent.geo.geometry)}
                    </p>
                  </section>
                ) : null}

                {detailEvent.media?.length ? (
                  <section className="tl-detail-section">
                    <h3 className="tl-detail-section-title">Media</h3>
                    <ul className="tl-detail-list">
                      {detailEvent.media.map((item, index) => (
                        <li key={item.id ?? `${item.type}-${index}`}>
                          <a href={item.url} target="_blank" rel="noreferrer">
                            {item.title ?? `${item.type} asset ${index + 1}`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {detailEvent.attachments?.length ? (
                  <section className="tl-detail-section">
                    <h3 className="tl-detail-section-title">Attachments</h3>
                    <ul className="tl-detail-list">
                      {detailEvent.attachments.map((item, index) => (
                        <li key={item.id ?? `${item.name}-${index}`}>
                          <a href={item.url} target="_blank" rel="noreferrer">
                            {item.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}

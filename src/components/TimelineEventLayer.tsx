import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';
import type { NormalizedTimelineEvent, TimelineViewport } from '../lib/types';
import { mapTimeToY } from '../lib/timeScale';
import { TimelineEventCard } from './TimelineEventCard';

type TimelineEventLayerProps = {
  events: NormalizedTimelineEvent[];
  viewport: TimelineViewport;
  height: number;
  laneLimit: number;
  renderEvent?: (event: NormalizedTimelineEvent) => ReactNode;
  onEventClick?: (event: NormalizedTimelineEvent) => void;
};

type Cluster = {
  key: string;
  y: number;
  events: NormalizedTimelineEvent[];
  visibleEvents: NormalizedTimelineEvent[];
  hiddenCount: number;
};

type ClusterPlacement = {
  side: 'left' | 'right';
  lane: number;
};

type ClusterRenderData = {
  cluster: Cluster;
  placements: Map<string, ClusterPlacement>;
  badgeSide: 'right';
  badgeLane: number;
};

const CARD_BASE_HEIGHT = 52;
const BADGE_GAP = 12;
const BADGE_HEIGHT = 26;

function formatEventDate(startMs: number, endMs: number, isRange: boolean) {
  const start = new Date(startMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (!isRange) {
    return start;
  }
  const end = new Date(endMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${start} - ${end}`;
}

function getVisibleEvents(events: NormalizedTimelineEvent[], viewport: TimelineViewport) {
  return events.filter(
    (event) =>
      event.endMs >= viewport.visibleStartMs && event.startMs <= viewport.visibleEndMs
  );
}

function clusterEvents(
  events: NormalizedTimelineEvent[],
  viewport: TimelineViewport,
  height: number,
  laneLimit: number
): Cluster[] {
  const sorted = getVisibleEvents(events, viewport)
    .map((event) => ({
      event,
      y: mapTimeToY(viewport, event.startMs, height),
    }))
    .sort((a, b) => a.y - b.y || b.event.importance - a.event.importance);

  const clusters: Cluster[] = [];
  const threshold = 18;

  for (const item of sorted) {
    const existing = clusters[clusters.length - 1];
    if (existing && Math.abs(existing.y - item.y) <= threshold) {
      existing.events.push(item.event);
      existing.y = Math.round((existing.y + item.y) / 2);
      continue;
    }
    clusters.push({
      key: `cluster-${item.event.id}-${item.y}`,
      y: item.y,
      events: [item.event],
      visibleEvents: [],
      hiddenCount: 0,
    });
  }

  for (const cluster of clusters) {
    cluster.events.sort((a, b) => {
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      if (a.startMs !== b.startMs) {
        return a.startMs - b.startMs;
      }
      return a.title.localeCompare(b.title);
    });
    cluster.visibleEvents = cluster.events.slice(0, laneLimit);
    cluster.hiddenCount = Math.max(0, cluster.events.length - laneLimit);
  }

  return clusters;
}

function buildClusterRenderData(clusters: Cluster[]): ClusterRenderData[] {
  return clusters.map((cluster) => {
    const placements = new Map<string, ClusterPlacement>();

    cluster.visibleEvents.forEach((event, index) => {
      placements.set(event.id, { side: 'right', lane: index });
    });

    return {
      cluster,
      placements,
      badgeSide: 'right',
      badgeLane: cluster.visibleEvents.length,
    };
  });
}

export function TimelineEventLayer({
  events,
  viewport,
  height,
  laneLimit,
  renderEvent,
  onEventClick,
}: TimelineEventLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const clusterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const clusterOverlayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const clusterPopoverRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [clusterOffsets, setClusterOffsets] = useState<Record<string, number>>({});
  const [popoverOffsets, setPopoverOffsets] = useState<Record<string, number>>({});
  const [openClusterKey, setOpenClusterKey] = useState<string | null>(null);
  const clusters = clusterEvents(events, viewport, height, laneLimit);
  const clusterRenderData = buildClusterRenderData(clusters);

  useEffect(() => {
    if (openClusterKey && !clusterRenderData.some(({ cluster }) => cluster.key === openClusterKey)) {
      setOpenClusterKey(null);
    }
  }, [clusterRenderData, openClusterKey]);

  useEffect(() => {
    if (!openClusterKey) {
      return;
    }
    const activeClusterKey = openClusterKey;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      const node = clusterOverlayRefs.current[activeClusterKey];
      if (node && target && !node.contains(target)) {
        setOpenClusterKey(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenClusterKey(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openClusterKey]);

  useLayoutEffect(() => {
    const layerNode = layerRef.current;
    if (!layerNode) {
      return;
    }

    const edgePadding = 12;
    const layerHeight = layerNode.clientHeight;
    const nextOffsets: Record<string, number> = {};

    for (const { cluster } of clusterRenderData) {
      const node = clusterRefs.current[cluster.key];
      if (!node) {
        nextOffsets[cluster.key] = 0;
        continue;
      }

      const clusterHeight = node.offsetHeight;
      const halfHeight = clusterHeight / 2;
      const topEdge = cluster.y - halfHeight;
      const bottomEdge = cluster.y + halfHeight;
      const minOffset = edgePadding - topEdge;
      const maxOffset = layerHeight - edgePadding - bottomEdge;
      let offset = 0;

      if (bottomEdge > layerHeight - edgePadding) {
        offset = maxOffset;
      }

      if (offset < minOffset) {
        offset = minOffset;
      }

      nextOffsets[cluster.key] = Math.round(offset);
    }

    setClusterOffsets((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextOffsets);
      const changed =
        currentKeys.length !== nextKeys.length ||
        nextKeys.some((key) => current[key] !== nextOffsets[key]);

      return changed ? nextOffsets : current;
    });
  }, [clusterRenderData, height, openClusterKey]);

  useLayoutEffect(() => {
    if (!openClusterKey) {
      setPopoverOffsets((current) => (Object.keys(current).length ? {} : current));
      return;
    }

    const layerNode = layerRef.current;
    const overlayNode = clusterOverlayRefs.current[openClusterKey];
    const popoverNode = clusterPopoverRefs.current[openClusterKey];
    if (!layerNode || !overlayNode || !popoverNode) {
      return;
    }

    const edgePadding = 12;
    const layerHeight = layerNode.clientHeight;
    const naturalTop = overlayNode.offsetTop + popoverNode.offsetTop;
    const naturalBottom = naturalTop + popoverNode.offsetHeight;
    let offset = 0;

    const bottomOverflow = naturalBottom - (layerHeight - edgePadding);
    if (bottomOverflow > 0) {
      offset -= bottomOverflow;
    }

    const topOverflow = edgePadding - (naturalTop + offset);
    if (topOverflow > 0) {
      offset += topOverflow;
    }

    const roundedOffset = Math.round(offset);
    setPopoverOffsets((current) => {
      if (current[openClusterKey] === roundedOffset && Object.keys(current).length === 1) {
        return current;
      }
      return { [openClusterKey]: roundedOffset };
    });
  }, [openClusterKey, clusterRenderData, height]);

  return (
    <div ref={layerRef} className="tl-event-layer">
      {clusterRenderData.map(({ cluster, placements, badgeSide, badgeLane }) => {
        const leadEvent = cluster.visibleEvents[0];
        const clusterStyle = {
          top: cluster.y + (clusterOffsets[cluster.key] ?? 0),
          height:
            CARD_BASE_HEIGHT +
            (cluster.hiddenCount > 0 ? BADGE_GAP + BADGE_HEIGHT : 0),
          zIndex:
            openClusterKey === cluster.key
              ? 300
              : cluster.events.length > 1
                ? 200
                : 10,
          ...(leadEvent?.color ? { ['--tl-event-accent' as string]: leadEvent.color } : {}),
        } as CSSProperties;

        return (
          <div
            key={cluster.key}
            ref={(node) => {
              clusterRefs.current[cluster.key] = node;
            }}
            className="tl-cluster"
            style={clusterStyle}
          >
          <div className="tl-cluster-anchor">
            <div className="tl-point-marker" />
            <div className="tl-leader-line" />
          </div>
          {cluster.visibleEvents.map((event) => {
            const placement = placements.get(event.id)!;
            const startY = mapTimeToY(viewport, event.startMs, height);
            const endY = mapTimeToY(viewport, event.endMs, height);
            return (
              <div
                key={event.id}
                className={`tl-cluster-item tl-cluster-item-${placement.side}`}
                style={{
                  top: '0px',
                  left: `calc(${placement.lane} * var(--tl-card-stack-offset))`,
                  zIndex: cluster.visibleEvents.length - placement.lane,
                }}
              >
                {event.isRange ? (
                  <div
                    className="tl-range-bar"
                    style={{
                      top: Math.min(startY, endY) - cluster.y,
                      height: Math.max(10, Math.abs(endY - startY)),
                    }}
                  />
                ) : null}
                {renderEvent ? renderEvent(event) : <TimelineEventCard event={event} onClick={onEventClick} />}
              </div>
            );
          })}
          {cluster.hiddenCount > 0 ? (
            <div
              ref={(node) => {
                clusterOverlayRefs.current[cluster.key] = node;
              }}
              className="tl-cluster-overlay"
              style={{
                top: `${CARD_BASE_HEIGHT + BADGE_GAP}px`,
                left: `calc(${Math.max(0, cluster.visibleEvents.length - 1)} * var(--tl-card-stack-offset))`,
              }}
            >
              <button
                type="button"
                className={`tl-cluster-badge tl-cluster-badge-${badgeSide}`}
                aria-expanded={openClusterKey === cluster.key}
                onClick={() =>
                  setOpenClusterKey((current) => (current === cluster.key ? null : cluster.key))
                }
              >
                +{cluster.hiddenCount} more
              </button>
              {openClusterKey === cluster.key ? (
                <div
                  ref={(node) => {
                    clusterPopoverRefs.current[cluster.key] = node;
                  }}
                  className="tl-cluster-popover"
                  onWheel={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    transform: `translateY(${popoverOffsets[cluster.key] ?? 0}px)`,
                  }}
                >
                  <div className="tl-cluster-popover-header">
                    <span className="tl-cluster-popover-title">Cluster Events</span>
                    <span className="tl-cluster-popover-count">{cluster.events.length} total</span>
                  </div>
                  <div className="tl-cluster-popover-list">
                    {cluster.events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="tl-cluster-popover-item"
                        onClick={() => {
                          onEventClick?.(event);
                          setOpenClusterKey(null);
                        }}
                      >
                        <span className="tl-cluster-popover-item-title">{event.title}</span>
                        <span className="tl-cluster-popover-item-date">
                          {formatEventDate(event.startMs, event.endMs, event.isRange)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';
import type { NormalizedTimelineEvent, TimelineViewport } from '../lib/types';
import { formatNormalizedEventDate } from '../lib/eventDisplay';
import { mapTimeToY } from '../lib/timeScale';
import { TimelineEventCard } from './TimelineEventCard';

type TimelineEventLayerProps = {
  events: NormalizedTimelineEvent[];
  viewport: TimelineViewport;
  height: number;
  laneLimit: number;
  collapseGroups?: boolean;
  renderEvent?: (event: NormalizedTimelineEvent) => ReactNode;
  onEventClick?: (event: NormalizedTimelineEvent) => void;
};

type Cluster = {
  key: string;
  y: number;
  groupId: string;
  groupLane: number;
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

type GroupLane = {
  id: string;
  label: string;
  lane: number;
};

const CARD_BASE_HEIGHT = 52;
const BADGE_GAP = 12;
const BADGE_HEIGHT = 26;
const STACK_VERTICAL_OFFSET = 10;

function getVisibleEvents(events: NormalizedTimelineEvent[], viewport: TimelineViewport) {
  return events.filter(
    (event) =>
      event.endMs >= viewport.visibleStartMs && event.startMs <= viewport.visibleEndMs
  );
}

function getEventGroupId(event: NormalizedTimelineEvent) {
  return event.groupId?.trim() || 'Ungrouped';
}

function buildGroupLanes(events: NormalizedTimelineEvent[]): GroupLane[] {
  const groupIds = Array.from(new Set(events.map(getEventGroupId)));
  return groupIds.map((id, lane) => ({ id, label: id, lane }));
}

function clusterEvents(
  events: NormalizedTimelineEvent[],
  viewport: TimelineViewport,
  height: number,
  laneLimit: number,
  groupLanes: GroupLane[],
  collapseGroups: boolean
): Cluster[] {
  const clusters: Cluster[] = [];
  const threshold = 18;

  for (const groupLane of groupLanes) {
    const sorted = getVisibleEvents(events, viewport)
      .filter((event) => (collapseGroups ? true : getEventGroupId(event) === groupLane.id))
      .map((event) => ({
        event,
        y: mapTimeToY(viewport, event.startMs, height),
      }))
      .sort((a, b) => a.y - b.y || b.event.importance - a.event.importance);

    for (const item of sorted) {
      const existing = clusters[clusters.length - 1];
      if (
        existing &&
        existing.groupId === groupLane.id &&
        Math.abs(existing.y - item.y) <= threshold
      ) {
        existing.events.push(item.event);
        existing.y = Math.round((existing.y + item.y) / 2);
        continue;
      }
      clusters.push({
        key: `cluster-${groupLane.id}-${item.event.id}-${item.y}`,
        y: item.y,
        groupId: groupLane.id,
        groupLane: groupLane.lane,
        events: [item.event],
        visibleEvents: [],
        hiddenCount: 0,
      });
    }
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
  collapseGroups = false,
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
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const groupLanes = collapseGroups ? [{ id: '__all__', label: 'All', lane: 0 }] : buildGroupLanes(events);
  const clusters = clusterEvents(events, viewport, height, laneLimit, groupLanes, collapseGroups);
  const clusterRenderData = buildClusterRenderData(clusters);

  useEffect(() => {
    if (openClusterKey && !clusterRenderData.some(({ cluster }) => cluster.key === openClusterKey)) {
      setOpenClusterKey(null);
    }
  }, [clusterRenderData, openClusterKey]);

  useEffect(() => {
    if (activeEventId && !clusterRenderData.some(({ cluster }) => cluster.events.some((event) => event.id === activeEventId))) {
      setActiveEventId(null);
    }
  }, [activeEventId, clusterRenderData]);

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
      <div className="tl-group-lanes" aria-hidden="true">
        {groupLanes.map((groupLane) => (
          <div
            key={groupLane.id}
            className="tl-group-lane"
            style={{
              left: `calc(${groupLane.lane} * (100% / ${groupLanes.length}))`,
              width: `calc(100% / ${groupLanes.length})`,
            }}
          >
            <div className="tl-group-lane-label">{groupLane.label}</div>
          </div>
        ))}
      </div>
      {clusterRenderData.map(({ cluster, placements, badgeSide, badgeLane }) => {
        const leadEvent = cluster.visibleEvents[0];
        const activeEventInCluster = cluster.events.some((event) => event.id === activeEventId);
        const hasStackedCards = cluster.visibleEvents.length > 1;
        const clusterStyle = {
          top: cluster.y + (clusterOffsets[cluster.key] ?? 0),
          left: `calc(${cluster.groupLane} * (100% / ${groupLanes.length}))`,
          width: `calc(100% / ${groupLanes.length})`,
          height:
            CARD_BASE_HEIGHT +
            Math.max(0, cluster.visibleEvents.length - 1) * STACK_VERTICAL_OFFSET +
            (cluster.hiddenCount > 0 ? BADGE_GAP + BADGE_HEIGHT : 0),
          zIndex:
            activeEventInCluster
              ? 350
              : openClusterKey === cluster.key
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
            const isActive = event.id === activeEventId;
            const stackOffsetIndex = hasStackedCards ? placement.lane + 1 : placement.lane;
            return (
              <div
                key={event.id}
                className={`tl-cluster-item tl-cluster-item-${placement.side}`}
                style={{
                  top: `${stackOffsetIndex * STACK_VERTICAL_OFFSET}px`,
                  left: `calc(${stackOffsetIndex} * var(--tl-card-stack-offset))`,
                  zIndex: isActive ? cluster.visibleEvents.length + laneLimit + 1 : cluster.visibleEvents.length - placement.lane,
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
                {renderEvent ? (
                  <div
                    onClick={() => {
                      setActiveEventId(event.id);
                      onEventClick?.(event);
                    }}
                  >
                    {renderEvent(event)}
                  </div>
                ) : (
                  <TimelineEventCard
                    event={event}
                    isActive={isActive}
                    onClick={(clickedEvent) => {
                      setActiveEventId(clickedEvent.id);
                      onEventClick?.(clickedEvent);
                    }}
                  />
                )}
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
                top: `${CARD_BASE_HEIGHT + (hasStackedCards ? cluster.visibleEvents.length : Math.max(0, cluster.visibleEvents.length - 1)) * STACK_VERTICAL_OFFSET + BADGE_GAP}px`,
                left: `calc(${hasStackedCards ? cluster.visibleEvents.length : Math.max(0, cluster.visibleEvents.length - 1)} * var(--tl-card-stack-offset))`,
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
                          {formatNormalizedEventDate(event)}
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

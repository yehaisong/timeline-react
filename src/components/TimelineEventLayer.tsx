import type { ReactNode } from 'react';
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

export function TimelineEventLayer({
  events,
  viewport,
  height,
  laneLimit,
  renderEvent,
  onEventClick,
}: TimelineEventLayerProps) {
  const clusters = clusterEvents(events, viewport, height, laneLimit);

  return (
    <div className="tl-event-layer">
      {clusters.map((cluster) => (
        <div
          key={cluster.key}
          className="tl-cluster"
          style={{ top: cluster.y }}
        >
          {cluster.visibleEvents.map((event, index) => {
            const startY = mapTimeToY(viewport, event.startMs, height);
            const endY = mapTimeToY(viewport, event.endMs, height);
            return (
              <div
                key={event.id}
                className="tl-cluster-item"
                style={{
                  left: index * 28,
                  zIndex: cluster.visibleEvents.length - index,
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
                ) : (
                  <div className="tl-point-marker" />
                )}
                <div className="tl-leader-line" />
                {renderEvent ? renderEvent(event) : <TimelineEventCard event={event} onClick={onEventClick} />}
              </div>
            );
          })}
          {cluster.hiddenCount > 0 ? (
            <div
              className="tl-cluster-badge"
              style={{ left: cluster.visibleEvents.length * 28 }}
            >
              +{cluster.hiddenCount} more
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

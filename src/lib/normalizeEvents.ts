import type { NormalizedTimelineEvent, TimelineEvent } from './types';
import { normalizeDateInput } from './timeScale';

function isNormalizedTimelineEvent(
  event: NormalizedTimelineEvent | null
): event is NormalizedTimelineEvent {
  return event !== null;
}

export function normalizeEvents(events: TimelineEvent[]): NormalizedTimelineEvent[] {
  const normalized: Array<NormalizedTimelineEvent | null> = events.map((event) => {
      const startMs = normalizeDateInput(event.start);
      const rawEndMs = normalizeDateInput(event.end);
      if (startMs === null) {
        return null;
      }
      const endMs = rawEndMs ?? startMs;
      if (endMs < startMs) {
        return null;
      }
      return {
        id: event.id,
        title: event.title,
        startMs,
        endMs,
        isRange: endMs > startMs,
        allDay: Boolean(event.allDay),
        description: event.description,
        groupId: event.groupId,
        color: event.color,
        icon: event.icon,
        importance: event.importance ?? 0,
        media: event.media,
        attachments: event.attachments,
        geo: event.geo,
        metadata: event.metadata,
      };
    });

  return normalized.filter(isNormalizedTimelineEvent).sort((a, b) => {
      if (a.startMs !== b.startMs) {
        return a.startMs - b.startMs;
      }
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      return a.title.localeCompare(b.title);
    });
}

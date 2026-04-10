import type { CSSProperties } from 'react';
import type { NormalizedTimelineEvent } from '../lib/types';

type TimelineEventCardProps = {
  event: NormalizedTimelineEvent;
  onClick?: (event: NormalizedTimelineEvent) => void;
};

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

export function TimelineEventCard({ event, onClick }: TimelineEventCardProps) {
  return (
    <button
      type="button"
      className="tl-event-card"
      style={event.color ? ({ ['--tl-event-accent' as string]: event.color } as CSSProperties) : undefined}
      onClick={() => onClick?.(event)}
    >
      <div className="tl-event-title">{event.title}</div>
      <div className="tl-event-date">
        {formatEventDate(event.startMs, event.endMs, event.isRange)}
      </div>
      {event.description ? (
        <div className="tl-event-description">{event.description}</div>
      ) : null}
      <div className="tl-event-meta">
        {event.media?.length ? <span>{event.media.length} media</span> : null}
        {event.attachments?.length ? <span>{event.attachments.length} attachments</span> : null}
        {event.geo ? <span>geo</span> : null}
      </div>
    </button>
  );
}

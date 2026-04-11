import type { CSSProperties } from 'react';
import type { NormalizedTimelineEvent } from '../lib/types';

type TimelineEventCardProps = {
  event: NormalizedTimelineEvent;
  onClick?: (event: NormalizedTimelineEvent) => void;
};

export function TimelineEventCard({ event, onClick }: TimelineEventCardProps) {
  return (
    <button
      type="button"
      className="tl-event-card"
      style={event.color ? ({ ['--tl-event-accent' as string]: event.color } as CSSProperties) : undefined}
      onClick={() => onClick?.(event)}
    >
      <div className="tl-event-title">{event.title}</div>
    </button>
  );
}

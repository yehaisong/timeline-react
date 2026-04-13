import type { CSSProperties } from 'react';
import type { NormalizedTimelineEvent } from '../lib/types';

type TimelineEventCardProps = {
  event: NormalizedTimelineEvent;
  isActive?: boolean;
  onClick?: (event: NormalizedTimelineEvent) => void;
};

const YEAR_LABEL_PATTERN = /^(?:\d+|\d+AD|\d+BC|1BC)$/;

function formatEventYear(event: NormalizedTimelineEvent) {
  if (YEAR_LABEL_PATTERN.test(event.displayStartLabel)) {
    return event.displayStartLabel;
  }

  const originalYearNum = event.metadata?.originalYearNum;
  if (typeof originalYearNum === 'number' && Number.isFinite(originalYearNum)) {
    const year = Math.trunc(originalYearNum);
    if (year < 0) {
      return `${Math.abs(year)}BC`;
    }
    if (year > 0) {
      return `${year}AD`;
    }
  }

  const astronomicalYear = new Date(event.startMs).getUTCFullYear();
  if (astronomicalYear < 0) {
    return `${Math.abs(astronomicalYear) + 1}BC`;
  }
  if (astronomicalYear === 0) {
    return '1BC';
  }
  return `${astronomicalYear}AD`;
}

export function TimelineEventCard({ event, isActive = false, onClick }: TimelineEventCardProps) {
  const yearLabel = formatEventYear(event);

  return (
    <button
      type="button"
      className={`tl-event-card${isActive ? ' tl-event-card-active' : ''}`}
      style={event.color ? ({ ['--tl-event-accent' as string]: event.color } as CSSProperties) : undefined}
      onClick={() => onClick?.(event)}
    >
      <div className="tl-event-title">({yearLabel}) {event.title}</div>
    </button>
  );
}

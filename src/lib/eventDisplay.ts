import type { NormalizedTimelineEvent } from './types';

const YEAR_ONLY_PATTERN = /^[+-]?\d{1,6}$/;
const YEAR_MONTH_PATTERN = /^([+-]?\d{1,6})-(\d{2})$/;
const FULL_DATE_PATTERN =
  /^([+-]?\d{1,6})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatHistoricalYear(year: number) {
  if (year < 0) {
    return `${Math.abs(year)}BC`;
  }
  if (year === 0) {
    return '1BC';
  }
  return `${year}`;
}

export function formatDateInputForDisplay(value: string | Date | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (YEAR_ONLY_PATTERN.test(trimmed)) {
    return formatHistoricalYear(Number(trimmed));
  }

  const yearMonthMatch = trimmed.match(YEAR_MONTH_PATTERN);
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1]);
    const month = Number(yearMonthMatch[2]);
    if (month >= 1 && month <= 12) {
      return `${MONTH_LABELS[month - 1]} ${formatHistoricalYear(year)}`;
    }
  }

  const fullDateMatch = trimmed.match(FULL_DATE_PATTERN);
  if (fullDateMatch) {
    const year = Number(fullDateMatch[1]);
    const month = Number(fullDateMatch[2]);
    const day = Number(fullDateMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${MONTH_LABELS[month - 1]} ${day}, ${formatHistoricalYear(year)}`;
    }
  }

  return trimmed;
}

export function formatNormalizedEventDate(event: NormalizedTimelineEvent): string {
  if (!event.isRange || !event.displayEndLabel) {
    return event.displayStartLabel;
  }

  if (event.displayStartLabel === event.displayEndLabel) {
    return event.displayStartLabel;
  }

  return `${event.displayStartLabel} - ${event.displayEndLabel}`;
}

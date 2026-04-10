import type { TimelineViewport, TimelineZoomUnit } from './types';

export type TimelineTick = {
  key: string;
  ts: number;
  label: string;
  kind: 'major' | 'minor';
};

const UNIT_ORDER: TimelineZoomUnit[] = [
  'century',
  'decade',
  'year',
  'quarter',
  'month',
  'week',
  'day',
];

const DEFAULT_VISIBLE_UNITS: Record<TimelineZoomUnit, number> = {
  century: 4,
  decade: 6,
  year: 12,
  quarter: 8,
  month: 6,
  week: 8,
  day: 14,
};

const MINOR_UNIT: Record<TimelineZoomUnit, TimelineZoomUnit | null> = {
  century: 'decade',
  decade: 'year',
  year: 'month',
  quarter: 'month',
  month: 'week',
  week: 'day',
  day: null,
};

export function getZoomUnits(): TimelineZoomUnit[] {
  return [...UNIT_ORDER];
}

export function compareZoomUnits(a: TimelineZoomUnit, b: TimelineZoomUnit): number {
  return UNIT_ORDER.indexOf(a) - UNIT_ORDER.indexOf(b);
}

export function clampZoomUnit(
  unit: TimelineZoomUnit,
  maxZoomUnit: TimelineZoomUnit,
  minZoomUnit: TimelineZoomUnit
): TimelineZoomUnit {
  const index = UNIT_ORDER.indexOf(unit);
  const maxIndex = UNIT_ORDER.indexOf(maxZoomUnit);
  const minIndex = UNIT_ORDER.indexOf(minZoomUnit);
  return UNIT_ORDER[Math.min(Math.max(index, maxIndex), minIndex)];
}

export function getZoomedInUnit(
  unit: TimelineZoomUnit,
  minZoomUnit: TimelineZoomUnit
): TimelineZoomUnit {
  const currentIndex = UNIT_ORDER.indexOf(unit);
  const minIndex = UNIT_ORDER.indexOf(minZoomUnit);
  return UNIT_ORDER[Math.min(currentIndex + 1, minIndex)];
}

export function getZoomedOutUnit(
  unit: TimelineZoomUnit,
  maxZoomUnit: TimelineZoomUnit
): TimelineZoomUnit {
  const currentIndex = UNIT_ORDER.indexOf(unit);
  const maxIndex = UNIT_ORDER.indexOf(maxZoomUnit);
  return UNIT_ORDER[Math.max(currentIndex - 1, maxIndex)];
}

export function normalizeDateInput(value: string | Date | undefined): number | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function startOfUnit(ts: number, unit: TimelineZoomUnit): number {
  const date = new Date(ts);
  if (unit === 'century') {
    const year = Math.floor(date.getUTCFullYear() / 100) * 100;
    return Date.UTC(year, 0, 1, 0, 0, 0, 0);
  }
  if (unit === 'decade') {
    const year = Math.floor(date.getUTCFullYear() / 10) * 10;
    return Date.UTC(year, 0, 1, 0, 0, 0, 0);
  }
  if (unit === 'year') {
    return Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  }
  if (unit === 'quarter') {
    const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;
    return Date.UTC(date.getUTCFullYear(), quarterMonth, 1, 0, 0, 0, 0);
  }
  if (unit === 'month') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0);
  }
  if (unit === 'week') {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day;
    copy.setUTCDate(copy.getUTCDate() + offset);
    return copy.getTime();
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
}

export function addUnits(ts: number, unit: TimelineZoomUnit, amount: number): number {
  const date = new Date(ts);
  if (unit === 'century') {
    return Date.UTC(date.getUTCFullYear() + amount * 100, 0, 1, 0, 0, 0, 0);
  }
  if (unit === 'decade') {
    return Date.UTC(date.getUTCFullYear() + amount * 10, 0, 1, 0, 0, 0, 0);
  }
  if (unit === 'year') {
    return Date.UTC(date.getUTCFullYear() + amount, 0, 1, 0, 0, 0, 0);
  }
  if (unit === 'quarter') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount * 3, 1, 0, 0, 0, 0);
  }
  if (unit === 'month') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 0, 0, 0, 0);
  }
  if (unit === 'week') {
    return ts + amount * 7 * 24 * 60 * 60 * 1000;
  }
  return ts + amount * 24 * 60 * 60 * 1000;
}

export function createViewportAround(centerMs: number, zoomUnit: TimelineZoomUnit): TimelineViewport {
  const visibleUnits = DEFAULT_VISIBLE_UNITS[zoomUnit];
  const centered = startOfUnit(centerMs, zoomUnit);
  const beforeUnits = Math.floor(visibleUnits / 2);
  const start = addUnits(centered, zoomUnit, -beforeUnits);
  const end = addUnits(start, zoomUnit, visibleUnits);
  return {
    visibleStartMs: start,
    visibleEndMs: end,
    zoomUnit,
  };
}

export function clampViewportToBounds(
  viewport: TimelineViewport,
  startBoundMs?: number | null,
  endBoundMs?: number | null
): TimelineViewport {
  const hasStart = Number.isFinite(startBoundMs ?? NaN);
  const hasEnd = Number.isFinite(endBoundMs ?? NaN);
  if (!hasStart && !hasEnd) {
    return viewport;
  }

  const boundStart = hasStart ? Number(startBoundMs) : null;
  const boundEnd = hasEnd ? Number(endBoundMs) : null;
  const duration = viewport.visibleEndMs - viewport.visibleStartMs;

  if (boundStart !== null && boundEnd !== null && duration >= boundEnd - boundStart) {
    return {
      ...viewport,
      visibleStartMs: boundStart,
      visibleEndMs: boundEnd,
    };
  }

  let nextStart = viewport.visibleStartMs;
  let nextEnd = viewport.visibleEndMs;

  if (boundStart !== null && nextStart < boundStart) {
    nextStart = boundStart;
    nextEnd = boundStart + duration;
  }
  if (boundEnd !== null && nextEnd > boundEnd) {
    nextEnd = boundEnd;
    nextStart = boundEnd - duration;
  }

  return {
    ...viewport,
    visibleStartMs: nextStart,
    visibleEndMs: nextEnd,
  };
}

export function shiftViewport(
  viewport: TimelineViewport,
  ratio: number,
  startBoundMs?: number | null,
  endBoundMs?: number | null
): TimelineViewport {
  const duration = viewport.visibleEndMs - viewport.visibleStartMs;
  const delta = duration * ratio;
  return clampViewportToBounds(
    {
      ...viewport,
      visibleStartMs: viewport.visibleStartMs + delta,
      visibleEndMs: viewport.visibleEndMs + delta,
    },
    startBoundMs,
    endBoundMs
  );
}

export function zoomViewport(
  viewport: TimelineViewport,
  nextZoomUnit: TimelineZoomUnit,
  focalMs: number,
  startBoundMs?: number | null,
  endBoundMs?: number | null
): TimelineViewport {
  if (nextZoomUnit === viewport.zoomUnit) {
    return viewport;
  }
  const currentDuration = viewport.visibleEndMs - viewport.visibleStartMs;
  const currentRatio = currentDuration <= 0 ? 0.5 : (focalMs - viewport.visibleStartMs) / currentDuration;
  const target = createViewportAround(focalMs, nextZoomUnit);
  const nextDuration = target.visibleEndMs - target.visibleStartMs;
  const nextStart = focalMs - currentRatio * nextDuration;
  const nextEnd = nextStart + nextDuration;
  return clampViewportToBounds(
    {
      visibleStartMs: nextStart,
      visibleEndMs: nextEnd,
      zoomUnit: nextZoomUnit,
    },
    startBoundMs,
    endBoundMs
  );
}

export function mapTimeToY(viewport: TimelineViewport, ts: number, height: number): number {
  const duration = viewport.visibleEndMs - viewport.visibleStartMs;
  if (duration <= 0 || height <= 0) {
    return 0;
  }
  return ((ts - viewport.visibleStartMs) / duration) * height;
}

export function formatTickLabel(ts: number, unit: TimelineZoomUnit): string {
  const date = new Date(ts);
  if (unit === 'century') {
    return `${Math.floor(date.getUTCFullYear() / 100) * 100}s`;
  }
  if (unit === 'decade') {
    return `${Math.floor(date.getUTCFullYear() / 10) * 10}s`;
  }
  if (unit === 'year') {
    return String(date.getUTCFullYear());
  }
  if (unit === 'quarter') {
    return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  }
  if (unit === 'month') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  if (unit === 'week') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function generateTicks(viewport: TimelineViewport): {
  majorTicks: TimelineTick[];
  minorTicks: TimelineTick[];
} {
  const majorUnit = viewport.zoomUnit;
  const minorUnit = MINOR_UNIT[majorUnit];
  const endBoundary = viewport.visibleEndMs;

  const majorTicks: TimelineTick[] = [];
  let cursor = startOfUnit(viewport.visibleStartMs, majorUnit);
  while (cursor <= endBoundary) {
    majorTicks.push({
      key: `major-${majorUnit}-${cursor}`,
      ts: cursor,
      label: formatTickLabel(cursor, majorUnit),
      kind: 'major',
    });
    cursor = addUnits(cursor, majorUnit, 1);
  }

  const minorTicks: TimelineTick[] = [];
  if (minorUnit) {
    let minorCursor = startOfUnit(viewport.visibleStartMs, minorUnit);
    while (minorCursor <= endBoundary) {
      const isMajorBoundary = majorTicks.some((tick) => tick.ts === minorCursor);
      if (!isMajorBoundary) {
        minorTicks.push({
          key: `minor-${minorUnit}-${minorCursor}`,
          ts: minorCursor,
          label: formatTickLabel(minorCursor, minorUnit),
          kind: 'minor',
        });
      }
      minorCursor = addUnits(minorCursor, minorUnit, 1);
    }
  }

  return { majorTicks, minorTicks };
}


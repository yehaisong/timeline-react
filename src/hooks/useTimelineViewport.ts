import { useEffect, useState } from 'react';
import type { NormalizedTimelineEvent, TimelineViewport, TimelineZoomUnit } from '../lib/types';
import {
  clampViewportToBounds,
  createViewportAround,
  normalizeDateInput,
} from '../lib/timeScale';

type UseTimelineViewportArgs = {
  events: NormalizedTimelineEvent[];
  startBound?: string | Date;
  endBound?: string | Date;
  maxZoomUnit: TimelineZoomUnit;
  minZoomUnit: TimelineZoomUnit;
  initialZoomUnit: TimelineZoomUnit;
  viewportHeight: number;
  unitHeight: number;
  initialStart?: string | Date;
  initialEnd?: string | Date;
  initialCenter?: string | Date;
  viewport?: TimelineViewport;
  onViewportChange?: (viewport: TimelineViewport) => void;
};

function deriveInitialViewport(args: UseTimelineViewportArgs): TimelineViewport {
  const startBoundMs = normalizeDateInput(args.startBound);
  const endBoundMs = normalizeDateInput(args.endBound);
  const explicitStartMs = normalizeDateInput(args.initialStart);
  const explicitEndMs = normalizeDateInput(args.initialEnd);
  if (explicitStartMs !== null && explicitEndMs !== null && explicitEndMs > explicitStartMs) {
    return clampViewportToBounds(
      {
        visibleStartMs: explicitStartMs,
        visibleEndMs: explicitEndMs,
        zoomUnit: args.initialZoomUnit,
      },
      startBoundMs,
      endBoundMs
    );
  }

  const initialCenterMs =
    normalizeDateInput(args.initialCenter) ??
    (args.events.length ? args.events[0].startMs : null) ??
    startBoundMs ??
    Date.now();

  return clampViewportToBounds(
    createViewportAround(initialCenterMs, args.initialZoomUnit, args.viewportHeight, args.unitHeight),
    startBoundMs,
    endBoundMs
  );
}

export function useTimelineViewport(args: UseTimelineViewportArgs) {
  const controlled = Boolean(args.viewport);
  const [internalViewport, setInternalViewport] = useState<TimelineViewport>(() =>
    deriveInitialViewport(args)
  );

  useEffect(() => {
    if (args.viewport) {
      return;
    }
    setInternalViewport(deriveInitialViewport(args));
  }, []);

  useEffect(() => {
    if (controlled) {
      return;
    }

    setInternalViewport((current) => {
      const centerMs = current.visibleStartMs + (current.visibleEndMs - current.visibleStartMs) / 2;
      const resizedViewport = clampViewportToBounds(
        createViewportAround(centerMs, current.zoomUnit, args.viewportHeight, args.unitHeight),
        normalizeDateInput(args.startBound),
        normalizeDateInput(args.endBound)
      );

      if (
        resizedViewport.visibleStartMs === current.visibleStartMs &&
        resizedViewport.visibleEndMs === current.visibleEndMs &&
        resizedViewport.zoomUnit === current.zoomUnit
      ) {
        return current;
      }

      return resizedViewport;
    });
  }, [
    controlled,
    args.viewportHeight,
    args.unitHeight,
    args.startBound,
    args.endBound,
  ]);

  const activeViewport = args.viewport ?? internalViewport;

  function setViewport(nextViewport: TimelineViewport) {
    if (!controlled) {
      setInternalViewport(nextViewport);
    }
    args.onViewportChange?.(nextViewport);
  }

  return {
    viewport: activeViewport,
    setViewport,
    startBoundMs: normalizeDateInput(args.startBound),
    endBoundMs: normalizeDateInput(args.endBound),
  };
}

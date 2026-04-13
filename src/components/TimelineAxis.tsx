import type { TimelineViewport } from '../lib/types';
import type { TimelineTick } from '../lib/timeScale';
import { mapTimeToY } from '../lib/timeScale';

type TimelineAxisProps = {
  viewport: TimelineViewport;
  majorTicks: TimelineTick[];
  minorTicks: TimelineTick[];
  height: number;
  showMajorTicks?: boolean;
  showMajorLabels?: boolean;
  showMinorTicks?: boolean;
  showMinorLabels?: boolean;
};

export function TimelineAxis({
  viewport,
  majorTicks,
  minorTicks,
  height,
  showMajorTicks = true,
  showMajorLabels = true,
  showMinorTicks = true,
  showMinorLabels = true,
}: TimelineAxisProps) {
  return (
    <div className="tl-axis">
      <div className="tl-axis-line" />
      {showMinorTicks || showMinorLabels
        ? minorTicks.map((tick) => {
            const top = mapTimeToY(viewport, tick.ts, height);
            return (
              <div
                key={tick.key}
                className="tl-tick tl-tick-minor"
                style={{ top }}
              >
                {showMinorTicks ? <div className="tl-tick-mark" /> : null}
                {showMinorLabels ? (
                  <div className="tl-tick-label tl-tick-label-minor">{tick.label}</div>
                ) : null}
              </div>
            );
          })
        : null}
      {showMajorTicks || showMajorLabels
        ? majorTicks.map((tick) => {
            const top = mapTimeToY(viewport, tick.ts, height);
            return (
              <div
                key={tick.key}
                className="tl-tick tl-tick-major"
                style={{ top }}
              >
                {showMajorTicks ? <div className="tl-tick-mark" /> : null}
                {showMajorLabels ? (
                  <div className="tl-tick-label">
                    <span className="tl-tick-label-major">{tick.label}</span>
                  </div>
                ) : null}
              </div>
            );
          })
        : null}
    </div>
  );
}

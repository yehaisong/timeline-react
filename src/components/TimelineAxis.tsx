import type { TimelineViewport } from '../lib/types';
import type { TimelineTick } from '../lib/timeScale';
import { mapTimeToY } from '../lib/timeScale';

type TimelineAxisProps = {
  viewport: TimelineViewport;
  majorTicks: TimelineTick[];
  minorTicks: TimelineTick[];
  height: number;
};

export function TimelineAxis({
  viewport,
  majorTicks,
  height,
}: TimelineAxisProps) {
  return (
    <div className="tl-axis">
      <div className="tl-axis-line" />
      {majorTicks.map((tick) => {
        const top = mapTimeToY(viewport, tick.ts, height);
        return (
          <div
            key={tick.key}
            className="tl-tick tl-tick-major"
            style={{ top }}
          >
            <div className="tl-tick-mark" />
            <div className="tl-tick-label tl-tick-label-major">{tick.label}</div>
          </div>
        );
      })}
    </div>
  );
}

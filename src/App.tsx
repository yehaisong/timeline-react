import { useState } from 'react';
import { VerticalTimeline } from './components/VerticalTimeline';
import type { NormalizedTimelineEvent, TimelineEvent, TimelineGeoJSONGeometry } from './lib/types';
import { normalizeDateInput } from './lib/timeScale';
import sampleEventsData from './data/myevents_cht_timeline.json';
import './styles/app.css';

const sampleEvents = sampleEventsData as TimelineEvent[];
const timelineTimestamps = sampleEvents
  .flatMap((event) => [normalizeDateInput(event.start), normalizeDateInput(event.end ?? event.start)])
  .filter((value): value is number => value !== null);
const timelineStartMs = Math.min(...timelineTimestamps);
const timelineEndMs = Math.max(...timelineTimestamps);
const timelineStartDate = new Date(timelineStartMs);
const timelineEndDate = new Date(timelineEndMs);
const timelineCenterDate = new Date(0);
timelineCenterDate.setUTCFullYear(0, 0, 1);
timelineCenterDate.setUTCHours(0, 0, 0, 0);

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

function summarizeGeometry(geometry: TimelineGeoJSONGeometry) {
  if (geometry.type === 'Point') {
    const [longitude, latitude] = geometry.coordinates;
    return `Point ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
  if (geometry.type === 'LineString') {
    return `LineString with ${geometry.coordinates.length} points`;
  }
  return `Polygon with ${geometry.coordinates.length} rings`;
}

export default function App() {
  const [selectedEvent, setSelectedEvent] = useState<NormalizedTimelineEvent | null>(null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">Vertical Timeline</p>
          <h1 className="app-title">Multi-century to day-level navigation</h1>
        </div>
        <p className="app-summary">
          Scroll to pan. Hold <code>Ctrl</code> or <code>Cmd</code> while scrolling to zoom.
        </p>
      </header>

      <section className="app-stage">
        <VerticalTimeline
          events={sampleEvents}
          startBound={timelineStartDate}
          endBound={timelineEndDate}
          maxZoomUnit="century"
          minZoomUnit="year"
          initialZoomUnit="decade"
          initialCenter={timelineCenterDate}
          height="100%"
          unitHeight={100}
          clusterLaneLimit={2}
          onEventClick={setSelectedEvent}
        />
        <div
          className={`app-detail-backdrop${selectedEvent ? ' app-detail-backdrop-open' : ''}`}
          onClick={() => setSelectedEvent(null)}
        />
        <aside
          className={`app-detail-panel${selectedEvent ? ' app-detail-panel-open' : ''}`}
          aria-hidden={selectedEvent ? 'false' : 'true'}
        >
          <div className="app-detail-header">
            <div>
              <p className="app-detail-eyebrow">Selected Event</p>
              <h2 className="app-detail-title">
                {selectedEvent ? selectedEvent.title : 'Click an event'}
              </h2>
            </div>
            <button
              type="button"
              className="app-detail-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event details"
            >
              ×
            </button>
          </div>
          <p className="app-detail-date">
            {selectedEvent
              ? formatEventDate(
                  selectedEvent.startMs,
                  selectedEvent.endMs,
                  selectedEvent.isRange
                )
              : 'Choose any card or clustered event row to inspect it here.'}
          </p>

          {selectedEvent ? (
            <div className="app-detail-body">
              {selectedEvent.description ? (
                <div className="app-detail-section">
                  <h3 className="app-detail-section-title">Summary</h3>
                  <p className="app-detail-text">{selectedEvent.description}</p>
                </div>
              ) : null}

              <div className="app-detail-section">
                <h3 className="app-detail-section-title">Details</h3>
                <dl className="app-detail-grid">
                  <div>
                    <dt>ID</dt>
                    <dd>{selectedEvent.id}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedEvent.isRange ? 'Range event' : 'Point event'}</dd>
                  </div>
                  <div>
                    <dt>Importance</dt>
                    <dd>{selectedEvent.importance}</dd>
                  </div>
                  <div>
                    <dt>All day</dt>
                    <dd>{selectedEvent.allDay ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt>Media</dt>
                    <dd>{selectedEvent.media?.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Attachments</dt>
                    <dd>{selectedEvent.attachments?.length ?? 0}</dd>
                  </div>
                </dl>
              </div>

              {selectedEvent.geo ? (
                <div className="app-detail-section">
                  <h3 className="app-detail-section-title">Location</h3>
                  <p className="app-detail-text">
                    {selectedEvent.geo.properties?.label
                      ? `${String(selectedEvent.geo.properties.label)} · `
                      : ''}
                    {summarizeGeometry(selectedEvent.geo.geometry)}
                  </p>
                </div>
              ) : null}

              {selectedEvent.media?.length ? (
                <div className="app-detail-section">
                  <h3 className="app-detail-section-title">Media</h3>
                  <ul className="app-detail-list">
                    {selectedEvent.media.map((item, index) => (
                      <li key={item.id ?? `${item.type}-${index}`}>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.title ?? `${item.type} asset ${index + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedEvent.attachments?.length ? (
                <div className="app-detail-section">
                  <h3 className="app-detail-section-title">Attachments</h3>
                  <ul className="app-detail-list">
                    {selectedEvent.attachments.map((item, index) => (
                      <li key={item.id ?? `${item.name}-${index}`}>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="app-detail-empty">
              The panel updates when you click a visible event card or an item inside a cluster popover.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

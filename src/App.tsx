import { useState } from 'react';
import { VerticalTimeline } from './components/VerticalTimeline';
import type { NormalizedTimelineEvent, TimelineEvent, TimelineGeoJSONGeometry } from './lib/types';
import './styles/app.css';

const baseEvents: TimelineEvent[] = [
  {
    id: 'printing-press',
    title: 'Printing Press Expansion',
    start: '1450-01-01',
    end: '1500-12-31',
    description: 'Spread of movable type printing across Europe.',
    color: '#7c3aed',
    importance: 6,
    attachments: [
      {
        name: 'Reference Notes',
        url: 'https://example.com/printing-press-notes.pdf',
        mimeType: 'application/pdf',
      },
    ],
  },
  {
    id: 'ren-1',
    title: 'Renaissance Workshop Opens',
    start: '1500-06-15',
    description: 'Point event sharing the same day as two other events.',
    color: '#b45309',
    importance: 9,
  },
  {
    id: 'ren-2',
    title: 'Patronage Contract Signed',
    start: '1500-06-15',
    description: 'Same-time event to exercise clustering.',
    color: '#2563eb',
    importance: 7,
    media: [
      {
        type: 'image',
        url: 'https://example.com/patronage.jpg',
      },
    ],
  },
  {
    id: 'ren-3',
    title: 'Studio Fire Rebuild Begins',
    start: '1500-06-15',
    description: 'Third same-point event for +N more behavior.',
    color: '#0891b2',
    importance: 5,
    geo: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [12.4964, 41.9028],
      },
      properties: {
        label: 'Rome',
      },
    },
  },
  {
    id: 'ren-4',
    title: 'Guild Ledger Entry',
    start: '1500-06-15',
    description: 'Fourth same-time event to guarantee an overflow badge.',
    color: '#0f766e',
    importance: 4,
  },
  {
    id: 'apollo',
    title: 'Apollo 11 Moon Landing',
    start: '1969-07-20',
    description: 'First crewed lunar landing.',
    color: '#2563eb',
    importance: 10,
    media: [
      {
        type: 'image',
        url: 'https://example.com/moon.jpg',
        thumbnailUrl: 'https://example.com/moon-thumb.jpg',
      },
    ],
    geo: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [23.4729, 0.6741],
      },
      properties: {
        label: 'Sea of Tranquility',
      },
    },
  },
  {
    id: 'web',
    title: 'Public Web Adoption',
    start: '1993-01-01',
    end: '2000-12-31',
    description: 'Rapid global adoption of the web.',
    color: '#0f766e',
    importance: 8,
  },
  {
    id: 'today-1',
    title: 'Project Kickoff',
    start: '2026-04-10',
    description: 'Modern day event for day-level zoom.',
    color: '#dc2626',
    importance: 8,
  },
  {
    id: 'today-2',
    title: 'Architecture Review',
    start: '2026-04-10',
    description: 'Another same-point event on the current day.',
    color: '#0284c7',
    importance: 6,
  },
  {
    id: 'today-3',
    title: 'Release Notes Draft',
    start: '2026-04-10',
    description: 'Third same-day event around the current demo date.',
    color: '#7c3aed',
    importance: 5,
  },
  {
    id: 'today-range',
    title: 'Implementation Sprint',
    start: '2026-04-08',
    end: '2026-04-14',
    description: 'Range event spanning several days.',
    color: '#65a30d',
    importance: 4,
  },
];

const historicalThemes = [
  {
    prefix: 'structure',
    title: 'Civic Works Program',
    color: '#4b5563',
    description: 'Long-running infrastructure and civic design work.',
  },
  {
    prefix: 'motion',
    title: 'Trade Route Expansion',
    color: '#2563eb',
    description: 'Movement of goods and people across new corridors.',
  },
  {
    prefix: 'hardware',
    title: 'Workshop Tooling Upgrade',
    color: '#b45309',
    description: 'Incremental tooling improvements across local workshops.',
  },
  {
    prefix: 'electronics',
    title: 'Communications Milestone',
    color: '#0891b2',
    description: 'New capability in signaling, networks, or computation.',
  },
  {
    prefix: 'misc',
    title: 'Cultural Exchange Summit',
    color: '#7c3aed',
    description: 'Regional exchange event with archival media and notes.',
  },
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function generateHistoricalEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const startYear = 1410;
  const count = 72;

  for (let index = 0; index < count; index += 1) {
    const year = startYear + index * 8;
    const theme = historicalThemes[index % historicalThemes.length];
    const month = (index % 12) + 1;
    const day = ((index * 3) % 24) + 1;
    const start = `${year}-${pad2(month)}-${pad2(day)}`;
    const rangeLengthYears = (index % 4) + 1;

    events.push({
      id: `${theme.prefix}-${year}`,
      title: `${theme.title} ${year}`,
      start,
      end: `${year + rangeLengthYears}-${pad2(month)}-${pad2(Math.min(day + 2, 28))}`,
      description: theme.description,
      color: theme.color,
      importance: (index % 5) + 3,
      attachments:
        index % 6 === 0
          ? [
              {
                name: `${theme.title} Brief`,
                url: `https://example.com/archive/${theme.prefix}-${year}.pdf`,
                mimeType: 'application/pdf',
              },
            ]
          : undefined,
    });

    if (index % 9 === 0) {
      events.push({
        id: `${theme.prefix}-${year}-cluster-a`,
        title: `Turning Point ${year}`,
        start,
        description: 'Clustered point event to stress same-position rendering.',
        color: theme.color,
        importance: 8,
      });
      events.push({
        id: `${theme.prefix}-${year}-cluster-b`,
        title: `Archive Note ${year}`,
        start,
        description: 'Companion point event sharing the same anchor.',
        color: '#dc2626',
        importance: 6,
      });
    }
  }

  return events;
}

function generateModernEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const anchor = Date.UTC(2026, 2, 1);

  for (let index = 0; index < 42; index += 1) {
    const ts = anchor + index * 3 * 24 * 60 * 60 * 1000;
    const date = new Date(ts);
    const month = pad2(date.getUTCMonth() + 1);
    const day = pad2(date.getUTCDate());
    const dateLabel = `${date.getUTCFullYear()}-${month}-${day}`;

    events.push({
      id: `modern-${index + 1}`,
      title: `Delivery Checkpoint ${index + 1}`,
      start: dateLabel,
      description: 'Near-present event for week and day zoom testing.',
      color: index % 2 === 0 ? '#0f766e' : '#0284c7',
      importance: (index % 4) + 4,
      media:
        index % 7 === 0
          ? [
              {
                type: 'image',
                url: `https://example.com/media/checkpoint-${index + 1}.jpg`,
                thumbnailUrl: `https://example.com/media/checkpoint-${index + 1}-thumb.jpg`,
              },
            ]
          : undefined,
    });

    if (index % 6 === 0) {
      events.push({
        id: `modern-range-${index + 1}`,
        title: `Iteration Window ${index + 1}`,
        start: dateLabel,
        end: `${date.getUTCFullYear()}-${month}-${pad2(Math.min(date.getUTCDate() + 4, 28))}`,
        description: 'Short range event layered among dense point events.',
        color: '#65a30d',
        importance: 5,
      });
    }
  }

  return events;
}

const sampleEvents: TimelineEvent[] = [
  ...baseEvents,
  ...generateHistoricalEvents(),
  ...generateModernEvents(),
];

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
          startBound="1400-01-01"
          endBound="2030-12-31"
          maxZoomUnit="century"
          minZoomUnit="day"
          initialZoomUnit="decade"
          initialCenter="1969-07-20"
          height={800}
          unitHeight={300}
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

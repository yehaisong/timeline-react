import { VerticalTimeline } from './components/VerticalTimeline';
import type { TimelineEvent } from './lib/types';
import './styles/app.css';

const sampleEvents: TimelineEvent[] = [
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
    id: 'today-range',
    title: 'Implementation Sprint',
    start: '2026-04-08',
    end: '2026-04-14',
    description: 'Range event spanning several days.',
    color: '#65a30d',
    importance: 4,
  },
];

export default function App() {
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
          height={760}
        />
      </section>
    </main>
  );
}


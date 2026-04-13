# `historical-timeline-react`

Private React vertical timeline component with discrete zoom from `century` down to `day`.

This repo currently contains:
- the reusable timeline library
- a local demo app used for development and iteration

Related repo:
- consumer example app: `https://github.com/yehaisong/timeline-react-consumer`

## Status

The library surface is being extracted for private publishing through GitHub Packages.

## Install

### Use It Locally In Your Own Project

If you only need the timeline in your own local React project, do not publish it yet.

Use a local file dependency instead:

```json
{
  "dependencies": {
    "historical-timeline-react": "file:../timeline_react"
  }
}
```

Then run:

```bash
npm install
```

This is the simplest path for local development and avoids package registry setup entirely.

You can also build a tarball for local installation:

```bash
cd /path/to/timeline_react
npm run build:lib
npm pack
```

Then install the generated `.tgz` file from your consuming project.

### Publish Later If Needed

GitHub Packages setup for a consuming project:

```ini
@yehaisong:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install historical-timeline-react
```

## Usage

Import the library stylesheet once:

```ts
import 'historical-timeline-react/styles.css';
```

Minimal usage:

```tsx
import {
  VerticalTimeline,
  type TimelineEvent,
} from 'historical-timeline-react';

const events: TimelineEvent[] = [
  {
    id: 'moon-landing',
    title: 'Apollo 11 Moon Landing',
    start: '1969-07-20',
    importance: 10,
  },
];

export function Example() {
  return (
    <VerticalTimeline
      events={events}
      maxZoomUnit="century"
      minZoomUnit="day"
      initialZoomUnit="decade"
      height={800}
      unitHeight={100}
    />
  );
}
```

## Event Date Fields

The component supports three separate date concerns:

- `start` / `end`: semantic source-of-truth event dates
- `placementStart` / `placementEnd`: optional exact dates used only for placement on the timeline
- `displayStart` / `displayEnd`: optional strings used only for built-in date text in the detail panel and cluster list

This is useful when your source data is year-only, but you still want more precise placement on the rail.

Example:

```tsx
const events: TimelineEvent[] = [
  {
    id: 'azusa-street',
    title: 'Azusa Street Revival',
    start: '1906',
    end: '1909',
    placementStart: '1906-04-09',
    placementEnd: '1909-01-01',
    displayStart: '1906',
    displayEnd: '1909',
  },
];
```

## Demo Settings Template

The demo app loads its timeline behavior and appearance from:

- `src/data/timeline-settings.json`

Sample alternate templates are included at:

- `src/data/timeline-settings-ocean.json`
- `src/data/timeline-settings-ember.json`

That JSON file is the template for:
- zoom bounds
- default zoom
- unit height
- detail mode
- display options
- theme options

The settings panel edits that same shape in memory, and `Reset` restores the values from the JSON file.

## Public Config Surface

Behavior options:

```ts
type TimelineDisplayOptions = {
  showMiniMap?: boolean;
  showMajorTicks?: boolean;
  showMajorLabels?: boolean;
  showMinorTicks?: boolean;
  showMinorLabels?: boolean;
  miniMapWidth?: number;
  clusterLaneLimit?: number;
};
```

Theme options:

```ts
type TimelineTheme = {
  axisColor?: string;
  majorTickColor?: string;
  minorTickColor?: string;
  labelPillBg?: string;
  labelPillText?: string;
  eventCardBg?: string;
  eventCardText?: string;
  eventCardBorder?: string;
  eventCardHoverBg?: string;
  eventCardActiveBorder?: string;
  miniMapBg?: string;
  miniMapBorder?: string;
  miniMapTrackColor?: string;
  miniMapViewportBorder?: string;
  miniMapViewportBg?: string;
  miniMapDensityLow?: string;
  miniMapDensityHigh?: string;
  cardWidth?: number;
  cardMaxWidth?: number;
  stackOffset?: number;
  axisWidth?: number;
  axisOffset?: number;
  labelShift?: number;
};
```

Example:

```tsx
<VerticalTimeline
  events={events}
  maxZoomUnit="century"
  minZoomUnit="year"
  initialZoomUnit="decade"
  unitHeight={120}
  display={{
    showMiniMap: true,
    showMajorTicks: true,
    showMajorLabels: true,
    showMinorTicks: false,
    showMinorLabels: false,
    miniMapWidth: 160,
  }}
  theme={{
    axisColor: '#111827',
    majorTickColor: '#374151',
    minorTickColor: '#94a3b8',
    labelPillBg: '#111827',
    labelPillText: '#f8fafc',
    cardMaxWidth: 240,
    stackOffset: 96,
  }}
/>
```

## Handling Event Clicks And Detail Panels

The timeline supports both patterns:

1. consumer-managed detail UI through `onEventClick`
2. built-in detail UI through `detailMode`

Built-in detail options:

```ts
type TimelineDetailMode = 'none' | 'modal' | 'slide';
```

The component default is `slide`.

Example:

```tsx
<VerticalTimeline
  events={events}
  detailMode="slide"
/>
```

If you want full control, use `onEventClick` to open your own detail UI, such as:
- a side drawer
- a modal
- a bottom sheet
- an inline detail panel

Consumer-managed example:

```tsx
import { useState } from 'react';
import {
  VerticalTimeline,
  type NormalizedTimelineEvent,
  type TimelineEvent,
} from 'historical-timeline-react';

const events: TimelineEvent[] = [
  {
    id: 'apollo-11',
    title: 'Apollo 11 Moon Landing',
    start: '1969-07-20',
    description: 'First crewed lunar landing.',
  },
];

export function TimelineWithDetailPanel() {
  const [selectedEvent, setSelectedEvent] = useState<NormalizedTimelineEvent | null>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
      <VerticalTimeline
        events={events}
        maxZoomUnit="century"
        minZoomUnit="day"
        initialZoomUnit="decade"
        height={800}
        unitHeight={100}
        onEventClick={setSelectedEvent}
      />

      {selectedEvent ? (
        <aside>
          <h2>{selectedEvent.title}</h2>
          <p>{selectedEvent.description}</p>
        </aside>
      ) : null}
    </div>
  );
}
```

Use the built-in `detailMode` when the default panel behavior is enough, and use `onEventClick` when your app needs a custom detail surface.

## Scripts

- `npm run dev`
  runs the local demo app
- `npm run build:demo`
  builds the demo app to `dist-demo`
- `npm run build`
- `npm run build:lib`
  builds the library package to `dist`

## Current Scope

Library code:
- `src/components`
- `src/hooks`
- `src/lib`
- `src/styles/library.css`
- `src/index.ts`

Demo-only code:
- `src/App.tsx`
- `src/main.tsx`
- `src/styles/app.css`
- local sample data

## Copyright

Copyright (c) 2026 Haisong Ye. Released under the MIT License.

Built with Codex GPT-5.4.

# Vertical Timeline React Spec

## Goal

Build a React vertical timeline component that:

- scrolls vertically through time
- zooms from `century` down to `day`
- lets the caller define the highest allowed zoom-out level and lowest allowed zoom-in level
- renders point events and range events
- supports optional media, attachments, and GeoJSON location on events
- is structured so performance remains acceptable over very large date ranges

This document is the working spec for implementation.

## Core Requirements

### Timeline Behavior

- The timeline axis is vertical.
- Earlier time appears above later time.
- The viewport is defined by a visible time range, not by raw pixel position alone.
- Zoom must support these discrete units:
  - `century`
  - `decade`
  - `year`
  - `quarter`
  - `month`
  - `week`
  - `day`
- The component must allow:
  - `maxZoomUnit`: most zoomed-out unit
  - `minZoomUnit`: most zoomed-in unit
- The component must clamp zoom attempts outside that range.
- Zoom should preserve the visual focal point when possible.

### Data Model

- Events must support:
  - point-in-time events
  - date-range events
  - optional media
  - optional attachments
  - optional GeoJSON location
- Internal time calculations should use normalized timestamps.
- Input dates may be strings or `Date` objects.

### Rendering

- The axis must render major and minor ticks appropriate to the active zoom level.
- Events must be positioned against the time axis.
- Range events must visually span from start to end.
- Point events must anchor to a single point on the axis.
- The implementation should avoid rendering the full timeline range at once.

### API Design

- The component should be usable in controlled or mostly controlled form.
- The public API must allow:
  - passing events
  - configuring zoom bounds
  - setting initial viewport
  - responding to viewport changes
  - customizing event rendering

## Non-Goals For V1

- No BCE date support unless implementation is naturally compatible.
- No collaborative editing.
- No server persistence.
- No map rendering inside the component.
- No arbitrary continuous zoom scale. Use discrete zoom units first.
- No hour or minute zoom in V1.

## Technical Approach

### Time Model

Use a discrete zoom ladder:

```ts
type TimelineZoomUnit =
  | 'century'
  | 'decade'
  | 'year'
  | 'quarter'
  | 'month'
  | 'week'
  | 'day';
```

Represent viewport state as:

```ts
type TimelineViewport = {
  visibleStartMs: number;
  visibleEndMs: number;
  zoomUnit: TimelineZoomUnit;
};
```

Implementation guidance:

- `zoomUnit` determines tick generation and scale density.
- `visibleStartMs` and `visibleEndMs` define what is on screen.
- Zooming changes both `zoomUnit` and visible range.
- Panning changes visible range without changing `zoomUnit`.

### Zoom Rules

- Zoom is discrete between the allowed units.
- Example ladder:
  - `century -> decade -> year -> quarter -> month -> week -> day`
- If caller sets:
  - `maxZoomUnit = 'year'`
  - `minZoomUnit = 'week'`
  then only `year`, `quarter`, `month`, and `week` are allowed.

### Tick Generation

Tick generation should depend on the current zoom level:

| Zoom Unit | Major Ticks | Minor Ticks |
| --- | --- | --- |
| century | centuries | decades |
| decade | decades | years |
| year | years | months |
| quarter | quarters | months |
| month | months | weeks |
| week | weeks | days |
| day | days | optional sub-day markers later |

Rules:

- Major labels must remain readable.
- Tick generation must be deterministic.
- Tick generation must operate only for the visible range plus buffer.

## Event Spec

### Public Event Type

```ts
export type TimelineMediaItem = {
  id?: string;
  type: 'image' | 'video' | 'audio' | 'embed';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  mimeType?: string;
};

export type TimelineAttachment = {
  id?: string;
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type TimelineGeoJSONGeometry =
  | {
      type: 'Point';
      coordinates: [longitude: number, latitude: number];
    }
  | {
      type: 'LineString';
      coordinates: [longitude: number, latitude: number][];
    }
  | {
      type: 'Polygon';
      coordinates: [longitude: number, latitude: number][][];
    };

export type TimelineGeoJSONFeature = {
  type: 'Feature';
  geometry: TimelineGeoJSONGeometry;
  properties?: Record<string, unknown>;
  id?: string | number;
};

export type TimelineEvent = {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
  allDay?: boolean;

  description?: string;
  groupId?: string;
  color?: string;
  icon?: string;
  importance?: number;

  media?: TimelineMediaItem[];
  attachments?: TimelineAttachment[];
  geo?: TimelineGeoJSONFeature;

  metadata?: Record<string, unknown>;
};
```

### Normalized Event Type

```ts
export type NormalizedTimelineEvent = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  isRange: boolean;
  allDay: boolean;

  description?: string;
  groupId?: string;
  color?: string;
  icon?: string;
  importance: number;

  media?: TimelineMediaItem[];
  attachments?: TimelineAttachment[];
  geo?: TimelineGeoJSONFeature;

  metadata?: Record<string, unknown>;
};
```

Normalization rules:

- `end` absent means `endMs = startMs`
- `isRange = endMs > startMs`
- reject invalid dates
- reject `end < start`
- default `importance = 0`
- sort by:
  - `startMs`
  - then descending `importance`
  - then `title`

Important GeoJSON rule:

- coordinates are `[longitude, latitude]`

## Component API

### Main Component

```ts
export type VerticalTimelineProps = {
  events: TimelineEvent[];

  startBound?: string | Date;
  endBound?: string | Date;

  maxZoomUnit?: TimelineZoomUnit;
  minZoomUnit?: TimelineZoomUnit;
  initialZoomUnit?: TimelineZoomUnit;

  initialStart?: string | Date;
  initialEnd?: string | Date;
  initialCenter?: string | Date;

  viewport?: TimelineViewport;
  onViewportChange?: (viewport: TimelineViewport) => void;

  renderEvent?: (event: NormalizedTimelineEvent) => React.ReactNode;
  onEventClick?: (event: NormalizedTimelineEvent) => void;

  className?: string;
  style?: React.CSSProperties;
};
```

### Behavior Rules

- If `viewport` is provided, component behaves as controlled.
- Otherwise it manages viewport internally.
- If `startBound` and `endBound` exist, panning and zooming must clamp to them.
- `initialCenter` may be used to derive initial visible range if explicit range is not provided.

## Rendering Rules

### Layout

- Vertical axis occupies one column.
- Event cards occupy a separate content column.
- Event cards should not overlap the axis labels.
- Range events render with visible start and end bounds.
- Point events render with a marker and card anchor.

### Visual Style

The timeline should feel like a serious data-navigation tool, not a decorative infographic.

V1 style goals:

- clean, high-contrast vertical axis
- readable labels across large zoom changes
- restrained card styling
- clear visual distinction between:
  - point events
  - range events
  - clustered events
- good usability on desktop first

Recommended design direction:

- neutral background
- strong axis line
- moderate use of color on markers, event accents, and category indicators
- avoid heavy shadows, glass effects, or ornamental gradients

Suggested visual tokens:

```ts
type TimelineTheme = {
  background: string;
  axis: string;
  majorTick: string;
  minorTick: string;
  label: string;
  mutedLabel: string;
  eventCardBackground: string;
  eventCardBorder: string;
  eventCardText: string;
  rangeFill: string;
  clusterBadgeBackground: string;
  clusterBadgeText: string;
  focusOutline: string;
};
```

Recommended defaults:

- background: near white or very light neutral
- axis: dark neutral
- major ticks: darker than minor ticks
- labels: strong contrast
- event cards: white or lightly tinted with subtle border
- range spans: soft fill with stronger edge
- cluster badge: clearly visible accent

### Event Styling Rules

- Point events:
  - use a marker dot or pin anchored to the axis
  - connect to the card with a short leader line if needed
- Range events:
  - use a vertical span bar aligned with start and end
  - render the card at the start, midpoint, or most readable visible position
- Clustered events:
  - show up to the visible lane cap
  - style `+N more` as an intentional badge, not plain text

### Typography

- prioritize legibility over branding in V1
- use one UI font family consistently
- maintain readable label sizes at each zoom level
- date labels should visually dominate secondary metadata

### Interaction Styling

- hover, focus, and selected states must be visually distinct
- keyboard focus must be obvious
- zoom controls should always be visible and unambiguous
- current zoom unit should be visually indicated

### Responsive Guidance

- desktop is the primary target for V1
- on narrower layouts:
  - reduce visible event card width
  - collapse metadata before truncating title
  - prefer drawers or overlays for expanded cluster details

### Default Design Tokens

Use a simple token set in V1 so styling is consistent and easy to override.

Suggested CSS variables:

```css
:root {
  --tl-color-bg: #f7f6f2;
  --tl-color-surface: #ffffff;
  --tl-color-surface-alt: #f1efe8;
  --tl-color-axis: #1f2937;
  --tl-color-major-tick: #374151;
  --tl-color-minor-tick: #9ca3af;
  --tl-color-label: #111827;
  --tl-color-label-muted: #6b7280;
  --tl-color-border: #d1d5db;
  --tl-color-range: #dbeafe;
  --tl-color-range-edge: #2563eb;
  --tl-color-cluster-bg: #111827;
  --tl-color-cluster-text: #ffffff;
  --tl-color-focus: #0f766e;
  --tl-color-shadow: rgba(17, 24, 39, 0.08);

  --tl-font-ui: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --tl-font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;

  --tl-font-size-xs: 12px;
  --tl-font-size-sm: 13px;
  --tl-font-size-md: 15px;
  --tl-font-size-lg: 18px;

  --tl-line-height-tight: 1.2;
  --tl-line-height-normal: 1.45;

  --tl-space-1: 4px;
  --tl-space-2: 8px;
  --tl-space-3: 12px;
  --tl-space-4: 16px;
  --tl-space-5: 20px;
  --tl-space-6: 24px;
  --tl-space-8: 32px;
  --tl-space-10: 40px;

  --tl-radius-sm: 6px;
  --tl-radius-md: 10px;
  --tl-radius-lg: 14px;

  --tl-axis-width: 88px;
  --tl-lane-gap: 12px;
  --tl-card-width: 280px;
  --tl-card-max-width: 320px;
  --tl-marker-size: 10px;
  --tl-range-width: 6px;

  --tl-shadow-sm: 0 1px 2px var(--tl-color-shadow);
  --tl-shadow-md: 0 6px 18px var(--tl-color-shadow);
}
```

### Color Palette

Use a restrained neutral base with a blue range accent and a teal focus color.

Recommended palette:

- background: `#f7f6f2`
- surface: `#ffffff`
- alternate surface: `#f1efe8`
- primary text: `#111827`
- muted text: `#6b7280`
- axis: `#1f2937`
- border: `#d1d5db`
- range accent: `#2563eb`
- range fill: `#dbeafe`
- focus accent: `#0f766e`
- cluster badge: `#111827` with white text

Usage rules:

- do not use saturated colors for the full interface
- reserve stronger colors for event accents, active controls, and focus states
- event-specific colors should appear as left borders, markers, or small badges rather than full-card fills

### Typography

Recommended defaults:

- UI font:
  - `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`
- Monospace for precise labels or debug overlays:
  - `"JetBrains Mono", "SFMono-Regular", Consolas, monospace`

Text hierarchy:

- axis major labels: `15px`, medium or semibold
- axis minor labels: `12px` to `13px`, regular
- event title: `15px`, semibold
- event metadata: `12px` to `13px`, regular
- cluster badge: `12px`, medium

Typography rules:

- keep titles compact
- avoid very light font weights
- avoid large display typography in V1
- keep line lengths short inside cards

### Spacing, Padding, and Margins

Use a compact but breathable spacing scale.

Recommended defaults:

- timeline outer padding: `24px`
- axis internal padding: `8px`
- card padding: `12px 14px`
- gap between axis and event lanes: `16px`
- gap between stacked cards in a cluster: `12px`
- gap between text blocks inside a card: `8px`
- cluster badge padding: `4px 8px`

Margin rules:

- avoid arbitrary margins on child components
- prefer parent-controlled gaps and stack spacing
- keep vertical rhythm aligned to the spacing scale above

### Borders, Radius, and Shadows

Recommended defaults:

- card border: `1px solid #d1d5db`
- card radius: `10px`
- cluster badge radius: `999px` or rounded pill
- subtle shadow only:
  - small resting shadow
  - slightly stronger hover shadow

Rules:

- do not rely on heavy shadows for separation
- use borders and spacing first
- cluster badges may be more visually assertive than event cards

### Event Card Layout

Suggested card structure:

1. title row
2. date or range row
3. optional description snippet
4. optional metadata row
   - media count
   - attachment count
   - geo indicator

Suggested layout metrics:

- card width: `280px`
- max card width: `320px`
- minimum touch-friendly interactive height: `36px`
- title bottom margin: `4px`
- metadata top margin: `8px`

### Zoom Controls

Recommended control styling:

- compact floating control group
- placed top-right or top-left of the timeline container
- white or neutral surface
- bordered buttons
- active zoom state clearly visible

Suggested metrics:

- control button size: `32px` to `36px`
- control group gap: `8px`
- control panel padding: `8px`

### Optional Category Colors

If the implementer wants category accents, start with these:

- `Kits / Bundles`: `#7c3aed`
- `Motion`: `#2563eb`
- `Electronics`: `#0891b2`
- `Game Elements / Fields`: `#dc2626`
- `Hardware`: `#b45309`
- `Structure`: `#4b5563`
- `Tools`: `#0f766e`
- `Pneumatics`: `#0284c7`
- `Classroom Organization`: `#65a30d`
- `Misc.`: `#6b7280`

Use these as accents only:

- marker color
- thin leading border
- small badge

Do not use them as full background fills for all cards.

### Event Density

V1 strategy:

- Use simple lane assignment for overlapping visible events.
- Overlap detection only needs to consider the visible range plus buffer.
- Do not attempt perfect packing in V1.

### Multiple Events At The Same Time Point

This is an explicit requirement.

Multiple events may resolve to the same rendered time position, especially when:

- several events share the same timestamp
- several events fall into the same visible bucket at the current zoom level
- a zoomed-out view compresses many events into the same pixel band

V1 mitigation strategy:

1. Cluster events that resolve to the same rendered y-position at the current zoom level.
2. Keep one shared vertical anchor on the time axis.
3. Lay out event cards horizontally in lanes beside that anchor.
4. Limit the number of visible lanes.
5. Collapse overflow into a summary indicator such as `+N more`.
6. Expand the full set on click, hover, or focus.

Rules:

- Clustering should be based on rendered position, not only exact raw timestamp equality.
- At different zoom levels, the same events may cluster or separate.
- The implementation should recompute clustering when the zoom level changes.
- Same-position events must not render directly on top of one another.

Recommended V1 defaults:

- show up to `3` visible events per cluster
- if more than `3`, show a `+N more` summary chip
- open a popover, drawer, or inline expanded panel to reveal all events in the cluster

Suggested ordering within a cluster:

- descending `importance`
- then earlier `startMs`
- then `title`

Suggested internal structure:

```ts
type EventCluster = {
  key: string;
  y: number;
  events: NormalizedTimelineEvent[];
  visibleEvents: NormalizedTimelineEvent[];
  hiddenCount: number;
};
```

Acceptance criteria for clustering:

- multiple same-point events remain readable
- the axis anchor remains correct
- overflow does not create unusable horizontal sprawl
- zooming in can reduce clustering when the time positions separate

### Custom Rendering

- Allow `renderEvent` override.
- Default rendering should display:
  - title
  - date or date range
  - optional description snippet
  - media count if present
  - attachment count if present
  - geo presence indicator if present

## Performance Requirements

- Do not render every tick and event across the entire dataset.
- Only render:
  - visible ticks
  - nearby buffered ticks
  - visible events
  - nearby buffered events
- Time-to-interaction should remain reasonable with:
  - several hundred events
  - date ranges spanning multiple centuries

Recommended V1 approach:

- axis virtualization by visible range math
- event filtering by visible range
- avoid DOM nodes for offscreen content

## Suggested File Structure

```text
timeline_react/
  src/
    components/
      VerticalTimeline.tsx
      TimelineAxis.tsx
      TimelineTicks.tsx
      TimelineEventLayer.tsx
      TimelineEventCard.tsx
      TimelineControls.tsx
    hooks/
      useTimelineViewport.ts
      useVisibleTicks.ts
      useVisibleEvents.ts
    lib/
      timeScale.ts
      tickGenerator.ts
      normalizeEvents.ts
      laneLayout.ts
      clampViewport.ts
      types.ts
    demo/
      sampleEvents.ts
      DemoPage.tsx
```

## Implementation Phases

### Phase 1: Types and Utilities

Build:

- `types.ts`
- event normalization
- zoom ladder helpers
- viewport clamping helpers
- date range helpers

Acceptance criteria:

- event normalization works
- zoom bounds are enforced
- viewport calculations are testable without UI

### Phase 2: Axis Rendering

Build:

- visible tick generation
- vertical axis rendering
- label formatting per zoom unit

Acceptance criteria:

- correct major/minor ticks for each zoom level
- no full-range over-rendering

### Phase 3: Viewport and Interaction

Build:

- internal viewport state hook
- wheel zoom
- zoom in/out controls
- vertical pan/scroll behavior

Acceptance criteria:

- zoom clamps at min/max units
- viewport changes are stable
- focal point is approximately preserved on zoom

### Phase 4: Event Layer

Build:

- visible event filtering
- point event rendering
- range event rendering
- simple overlap lane layout

Acceptance criteria:

- point and range events render at expected positions
- overlapping visible events do not completely cover one another

### Phase 5: Customization and Polish

Build:

- `renderEvent` override
- event click callback
- styling hooks
- sample/demo page

Acceptance criteria:

- host app can replace event card renderer
- default renderer handles optional media, attachments, and geo presence

### Phase 6: Tests

Minimum test coverage:

- normalization tests
- zoom ladder tests
- viewport clamp tests
- tick generation tests
- event visibility tests

## Acceptance Criteria

The implementation is acceptable when:

- it supports zoom from `century` to `day`
- caller can restrict highest and lowest zoom units
- it renders a vertical timeline with point and range events
- events support optional media, attachments, and GeoJSON
- the timeline can handle a wide range such as `1500` to `2100`
- the code is structured into reusable time math and UI layers
- a demo exists showing:
  - multi-century zoomed-out view
  - yearly or monthly mid-zoom view
  - day-level zoomed-in view

## Open Decisions

The implementing agent may decide these details as long as the core spec is preserved:

- exact pixel scale per zoom unit
- whether to use plain CSS or a component styling library
- whether to use `date-fns`, `luxon`, or minimal native date helpers
- whether to use an existing virtualization helper or custom visible-range math

## Recommended First Deliverable

The first implementation PR should include:

- core types
- event normalization
- zoom ladder utilities
- viewport model
- basic vertical axis with visible tick generation
- a simple demo with static sample events

Do not start with advanced styling or map integration. Get the time model and viewport correct first.

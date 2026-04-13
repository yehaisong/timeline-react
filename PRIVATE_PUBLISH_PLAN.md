# Private Publish Plan

## Goal
Package the timeline as a private reusable React component library that can be installed into other React projects without copying source files.

## Registry
Use GitHub Packages first.

Reasons:
- the repo is already on GitHub
- private access control is straightforward
- no extra registry infrastructure is needed right now

## Package Boundary
Keep reusable library code in the package surface:
- `src/components/VerticalTimeline.tsx`
- `src/components/TimelineAxis.tsx`
- `src/components/TimelineEventLayer.tsx`
- `src/components/TimelineMiniMap.tsx`
- `src/hooks/useTimelineViewport.ts`
- `src/hooks/useResponsiveTimelineConfig.ts`
- `src/lib/*`
- `src/styles/tokens.css`
- `src/styles/verticalTimeline.css`
- `src/index.ts`

Keep demo-only code out of the package:
- `src/App.tsx`
- `src/main.tsx`
- `src/styles/app.css`
- demo data files
- settings panel
- detail drawer

## Public API
Export only the supported API from `src/index.ts`:
- `VerticalTimeline`
- public timeline types
- optional public helpers like `getZoomUnits`

Do not export internal clustering or layout helpers unless they are intentionally supported long-term.

## Configuration Model
Expose two public configuration surfaces.

### Behavior Props
- `maxZoomUnit`
- `minZoomUnit`
- `initialZoomUnit`
- `height`
- `unitHeight`
- `clusterLaneLimit`
- `showMiniMap`
- `showMajorTicks`
- `showMajorLabels`
- `showMinorTicks`
- `showMinorLabels`
- `miniMapWidth`
- `viewport`
- `onViewportChange`
- `renderEvent`
- `onEventClick`

Recommended grouping:

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

### Appearance Theme
Expose a typed theme prop instead of requiring raw CSS variable edits.

```ts
type TimelineTheme = {
  axisColor?: string;
  majorTickColor?: string;
  minorTickColor?: string;
  labelPillBg?: string;
  labelPillText?: string;
  cardWidth?: number;
  cardMaxWidth?: number;
  stackOffset?: number;
  axisWidth?: number;
  axisOffset?: number;
  labelShift?: number;
};
```

The demo settings panel should edit these public surfaces rather than controlling ad hoc internal values.

## Styling
Ship one compiled CSS file for consumers:

```ts
import '@yehaisong/timeline-react/styles.css';
```

Keep CSS variables as the supported theme implementation detail under the typed `theme` prop.

## Build and Packaging
Add a library build that outputs:
- `dist/index.js`
- `dist/index.d.ts`
- `dist/styles.css`

Update `package.json` with:
- scoped package name, for example `@yehaisong/timeline-react`
- `publishConfig.registry` pointing to GitHub Packages
- `peerDependencies` for `react` and `react-dom`
- `files` limited to `dist`
- `exports` for JS and CSS entrypoints

## Demo Separation
Move the current app shell into a demo surface:
- `demo/`
- `example/`
- or keep it outside the package entrypoint

The package must not depend on:
- sample data
- detail drawer
- debug settings panel
- app-level layout CSS

## Docs
Document:
- install from GitHub Packages
- required `.npmrc` auth setup
- CSS import
- minimal usage example
- controlled viewport example
- theming example
- event schema

## Validation
Before publishing, test the built package from a second local React app and verify:
- JS import works
- CSS import works
- types resolve
- no hidden dependency on demo files
- no app-shell CSS leakage

## Recommended Execution Order
1. Extract the library boundary first.
2. Add `display` and `theme` as formal public API.
3. Move the current settings panel to consume only that public API.
4. Fine tune responsive behavior on top of the extracted boundary.
5. Add library build and package metadata.
6. Test from a second local React app.
7. Publish privately to GitHub Packages.

## Recommendation
Do not fine tune responsive behavior first in the current mixed app structure.

Better sequence:
- extract the library boundary first
- formalize the public config API
- then continue responsive tuning through that public API

Reason:
- it prevents demo-only assumptions from leaking into the reusable component
- it forces clearer ownership of what downstream users are allowed to configure
- it reduces rework before private publishing

That said, this should be a light extraction pass first, not a full packaging pass. The goal is to create a clean boundary early, then keep refining behavior on the clean side of that boundary.

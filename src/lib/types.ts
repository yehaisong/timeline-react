import type { CSSProperties, ReactNode } from 'react';

export type TimelineZoomUnit =
  | 'century'
  | 'decade'
  | 'year'
  | 'quarter'
  | 'month'
  | 'week'
  | 'day';

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
  placementStart?: string | Date;
  placementEnd?: string | Date;
  displayStart?: string;
  displayEnd?: string;
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

export type NormalizedTimelineEvent = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  displayStartLabel: string;
  displayEndLabel?: string;
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

export type TimelineViewport = {
  visibleStartMs: number;
  visibleEndMs: number;
  zoomUnit: TimelineZoomUnit;
};

export type TimelineLayoutMode = 'desktop' | 'tablet' | 'mobile';

export type TimelineResponsiveConfig = {
  mode: TimelineLayoutMode;
  showMiniMap: boolean;
  showMajorTicks: boolean;
  showMajorLabels: boolean;
  showMinorTicks: boolean;
  showMinorLabels: boolean;
  cardWidth: number;
  cardMaxWidth: number;
  stackOffset: number;
  labelShift: number;
  axisWidth: number;
  axisOffset: number;
  clusterLaneLimit: number;
  miniMapWidth: number;
  detailPanelMode: 'drawer' | 'sheet';
  clusterRevealMode: 'popover' | 'sheet';
};

export type TimelineDisplayOptions = {
  showMiniMap?: boolean;
  showMajorTicks?: boolean;
  showMajorLabels?: boolean;
  showMinorTicks?: boolean;
  showMinorLabels?: boolean;
  miniMapWidth?: number;
  clusterLaneLimit?: number;
};

export type TimelineTheme = {
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

export type TimelineDetailMode = 'none' | 'modal' | 'slide';

export type EventCluster = {
  key: string;
  y: number;
  events: NormalizedTimelineEvent[];
  visibleEvents: NormalizedTimelineEvent[];
  hiddenCount: number;
};

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
  renderEvent?: (event: NormalizedTimelineEvent) => ReactNode;
  renderDetail?: (event: NormalizedTimelineEvent) => ReactNode;
  onEventClick?: (event: NormalizedTimelineEvent) => void;
  detailMode?: TimelineDetailMode;
  height?: number | string;
  unitHeight?: number;
  clusterLaneLimit?: number;
  display?: TimelineDisplayOptions;
  theme?: TimelineTheme;
  className?: string;
  style?: CSSProperties;
};

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
  onEventClick?: (event: NormalizedTimelineEvent) => void;
  height?: number | string;
  unitHeight?: number;
  clusterLaneLimit?: number;
  className?: string;
  style?: CSSProperties;
};

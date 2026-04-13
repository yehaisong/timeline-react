import { useMemo } from 'react';
import type { TimelineResponsiveConfig } from '../lib/types';

type UseResponsiveTimelineConfigArgs = {
  containerWidth: number;
};

export function useResponsiveTimelineConfig({
  containerWidth,
}: UseResponsiveTimelineConfigArgs): TimelineResponsiveConfig {
  return useMemo(() => {
    if (containerWidth < 768) {
      return {
        mode: 'mobile',
        showMiniMap: true,
        showMajorTicks: true,
        showMajorLabels: true,
        showMinorTicks: false,
        showMinorLabels: false,
        cardWidth: 184,
        cardMaxWidth: 204,
        stackOffset: 44,
        labelShift: 8,
        axisWidth: 76,
        axisOffset: -30,
        clusterLaneLimit: 1,
        miniMapWidth: 18,
        detailPanelMode: 'sheet',
        clusterRevealMode: 'sheet',
      };
    }

    if (containerWidth < 1200) {
      return {
        mode: 'tablet',
        showMiniMap: true,
        showMajorTicks: true,
        showMajorLabels: true,
        showMinorTicks: true,
        showMinorLabels: true,
        cardWidth: 240,
        cardMaxWidth: 260,
        stackOffset: 180,
        labelShift: 24,
        axisWidth: 104,
        axisOffset: -48,
        clusterLaneLimit: 2,
        miniMapWidth: 108,
        detailPanelMode: 'drawer',
        clusterRevealMode: 'popover',
      };
    }

    return {
      mode: 'desktop',
      showMiniMap: true,
      showMajorTicks: true,
      showMajorLabels: true,
      showMinorTicks: true,
      showMinorLabels: true,
      cardWidth: 236,
      cardMaxWidth: 248,
      stackOffset: 104,
      labelShift: 62,
      axisWidth: 136,
      axisOffset: -70,
      clusterLaneLimit: 3,
      miniMapWidth: 136,
      detailPanelMode: 'drawer',
      clusterRevealMode: 'popover',
    };
  }, [containerWidth]);
}

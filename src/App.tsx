import { useState } from 'react';
import { VerticalTimeline } from './components/VerticalTimeline';
import type {
  TimelineDetailMode,
  TimelineEvent,
  TimelineDisplayOptions,
  TimelineTheme,
  TimelineZoomUnit,
} from './lib/types';
import {
  clampZoomUnit,
  compareZoomUnits,
  getZoomUnits,
  normalizeDateInput,
} from './lib/timeScale';
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

const desktopSettingsDefaults = {
  unitHeight: 100,
  axisWidth: 136,
  axisOffset: -70,
  labelShift: 62,
  cardWidth: 236,
  cardMaxWidth: 248,
  stackOffset: 40,
  clusterLaneLimit: 2,
  showMiniMap: true,
  miniMapWidth: 136,
  showMajorTicks: true,
  showMajorLabels: true,
  showMinorTicks: true,
  showMinorLabels: true,
  maxZoomUnit: 'century' as TimelineZoomUnit,
  minZoomUnit: 'year' as TimelineZoomUnit,
  initialZoomUnit: 'decade' as TimelineZoomUnit,
  detailMode: 'slide' as TimelineDetailMode,
  labelPillBg: '#111827',
  labelPillText: '#f8fafc',
  axisColor: '#1f2937',
  majorTickColor: '#374151',
  minorTickColor: '#9ca3af',
};

const zoomUnits = getZoomUnits();

export default function App() {
  const [desktopSettings, setDesktopSettings] = useState(desktopSettingsDefaults);
  const [settingsPanelCollapsed, setSettingsPanelCollapsed] = useState(true);

  const display: TimelineDisplayOptions = {
    showMiniMap: desktopSettings.showMiniMap,
    miniMapWidth: desktopSettings.miniMapWidth,
    showMajorTicks: desktopSettings.showMajorTicks,
    showMajorLabels: desktopSettings.showMajorLabels,
    showMinorTicks: desktopSettings.showMinorTicks,
    showMinorLabels: desktopSettings.showMinorLabels,
    clusterLaneLimit: desktopSettings.clusterLaneLimit,
  };

  const theme: TimelineTheme = {
    axisWidth: desktopSettings.axisWidth,
    axisOffset: desktopSettings.axisOffset,
    labelShift: desktopSettings.labelShift,
    cardWidth: desktopSettings.cardWidth,
    cardMaxWidth: desktopSettings.cardMaxWidth,
    stackOffset: desktopSettings.stackOffset,
    labelPillBg: desktopSettings.labelPillBg,
    labelPillText: desktopSettings.labelPillText,
    axisColor: desktopSettings.axisColor,
    majorTickColor: desktopSettings.majorTickColor,
    minorTickColor: desktopSettings.minorTickColor,
  };

  function updateDesktopSetting<Key extends keyof typeof desktopSettingsDefaults>(
    key: Key,
    value: (typeof desktopSettingsDefaults)[Key]
  ) {
    setDesktopSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateZoomSetting(
    key: 'maxZoomUnit' | 'minZoomUnit' | 'initialZoomUnit',
    value: TimelineZoomUnit
  ) {
    setDesktopSettings((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (compareZoomUnits(next.maxZoomUnit, next.minZoomUnit) > 0) {
        if (key === 'maxZoomUnit') {
          next.minZoomUnit = value;
        } else if (key === 'minZoomUnit') {
          next.maxZoomUnit = value;
        }
      }

      next.initialZoomUnit =
        key === 'initialZoomUnit'
          ? clampZoomUnit(value, next.maxZoomUnit, next.minZoomUnit)
          : clampZoomUnit(next.initialZoomUnit, next.maxZoomUnit, next.minZoomUnit);

      return next;
    });
  }

  const timelineKey = [
    desktopSettings.maxZoomUnit,
    desktopSettings.minZoomUnit,
    desktopSettings.initialZoomUnit,
  ].join(':');

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">Vertical Timeline</p>
          <h1 className="app-title">Multi-century to day-level navigation</h1>
        </div>
        <p className="app-summary">
          Scroll to pan. Use the zoom controls to change the timeline scale.
        </p>
      </header>

      <section className="app-stage">
        <aside
          className={`app-settings-panel${settingsPanelCollapsed ? ' app-settings-panel-collapsed' : ''}`}
          aria-label="Timeline settings"
        >
          <div className="app-settings-header">
            <div>
              <p className="app-settings-eyebrow">Desktop Settings</p>
              <h2 className="app-settings-title">Timeline behavior</h2>
            </div>
            <div className="app-settings-actions">
              <button
                type="button"
                className="app-settings-icon-button"
                onClick={() => setDesktopSettings(desktopSettingsDefaults)}
              >
                Reset
              </button>
              <button
                type="button"
                className="app-settings-icon-button"
                onClick={() => setSettingsPanelCollapsed((current) => !current)}
                aria-expanded={settingsPanelCollapsed ? 'false' : 'true'}
                aria-label={settingsPanelCollapsed ? 'Expand settings panel' : 'Collapse settings panel'}
              >
                {settingsPanelCollapsed ? 'Open' : 'Minimize'}
              </button>
            </div>
          </div>

          {!settingsPanelCollapsed ? (
            <>
              <div className="app-settings-grid">
                <label className="app-settings-field">
                  <span>Unit height</span>
                  <input
                    type="range"
                    min="60"
                    max="240"
                    step="10"
                    value={desktopSettings.unitHeight}
                    onChange={(event) => updateDesktopSetting('unitHeight', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.unitHeight}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Axis width</span>
                  <input
                    type="range"
                    min="96"
                    max="180"
                    step="4"
                    value={desktopSettings.axisWidth}
                    onChange={(event) => updateDesktopSetting('axisWidth', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.axisWidth}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Axis offset</span>
                  <input
                    type="range"
                    min="-120"
                    max="-20"
                    step="2"
                    value={desktopSettings.axisOffset}
                    onChange={(event) => updateDesktopSetting('axisOffset', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.axisOffset}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Label shift</span>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    step="2"
                    value={desktopSettings.labelShift}
                    onChange={(event) => updateDesktopSetting('labelShift', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.labelShift}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Card width</span>
                  <input
                    type="range"
                    min="180"
                    max="320"
                    step="4"
                    value={desktopSettings.cardWidth}
                    onChange={(event) => updateDesktopSetting('cardWidth', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.cardWidth}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Card max width</span>
                  <input
                    type="range"
                    min="200"
                    max="360"
                    step="4"
                    value={desktopSettings.cardMaxWidth}
                    onChange={(event) =>
                      updateDesktopSetting('cardMaxWidth', Number(event.target.value))
                    }
                  />
                  <strong>{desktopSettings.cardMaxWidth}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Stack offset</span>
                  <input
                    type="range"
                    min="40"
                    max="220"
                    step="4"
                    value={desktopSettings.stackOffset}
                    onChange={(event) => updateDesktopSetting('stackOffset', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.stackOffset}px</strong>
                </label>

                <label className="app-settings-field">
                  <span>Visible stacked cards</span>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={desktopSettings.clusterLaneLimit}
                    onChange={(event) =>
                      updateDesktopSetting('clusterLaneLimit', Number(event.target.value))
                    }
                  />
                  <strong>{desktopSettings.clusterLaneLimit}</strong>
                </label>

                <label className="app-settings-field">
                  <span>Mini-map width</span>
                  <input
                    type="range"
                    min="88"
                    max="220"
                    step="4"
                    value={desktopSettings.miniMapWidth}
                    onChange={(event) => updateDesktopSetting('miniMapWidth', Number(event.target.value))}
                  />
                  <strong>{desktopSettings.miniMapWidth}px</strong>
                </label>
              </div>

              <div className="app-settings-grid app-settings-grid-compact">
                <label className="app-settings-field">
                  <span>Max zoom out</span>
                  <select
                    value={desktopSettings.maxZoomUnit}
                    onChange={(event) =>
                      updateZoomSetting('maxZoomUnit', event.target.value as TimelineZoomUnit)
                    }
                  >
                    {zoomUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="app-settings-field">
                  <span>Max zoom in</span>
                  <select
                    value={desktopSettings.minZoomUnit}
                    onChange={(event) =>
                      updateZoomSetting('minZoomUnit', event.target.value as TimelineZoomUnit)
                    }
                  >
                    {zoomUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="app-settings-field">
                  <span>Default zoom</span>
                  <select
                    value={desktopSettings.initialZoomUnit}
                    onChange={(event) =>
                      updateZoomSetting('initialZoomUnit', event.target.value as TimelineZoomUnit)
                    }
                  >
                    {zoomUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="app-settings-field">
                  <span>Detail mode</span>
                  <select
                    value={desktopSettings.detailMode}
                    onChange={(event) =>
                      updateDesktopSetting('detailMode', event.target.value as TimelineDetailMode)
                    }
                  >
                    <option value="none">none</option>
                    <option value="modal">modal</option>
                    <option value="slide">slide</option>
                  </select>
                </label>
              </div>

              <div className="app-settings-grid app-settings-grid-compact">
                <label className="app-settings-field">
                  <span>Year label background</span>
                  <input
                    type="color"
                    value={desktopSettings.labelPillBg}
                    onChange={(event) => updateDesktopSetting('labelPillBg', event.target.value)}
                  />
                </label>

                <label className="app-settings-field">
                  <span>Year label text</span>
                  <input
                    type="color"
                    value={desktopSettings.labelPillText}
                    onChange={(event) => updateDesktopSetting('labelPillText', event.target.value)}
                  />
                </label>

                <label className="app-settings-field">
                  <span>Rail color</span>
                  <input
                    type="color"
                    value={desktopSettings.axisColor}
                    onChange={(event) => updateDesktopSetting('axisColor', event.target.value)}
                  />
                </label>

                <label className="app-settings-field">
                  <span>Major tick color</span>
                  <input
                    type="color"
                    value={desktopSettings.majorTickColor}
                    onChange={(event) => updateDesktopSetting('majorTickColor', event.target.value)}
                  />
                </label>

                <label className="app-settings-field">
                  <span>Minor tick color</span>
                  <input
                    type="color"
                    value={desktopSettings.minorTickColor}
                    onChange={(event) => updateDesktopSetting('minorTickColor', event.target.value)}
                  />
                </label>
              </div>

              <div className="app-settings-toggles">
                <div className="app-settings-toggle-group">
                  <p className="app-settings-toggle-group-title">Major rail</p>
                  <label className="app-settings-toggle">
                    <input
                      type="checkbox"
                      checked={desktopSettings.showMajorTicks}
                      onChange={(event) =>
                        updateDesktopSetting('showMajorTicks', event.target.checked)
                      }
                    />
                    <span>Ticks</span>
                  </label>
                  <label className="app-settings-toggle">
                    <input
                      type="checkbox"
                      checked={desktopSettings.showMajorLabels}
                      onChange={(event) =>
                        updateDesktopSetting('showMajorLabels', event.target.checked)
                      }
                    />
                    <span>Labels</span>
                  </label>
                </div>

                <div className="app-settings-toggle-group">
                  <p className="app-settings-toggle-group-title">Minor rail</p>
                  <label className="app-settings-toggle">
                    <input
                      type="checkbox"
                      checked={desktopSettings.showMinorTicks}
                      onChange={(event) =>
                        updateDesktopSetting('showMinorTicks', event.target.checked)
                      }
                    />
                    <span>Ticks</span>
                  </label>
                  <label className="app-settings-toggle">
                    <input
                      type="checkbox"
                      checked={desktopSettings.showMinorLabels}
                      onChange={(event) =>
                        updateDesktopSetting('showMinorLabels', event.target.checked)
                      }
                    />
                    <span>Labels</span>
                  </label>
                </div>

                <div className="app-settings-toggle-group">
                  <p className="app-settings-toggle-group-title">Other</p>
                  <label className="app-settings-toggle">
                    <input
                      type="checkbox"
                      checked={desktopSettings.showMiniMap}
                      onChange={(event) => updateDesktopSetting('showMiniMap', event.target.checked)}
                    />
                    <span>Mini-map</span>
                  </label>
                </div>
              </div>
            </>
          ) : null}
        </aside>

        <VerticalTimeline
          key={timelineKey}
          events={sampleEvents}
          startBound={timelineStartDate}
          endBound={timelineEndDate}
          maxZoomUnit={desktopSettings.maxZoomUnit}
          minZoomUnit={desktopSettings.minZoomUnit}
          initialZoomUnit={desktopSettings.initialZoomUnit}
          initialCenter={timelineCenterDate}
          height="100%"
          unitHeight={desktopSettings.unitHeight}
          clusterLaneLimit={desktopSettings.clusterLaneLimit}
          display={display}
          theme={theme}
          detailMode={desktopSettings.detailMode}
        />
      </section>
    </main>
  );
}

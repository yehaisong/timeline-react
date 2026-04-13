import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { VerticalTimeline } from './components/VerticalTimeline';
import type {
  TimelineDetailMode,
  TimelineEvent,
  TimelineSettingsTemplate,
  TimelineZoomUnit,
} from './lib/types';
import {
  clampZoomUnit,
  compareZoomUnits,
  getZoomUnits,
  normalizeDateInput,
} from './lib/timeScale';
import sampleEventsData from './data/myevents_cht_timeline.json';
import timelineSettingsData from './data/timeline-settings.json';
import oceanTimelineSettingsData from './data/timeline-settings-ocean.json';
import emberTimelineSettingsData from './data/timeline-settings-ember.json';
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

const loadedTimelineSettings = timelineSettingsData as TimelineSettingsTemplate;
const oceanTimelineSettings = oceanTimelineSettingsData as TimelineSettingsTemplate;
const emberTimelineSettings = emberTimelineSettingsData as TimelineSettingsTemplate;

const desktopSettingsDefaults: TimelineSettingsTemplate = {
  version: 1,
  maxZoomUnit: loadedTimelineSettings.maxZoomUnit ?? 'century',
  minZoomUnit: loadedTimelineSettings.minZoomUnit ?? 'year',
  initialZoomUnit: loadedTimelineSettings.initialZoomUnit ?? 'decade',
  unitHeight: loadedTimelineSettings.unitHeight ?? 100,
  detailMode: loadedTimelineSettings.detailMode ?? 'slide',
  display: {
    showMiniMap: loadedTimelineSettings.display?.showMiniMap ?? true,
    miniMapWidth: loadedTimelineSettings.display?.miniMapWidth ?? 136,
    showMajorTicks: loadedTimelineSettings.display?.showMajorTicks ?? true,
    showMajorLabels: loadedTimelineSettings.display?.showMajorLabels ?? true,
    showMinorTicks: loadedTimelineSettings.display?.showMinorTicks ?? true,
    showMinorLabels: loadedTimelineSettings.display?.showMinorLabels ?? true,
    clusterLaneLimit: loadedTimelineSettings.display?.clusterLaneLimit ?? 2,
  },
  theme: {
    axisWidth: loadedTimelineSettings.theme?.axisWidth ?? 136,
    axisOffset: loadedTimelineSettings.theme?.axisOffset ?? -70,
    labelShift: loadedTimelineSettings.theme?.labelShift ?? 62,
    cardWidth: loadedTimelineSettings.theme?.cardWidth ?? 236,
    cardMaxWidth: loadedTimelineSettings.theme?.cardMaxWidth ?? 248,
    stackOffset: loadedTimelineSettings.theme?.stackOffset ?? 40,
    labelPillBg: loadedTimelineSettings.theme?.labelPillBg ?? '#111827',
    labelPillText: loadedTimelineSettings.theme?.labelPillText ?? '#f8fafc',
    axisColor: loadedTimelineSettings.theme?.axisColor ?? '#1f2937',
    majorTickColor: loadedTimelineSettings.theme?.majorTickColor ?? '#374151',
    minorTickColor: loadedTimelineSettings.theme?.minorTickColor ?? '#9ca3af',
    eventCardBg: loadedTimelineSettings.theme?.eventCardBg ?? '#ffffff',
    eventCardText: loadedTimelineSettings.theme?.eventCardText ?? '#111827',
    eventCardBorder: loadedTimelineSettings.theme?.eventCardBorder ?? '#d1d5db',
    eventCardHoverBg: loadedTimelineSettings.theme?.eventCardHoverBg ?? '#f8fafc',
    eventCardActiveBorder: loadedTimelineSettings.theme?.eventCardActiveBorder ?? '#94a3b8',
    miniMapBg: loadedTimelineSettings.theme?.miniMapBg ?? 'rgba(255, 255, 255, 0.72)',
    miniMapBorder: loadedTimelineSettings.theme?.miniMapBorder ?? '#d1d5db',
    miniMapTrackColor: loadedTimelineSettings.theme?.miniMapTrackColor ?? '#1f2937',
    miniMapViewportBorder:
      loadedTimelineSettings.theme?.miniMapViewportBorder ?? '#0f766e',
    miniMapViewportBg:
      loadedTimelineSettings.theme?.miniMapViewportBg ?? 'rgba(15, 118, 110, 0.1)',
    miniMapDensityLow: loadedTimelineSettings.theme?.miniMapDensityLow ?? '#dbeafe',
    miniMapDensityHigh: loadedTimelineSettings.theme?.miniMapDensityHigh ?? '#1d4ed8',
  },
};

function normalizeSettingsTemplate(input: unknown): TimelineSettingsTemplate {
  const candidate = typeof input === 'object' && input !== null
    ? (input as Partial<TimelineSettingsTemplate>)
    : {};

  const maxZoomUnit =
    typeof candidate.maxZoomUnit === 'string' && zoomUnits.includes(candidate.maxZoomUnit as TimelineZoomUnit)
      ? (candidate.maxZoomUnit as TimelineZoomUnit)
      : desktopSettingsDefaults.maxZoomUnit;
  const minZoomUnit =
    typeof candidate.minZoomUnit === 'string' && zoomUnits.includes(candidate.minZoomUnit as TimelineZoomUnit)
      ? (candidate.minZoomUnit as TimelineZoomUnit)
      : desktopSettingsDefaults.minZoomUnit;
  const initialZoomCandidate =
    typeof candidate.initialZoomUnit === 'string' && zoomUnits.includes(candidate.initialZoomUnit as TimelineZoomUnit)
      ? (candidate.initialZoomUnit as TimelineZoomUnit)
      : desktopSettingsDefaults.initialZoomUnit;
  const detailMode =
    candidate.detailMode === 'none' || candidate.detailMode === 'modal' || candidate.detailMode === 'slide'
      ? candidate.detailMode
      : desktopSettingsDefaults.detailMode;
  const unitHeight =
    typeof candidate.unitHeight === 'number' && Number.isFinite(candidate.unitHeight)
      ? candidate.unitHeight
      : desktopSettingsDefaults.unitHeight;

  return {
    version: 1,
    maxZoomUnit,
    minZoomUnit,
    initialZoomUnit: clampZoomUnit(initialZoomCandidate, maxZoomUnit, minZoomUnit),
    unitHeight,
    detailMode,
    display: {
      ...desktopSettingsDefaults.display,
      ...(typeof candidate.display === 'object' && candidate.display !== null ? candidate.display : {}),
    },
    theme: {
      ...desktopSettingsDefaults.theme,
      ...(typeof candidate.theme === 'object' && candidate.theme !== null ? candidate.theme : {}),
    },
  };
}

const zoomUnits = getZoomUnits();

export default function App() {
  const [desktopSettings, setDesktopSettings] = useState(desktopSettingsDefaults);
  const [settingsPanelCollapsed, setSettingsPanelCollapsed] = useState(true);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  function updateTemplateSetting<Key extends keyof TimelineSettingsTemplate>(
    key: Key,
    value: TimelineSettingsTemplate[Key]
  ) {
    setDesktopSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDisplaySetting<Key extends keyof TimelineSettingsTemplate['display']>(
    key: Key,
    value: NonNullable<TimelineSettingsTemplate['display'][Key]>
  ) {
    setDesktopSettings((current) => ({
      ...current,
      display: {
        ...current.display,
        [key]: value,
      },
    }));
  }

  function updateThemeSetting<Key extends keyof TimelineSettingsTemplate['theme']>(
    key: Key,
    value: NonNullable<TimelineSettingsTemplate['theme'][Key]>
  ) {
    setDesktopSettings((current) => ({
      ...current,
      theme: {
        ...current.theme,
        [key]: value,
      },
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

  function handleExportSettings() {
    const requestedName = window.prompt(
      'Export filename',
      'timeline-settings.json'
    );
    if (requestedName === null) {
      return;
    }

    const trimmedName = requestedName.trim();
    if (!trimmedName) {
      setSettingsNotice('Export cancelled: filename is required.');
      return;
    }

    const fileName = trimmedName.endsWith('.json') ? trimmedName : `${trimmedName}.json`;
    const json = JSON.stringify(desktopSettings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setSettingsNotice(
      fileName === 'timeline-settings.json'
        ? 'Settings exported.'
        : `Exported as ${fileName}. Rename it to timeline-settings.json when copying it into the app.`
    );
  }

  function handleLoadPreset(name: string, settings: TimelineSettingsTemplate) {
    setDesktopSettings(normalizeSettingsTemplate(settings));
    setSettingsNotice(`Loaded ${name} template.`);
  }

  async function handleImportSettings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setDesktopSettings(normalizeSettingsTemplate(parsed));
      setSettingsNotice(`Loaded ${file.name}.`);
    } catch {
      setSettingsNotice('Invalid settings JSON.');
    } finally {
      event.target.value = '';
    }
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
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="app-settings-file-input"
            onChange={handleImportSettings}
          />

          {settingsPanelCollapsed ? (
            <div className="app-settings-collapsed-actions">
              <div className="app-settings-collapsed-title">
                <p className="app-settings-eyebrow">Desktop Settings</p>
                <h2 className="app-settings-title">Timeline settings</h2>
              </div>
              <button
                type="button"
                className="app-settings-icon-button app-settings-open-button"
                onClick={() => setSettingsPanelCollapsed(false)}
                aria-expanded="false"
                aria-label="Expand settings panel"
              >
                <svg
                  className="app-settings-open-icon"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    d="M5.5 7.5L10 12l4.5-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <div className="app-settings-header">
                <div>
                  <p className="app-settings-eyebrow">Desktop Settings</p>
                  <h2 className="app-settings-title">Timeline behavior</h2>
                </div>
                <div className="app-settings-actions">
                  <div className="app-settings-action-group" role="group" aria-label="Settings actions">
                    <button
                      type="button"
                      className="app-settings-icon-button"
                      onClick={() => importInputRef.current?.click()}
                    >
                      Load JSON
                    </button>
                    <button
                      type="button"
                      className="app-settings-icon-button"
                      onClick={handleExportSettings}
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      className="app-settings-icon-button"
                      onClick={() => handleLoadPreset('Ocean', oceanTimelineSettings)}
                    >
                      Ocean
                    </button>
                    <button
                      type="button"
                      className="app-settings-icon-button"
                      onClick={() => handleLoadPreset('Ember', emberTimelineSettings)}
                    >
                      Ember
                    </button>
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
                      onClick={() => setSettingsPanelCollapsed(true)}
                      aria-expanded="true"
                      aria-label="Collapse settings panel"
                    >
                      Minimize
                    </button>
                  </div>
                </div>
              </div>

              {settingsNotice ? <p className="app-settings-notice">{settingsNotice}</p> : null}

              <section className="app-settings-section">
                <div className="app-settings-section-header">
                  <p className="app-settings-section-eyebrow">Layout</p>
                  <h3 className="app-settings-section-title">Scale and geometry</h3>
                </div>
                <div className="app-settings-grid app-settings-grid-five">
                  <label className="app-settings-field">
                    <span>Unit height</span>
                    <input
                      type="range"
                      min="60"
                      max="240"
                      step="10"
                      value={desktopSettings.unitHeight}
                      onChange={(event) => updateTemplateSetting('unitHeight', Number(event.target.value))}
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
                      value={desktopSettings.theme.axisWidth ?? 136}
                      onChange={(event) => updateThemeSetting('axisWidth', Number(event.target.value))}
                    />
                    <strong>{desktopSettings.theme.axisWidth ?? 136}px</strong>
                  </label>

                  <label className="app-settings-field">
                    <span>Axis offset</span>
                    <input
                      type="range"
                      min="-120"
                      max="-20"
                      step="2"
                      value={desktopSettings.theme.axisOffset ?? -70}
                      onChange={(event) => updateThemeSetting('axisOffset', Number(event.target.value))}
                    />
                    <strong>{desktopSettings.theme.axisOffset ?? -70}px</strong>
                  </label>

                  <label className="app-settings-field">
                    <span>Label shift</span>
                    <input
                      type="range"
                      min="24"
                      max="96"
                      step="2"
                      value={desktopSettings.theme.labelShift ?? 62}
                      onChange={(event) => updateThemeSetting('labelShift', Number(event.target.value))}
                    />
                    <strong>{desktopSettings.theme.labelShift ?? 62}px</strong>
                  </label>

                  <label className="app-settings-field">
                    <span>Card width</span>
                    <input
                      type="range"
                      min="180"
                      max="320"
                      step="4"
                      value={desktopSettings.theme.cardWidth ?? 236}
                      onChange={(event) => updateThemeSetting('cardWidth', Number(event.target.value))}
                    />
                    <strong>{desktopSettings.theme.cardWidth ?? 236}px</strong>
                  </label>

                  <label className="app-settings-field">
                    <span>Card max width</span>
                    <input
                      type="range"
                      min="200"
                      max="360"
                      step="4"
                      value={desktopSettings.theme.cardMaxWidth ?? 248}
                      onChange={(event) =>
                        updateThemeSetting('cardMaxWidth', Number(event.target.value))
                      }
                    />
                    <strong>{desktopSettings.theme.cardMaxWidth ?? 248}px</strong>
                  </label>

                  <label className="app-settings-field">
                    <span>Stack offset</span>
                    <input
                      type="range"
                      min="0"
                      max="220"
                      step="4"
                      value={desktopSettings.theme.stackOffset ?? 40}
                      onChange={(event) => updateThemeSetting('stackOffset', Number(event.target.value))}
                    />
                    <strong>{desktopSettings.theme.stackOffset ?? 40}px</strong>
                  </label>

                  <label className="app-settings-field">
                    <span>Mini-map width</span>
                    <input
                      type="range"
                      min="88"
                      max="220"
                      step="4"
                      value={desktopSettings.display.miniMapWidth ?? 136}
                      onChange={(event) => updateDisplaySetting('miniMapWidth', Number(event.target.value))}
                    />
                    <strong>{desktopSettings.display.miniMapWidth ?? 136}px</strong>
                  </label>
                </div>
              </section>

              <section className="app-settings-section">
                <div className="app-settings-section-header">
                  <p className="app-settings-section-eyebrow">Behavior</p>
                  <h3 className="app-settings-section-title">Zoom and interaction</h3>
                </div>
                <div className="app-settings-grid app-settings-grid-five">
                  <label className="app-settings-field">
                    <span>Visible stacked cards</span>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={desktopSettings.display.clusterLaneLimit ?? 2}
                      onChange={(event) =>
                        updateDisplaySetting('clusterLaneLimit', Number(event.target.value))
                      }
                    />
                    <strong>{desktopSettings.display.clusterLaneLimit ?? 2}</strong>
                  </label>

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
                        updateTemplateSetting('detailMode', event.target.value as TimelineDetailMode)
                      }
                    >
                      <option value="none">none</option>
                      <option value="modal">modal</option>
                      <option value="slide">slide</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="app-settings-section">
                <div className="app-settings-section-header">
                  <p className="app-settings-section-eyebrow">Rail</p>
                  <h3 className="app-settings-section-title">Axis and label colors</h3>
                </div>
                <div className="app-settings-grid app-settings-grid-five">
                  <label className="app-settings-field">
                    <span>Year label bg</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.labelPillBg ?? '#111827'}
                      onChange={(event) => updateThemeSetting('labelPillBg', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Year label text</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.labelPillText ?? '#f8fafc'}
                      onChange={(event) => updateThemeSetting('labelPillText', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Rail color</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.axisColor ?? '#1f2937'}
                      onChange={(event) => updateThemeSetting('axisColor', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Major tick</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.majorTickColor ?? '#374151'}
                      onChange={(event) => updateThemeSetting('majorTickColor', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Minor tick</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.minorTickColor ?? '#9ca3af'}
                      onChange={(event) => updateThemeSetting('minorTickColor', event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="app-settings-section">
                <div className="app-settings-section-header">
                  <p className="app-settings-section-eyebrow">Cards</p>
                  <h3 className="app-settings-section-title">Event card colors</h3>
                </div>
                <div className="app-settings-grid app-settings-grid-five">
                  <label className="app-settings-field">
                    <span>Card bg</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.eventCardBg ?? '#ffffff'}
                      onChange={(event) => updateThemeSetting('eventCardBg', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Card text</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.eventCardText ?? '#111827'}
                      onChange={(event) => updateThemeSetting('eventCardText', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Card border</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.eventCardBorder ?? '#d1d5db'}
                      onChange={(event) => updateThemeSetting('eventCardBorder', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Hover bg</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.eventCardHoverBg ?? '#f8fafc'}
                      onChange={(event) => updateThemeSetting('eventCardHoverBg', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Active border</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.eventCardActiveBorder ?? '#94a3b8'}
                      onChange={(event) =>
                        updateThemeSetting('eventCardActiveBorder', event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="app-settings-section">
                <div className="app-settings-section-header">
                  <p className="app-settings-section-eyebrow">Mini-map</p>
                  <h3 className="app-settings-section-title">Overview colors</h3>
                </div>
                <div className="app-settings-grid app-settings-grid-five">
                  <label className="app-settings-field">
                    <span>Mini-map bg</span>
                    <input
                      type="text"
                      value={desktopSettings.theme.miniMapBg ?? 'rgba(255, 255, 255, 0.72)'}
                      onChange={(event) => updateThemeSetting('miniMapBg', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Mini-map border</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.miniMapBorder ?? '#d1d5db'}
                      onChange={(event) => updateThemeSetting('miniMapBorder', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Track color</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.miniMapTrackColor ?? '#1f2937'}
                      onChange={(event) => updateThemeSetting('miniMapTrackColor', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Viewport border</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.miniMapViewportBorder ?? '#0f766e'}
                      onChange={(event) =>
                        updateThemeSetting('miniMapViewportBorder', event.target.value)
                      }
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Viewport bg</span>
                    <input
                      type="text"
                      value={desktopSettings.theme.miniMapViewportBg ?? 'rgba(15, 118, 110, 0.1)'}
                      onChange={(event) =>
                        updateThemeSetting('miniMapViewportBg', event.target.value)
                      }
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Density low</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.miniMapDensityLow ?? '#dbeafe'}
                      onChange={(event) => updateThemeSetting('miniMapDensityLow', event.target.value)}
                    />
                  </label>

                  <label className="app-settings-field">
                    <span>Density high</span>
                    <input
                      type="color"
                      value={desktopSettings.theme.miniMapDensityHigh ?? '#1d4ed8'}
                      onChange={(event) =>
                        updateThemeSetting('miniMapDensityHigh', event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="app-settings-section">
                <div className="app-settings-section-header">
                  <p className="app-settings-section-eyebrow">Visibility</p>
                  <h3 className="app-settings-section-title">Ticks, labels, and mini-map</h3>
                </div>
                <div className="app-settings-grid app-settings-grid-five">
                  <label className="app-settings-toggle-card">
                    <input
                      type="checkbox"
                      checked={desktopSettings.display.showMajorTicks ?? true}
                      onChange={(event) => updateDisplaySetting('showMajorTicks', event.target.checked)}
                    />
                    <span>Show major ticks</span>
                  </label>
                  <label className="app-settings-toggle-card">
                    <input
                      type="checkbox"
                      checked={desktopSettings.display.showMajorLabels ?? true}
                      onChange={(event) => updateDisplaySetting('showMajorLabels', event.target.checked)}
                    />
                    <span>Show major labels</span>
                  </label>
                  <label className="app-settings-toggle-card">
                    <input
                      type="checkbox"
                      checked={desktopSettings.display.showMinorTicks ?? true}
                      onChange={(event) => updateDisplaySetting('showMinorTicks', event.target.checked)}
                    />
                    <span>Show minor ticks</span>
                  </label>
                  <label className="app-settings-toggle-card">
                    <input
                      type="checkbox"
                      checked={desktopSettings.display.showMinorLabels ?? true}
                      onChange={(event) => updateDisplaySetting('showMinorLabels', event.target.checked)}
                    />
                    <span>Show minor labels</span>
                  </label>
                  <label className="app-settings-toggle-card">
                    <input
                      type="checkbox"
                      checked={desktopSettings.display.showMiniMap ?? true}
                      onChange={(event) => updateDisplaySetting('showMiniMap', event.target.checked)}
                    />
                    <span>Show mini-map</span>
                  </label>
                </div>
              </section>
            </>
          )}
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
          clusterLaneLimit={desktopSettings.display.clusterLaneLimit ?? 2}
          display={desktopSettings.display}
          theme={desktopSettings.theme}
          detailMode={desktopSettings.detailMode}
        />
      </section>
    </main>
  );
}

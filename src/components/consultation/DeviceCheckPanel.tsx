// =============================================================================
// DeviceCheckPanel — the mandatory 2-step pre-join audio setup.
//
//   Step 1  Microphone: explicit "Test microphone" → permission → live input
//           meter → passes only once a real voice was heard.
//   Step 2  Speaker: explicit "Play test sound" → local tone → the client
//           answers whether they heard it.
//
// There is no camera step: the camera is never touched before joining and is
// toggled from the meeting controls instead.
//
// Accessibility: every status is text + icon (never colour alone), the whole
// panel is keyboard-operable with visible focus rings, and state changes are
// announced through one polite aria-live region.
// =============================================================================

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Mic,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import PermissionHelp from '@/components/consultation/PermissionHelp';
import { isMicFailure, micGuidanceKey } from '@/services/deviceCheck';
import type { DeviceCheckApi } from '@/hooks/useDeviceCheck';

interface DeviceCheckPanelProps {
  check: DeviceCheckApi;
}

const DeviceCheckPanel: React.FC<DeviceCheckPanelProps> = ({ check }) => {
  const { t } = useTranslation();

  const micBusy = check.micState === 'requesting' || check.micState === 'listening';
  const micFailed = isMicFailure(check.micState);
  const micGuidance = micGuidanceKey(check.micState);
  const showMicHelp = check.micState === 'denied';
  const levelPercent = Math.round(check.micLevel * 100);
  const progressPercent = Math.round(check.micProgress * 100);

  // One announcement string for the whole panel — screen readers hear the
  // microphone state, then the speaker state, as they change.
  const announcement = [
    t(`meeting.setup.mic.states.${check.micState}`),
    check.deviceChanged ? t('meeting.setup.mic.deviceChanged') : '',
    t(`meeting.setup.speaker.states.${check.speakerState}`),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <section aria-labelledby="device-check-heading" className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 id="device-check-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t('meeting.setup.title')}
      </h2>
      <p className="mt-1 text-xs text-gray-500">{t('meeting.setup.required')}</p>

      {/* single live region for the whole 2-step check */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {/* Both steps sit side by side from lg up, so the mandatory setup is one
          short row and the join card below it stays on the first screen. */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2 lg:items-start">
      {/* ---------------------------------------------------------------- */}
      {/* Step 1 — microphone                                              */}
      {/* ---------------------------------------------------------------- */}
      <div className="rounded-xl border border-gray-200 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Mic className="h-4 w-4 text-pink-600" aria-hidden="true" />
            {t('meeting.setup.step1')}
          </h3>
          <StatusPill
            status={
              check.deviceChanged
                ? 'failed'
                : check.micState === 'passed'
                  ? 'passed'
                  : micBusy
                    ? 'testing'
                    : micFailed
                      ? 'failed'
                      : 'pending'
            }
            label={t(`meeting.setup.mic.states.${check.micState}`)}
          />
        </div>

        {check.deviceChanged && (
          <p role="alert" className="mt-2 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('meeting.setup.mic.deviceChanged')}
          </p>
        )}

        {check.micState === 'listening' && (
          <p className="mt-2 text-sm font-medium text-gray-900">{t('meeting.setup.mic.prompt')}</p>
        )}

        {check.micLabel && (
          <p className="mt-2 truncate text-xs text-gray-600">
            {t('meeting.setup.mic.using', { device: check.micLabel })}
          </p>
        )}

        {/* Live input meter. Shown only while a stream is actually open — once
            the test passes the stream is released, so a moving bar would be a
            decoration rather than a real reading. */}
        {check.micState === 'listening' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span id="mic-level-label">{t('meeting.setup.mic.level')}</span>
              <span>{levelPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-labelledby="mic-level-label"
              aria-valuenow={levelPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
            >
              <div
                className="h-full rounded-full bg-pink-500 transition-[width] duration-100"
                style={{ width: `${Math.max(2, levelPercent)}%` }}
              />
            </div>
            {progressPercent > 0 && (
              <p className="mt-1 text-xs text-gray-600">
                {t('meeting.setup.mic.progress', { percent: progressPercent })}
              </p>
            )}
          </div>
        )}

        {micGuidance && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {t(micGuidance)}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={check.testMicrophone}
            disabled={micBusy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-pink-400 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            {micBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : check.micState === 'passed' || micFailed ? (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Mic className="h-4 w-4" aria-hidden="true" />
            )}
            {check.micState === 'not_tested'
              ? t('meeting.setup.mic.test')
              : micBusy
                ? t(`meeting.setup.mic.states.${check.micState}`)
                : t('meeting.setup.mic.retry')}
          </button>

          {/* input picker — only meaningful once labels are readable, i.e.
              after permission, and only when there is a real choice */}
          {check.micInputs.length > 1 && (
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="mic-input-select" className="shrink-0 text-xs text-gray-600">
                {t('meeting.setup.mic.selectorLabel')}
              </label>
              <select
                id="mic-input-select"
                value={check.selectedMicId ?? ''}
                onChange={(event) => check.selectMicrophone(event.target.value || null)}
                className="min-h-11 min-w-0 max-w-[14rem] truncate rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <option value="">{t('meeting.setup.mic.defaultDevice')}</option>
                {check.micInputs.map((input) => (
                  <option key={input.deviceId} value={input.deviceId}>
                    {input.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {showMicHelp && <PermissionHelp />}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Step 2 — speaker                                                 */}
      {/* ---------------------------------------------------------------- */}
      <div className="rounded-xl border border-gray-200 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Volume2 className="h-4 w-4 text-purple-600" aria-hidden="true" />
            {t('meeting.setup.step2')}
          </h3>
          <StatusPill
            status={
              check.speakerState === 'passed'
                ? 'passed'
                : check.speakerState === 'playing' || check.speakerState === 'awaiting_answer'
                  ? 'testing'
                  : check.speakerState === 'not_tested'
                    ? 'pending'
                    : 'failed'
            }
            label={t(`meeting.setup.speaker.states.${check.speakerState}`)}
          />
        </div>

        <p className="mt-2 text-sm text-gray-700">{t('meeting.setup.speaker.caption')}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={check.playTestSound}
            disabled={check.speakerState === 'playing'}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-pink-400 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            {check.speakerState === 'playing' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
            {check.speakerState === 'not_tested'
              ? t('meeting.setup.speaker.play')
              : check.speakerState === 'playing'
                ? t('meeting.setup.speaker.playing')
                : t('meeting.setup.speaker.playAgain')}
          </button>

          {check.outputSelectionSupported && check.outputs.length > 1 ? (
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="speaker-output-select" className="shrink-0 text-xs text-gray-600">
                {t('meeting.setup.speaker.outputLabel')}
              </label>
              <select
                id="speaker-output-select"
                value={check.selectedOutputId ?? ''}
                onChange={(event) => check.selectOutput(event.target.value || null)}
                className="min-h-11 min-w-0 max-w-[14rem] truncate rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <option value="">{t('meeting.setup.speaker.defaultDevice')}</option>
                {check.outputs.map((output) => (
                  <option key={output.deviceId} value={output.deviceId}>
                    {output.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t('meeting.setup.speaker.outputUnsupported')}</p>
          )}
        </div>

        {/* explicit human confirmation — the only way this step can pass */}
        {(check.speakerState === 'awaiting_answer' ||
          check.speakerState === 'passed' ||
          check.speakerState === 'not_heard') && (
          <fieldset className="mt-3 rounded-xl bg-gray-50 p-3">
            <legend className="px-1 text-sm font-medium text-gray-900">
              {t('meeting.setup.speaker.question')}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => check.confirmSpeaker(true)}
                aria-pressed={check.speakerState === 'passed'}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  check.speakerState === 'passed'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-800 hover:border-emerald-500'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t('meeting.setup.speaker.yes')}
              </button>
              <button
                type="button"
                onClick={() => check.confirmSpeaker(false)}
                aria-pressed={check.speakerState === 'not_heard'}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  check.speakerState === 'not_heard'
                    ? 'bg-rose-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-800 hover:border-rose-400'
                }`}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t('meeting.setup.speaker.no')}
              </button>
            </div>
          </fieldset>
        )}

        {check.speakerErrorKey && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {t(check.speakerErrorKey)}
          </p>
        )}
      </div>
      </div>
    </section>
  );
};

// --- status pill -------------------------------------------------------------

/** Icon + shape + text, so status never depends on colour alone. */
const StatusPill: React.FC<{ status: 'pending' | 'testing' | 'passed' | 'failed'; label: string }> = ({
  status,
  label,
}) => {
  const styles: Record<typeof status, string> = {
    pending: 'border-gray-300 bg-gray-50 text-gray-700',
    testing: 'border-sky-300 bg-sky-50 text-sky-800',
    passed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    failed: 'border-rose-300 bg-rose-50 text-rose-800',
  };
  const Icon =
    status === 'passed' ? CheckCircle2 : status === 'failed' ? AlertTriangle : status === 'testing' ? Loader2 : Circle;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === 'testing' ? 'animate-spin' : ''}`} aria-hidden="true" />
      {label}
    </span>
  );
};

export default DeviceCheckPanel;

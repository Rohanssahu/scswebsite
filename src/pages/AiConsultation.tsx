// =============================================================================
// /ai-consultation/:meetingReference — the SCS AI Consultation Meeting.
//
// Phases: resolving → (no access / not joinable / countdown) → lobby (mandatory
// microphone + speaker check) → live meeting → ended.
//
// The lobby's audio checks are MANDATORY: "Join consultation" stays disabled
// until the microphone actually heard a voice AND the client confirmed they
// heard the test sound (see services/deviceCheck.ts for the exact gate). The
// lobby has no camera step at all: clients join audio-only and turn the camera
// on from the meeting controls if they want it.
//
// Security notes:
//   * access requires the meeting reference PLUS the scoped access token that
//     was issued once at creation (kept in sessionStorage, or pasted by the
//     client). The reference alone shows nothing.
//   * the LiveKit token, room and agent dispatch are all minted server-side.
//   * no message content, token or PII is ever written to the console.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  LogIn,
  Video,
  X,
} from 'lucide-react';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/forms/TurnstileWidget';
import AudioRecoveryBanner from '@/components/consultation/AudioRecoveryBanner';
import DeviceCheckPanel from '@/components/consultation/DeviceCheckPanel';
import JoinChecklist from '@/components/consultation/JoinChecklist';
import BuddyTile from '@/components/consultation/BuddyTile';
import ClientTile from '@/components/consultation/ClientTile';
import MeetingControls from '@/components/consultation/MeetingControls';
import MeetingHeader from '@/components/consultation/MeetingHeader';
import MeetingChat from '@/components/consultation/MeetingChat';
import ProjectDetailsPanel from '@/components/consultation/ProjectDetailsPanel';
import FilesLinksPanel from '@/components/consultation/FilesLinksPanel';
import ProposalPanel from '@/components/consultation/ProposalPanel';
import { BUDDY_AVATAR_URL } from '@/components/consultation/buddyAvatar';
import { useConsultationMeeting } from '@/hooks/useConsultationMeeting';
import { useDeviceCheck } from '@/hooks/useDeviceCheck';
import {
  buildChecklist,
  canJoinConsultation,
  deviceCheckErrorCategory,
  joinBlockReasons,
} from '@/services/deviceCheck';
import { isLeadCaptureReady } from '@/services/supabaseClient';
import {
  formatInTimezone,
  loadAccessToken,
  saveAccessToken,
  type MeetingView,
} from '@/services/consultationCore';
import {
  ConsultationError,
  cancelMeeting,
  joinMeeting,
  requestHumanReview,
  resolveMeeting,
  submitLinks,
  type LinkSubmission,
} from '@/services/consultationService';
import { trackConsultation } from '@/utils/consultationAnalytics';

type Phase = 'resolving' | 'need_token' | 'not_joinable' | 'lobby' | 'live' | 'ended';
type PanelTab = 'chat' | 'details' | 'files' | 'proposal';

const isSupportedBrowser = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof RTCPeerConnection !== 'undefined';

const AiConsultation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { meetingReference = '' } = useParams();
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const meeting = useConsultationMeeting();

  const [phase, setPhase] = useState<Phase>('resolving');
  const [view, setView] = useState<MeetingView | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  /** Epoch ms the live stage was entered — drives the header duration only. */
  const [liveSince, setLiveSince] = useState<number | null>(null);

  // lobby device state — the mandatory audio checks live in useDeviceCheck.
  // There is no lobby camera or mute control: both are toggled inside the
  // meeting itself, so the lobby never opens a camera at all.
  const check = useDeviceCheck();

  // panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('chat');
  const [links, setLinks] = useState<LinkSubmission[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [reviewRequested, setReviewRequested] = useState(false);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
    [],
  );

  const supported = useMemo(isSupportedBrowser, []);
  const isDesktop = useIsDesktop();
  const proposal = meeting.buddyState?.proposal ?? null;
  const finalized = meeting.buddyState?.finalized ?? view?.finalized ?? false;
  const finalReference = meeting.buddyState?.referenceCode ?? view?.finalizedReference ?? null;

  // ---- resolve the meeting -------------------------------------------------
  const doResolve = useCallback(
    async (token: string) => {
      setError(null);
      try {
        const resolved = await resolveMeeting(meetingReference, token);
        setView(resolved);
        setAccessToken(token);
        saveAccessToken(sessionStorage, meetingReference, token);
        trackConsultation('consultation_lobby_opened', { kind: resolved.meetingKind });
        setPhase(resolved.canJoin ? 'lobby' : 'not_joinable');
      } catch (err) {
        const code = err instanceof ConsultationError ? err.code : 'network';
        if (code === 'meeting_not_found') {
          setError(t('meeting.errors.meeting_not_found'));
          setPhase('need_token');
        } else {
          setError(t(`meeting.errors.${code}`, { defaultValue: t('meeting.errors.network') }));
          setPhase('need_token');
        }
      }
    },
    [meetingReference, t],
  );

  useEffect(() => {
    if (!meetingReference || !isLeadCaptureReady) {
      setPhase('need_token');
      return;
    }
    const stored = loadAccessToken(sessionStorage, meetingReference);
    if (stored) void doResolve(stored);
    else setPhase('need_token');
  }, [meetingReference, doResolve]);

  // ---- lobby device tests --------------------------------------------------
  // Nothing is requested on mount: DeviceCheckPanel's buttons are the only
  // things that ever open a microphone or play a sound.

  // Coarse, non-identifying outcome reporting for failed microphone tests.
  const reportedMicFailure = useRef<string | null>(null);
  useEffect(() => {
    const category = deviceCheckErrorCategory(check.micState);
    if (!category) {
      reportedMicFailure.current = null;
      return;
    }
    if (reportedMicFailure.current === check.micState) return;
    reportedMicFailure.current = check.micState;
    trackConsultation('consultation_failed', { category });
  }, [check.micState]);

  // ---- join gate ----------------------------------------------------------
  // Single source of truth for whether joining is allowed. Camera state is
  // deliberately not part of it.
  const gate = {
    meetingReady: Boolean(view?.canJoin && accessToken),
    verificationComplete: Boolean(turnstileToken),
    micState: check.micState,
    speakerState: check.speakerState,
    deviceChanged: check.deviceChanged,
    joining,
  };
  const canJoin = canJoinConsultation(gate);
  const blockReason = joinBlockReasons(gate)[0] ?? null;
  const checklist = buildChecklist(gate);

  // ---- join ---------------------------------------------------------------
  const join = async () => {
    // Belt and braces: the button is disabled, and the handler re-checks.
    if (!canJoin || !accessToken || !turnstileToken) {
      if (!turnstileToken) setError(t('meeting.schedule.errTurnstile'));
      return;
    }
    const micDeviceId = check.selectedMicId;
    setJoining(true);
    setError(null);
    try {
      const joinResponse = await joinMeeting(meetingReference, accessToken, turnstileToken);
      // Release the one temporary lobby resource before the room acquires its
      // own: the device-check stream / AudioContext.
      check.release();
      if (joinResponse.meeting) setView(joinResponse.meeting);
      await meeting.connect(joinResponse, {
        // Joins audio-only and unmuted; both are toggled from the meeting
        // controls once the client is in the room.
        camera: false,
        micMuted: false,
        // The exact microphone the client just tested.
        micDeviceId,
      });
      setLiveSince(Date.now());
      setPhase('live');
      trackConsultation('consultation_joined', { kind: view?.meetingKind ?? 'instant' });
    } catch (err) {
      const code = err instanceof ConsultationError ? err.code : err instanceof Error ? err.message : 'network';
      if (code === 'mic_denied') {
        setError(t('meeting.errors.mic_denied'));
        trackConsultation('consultation_failed', { category: 'mic_denied' });
      } else if (code === 'not_joinable') {
        setError(t('meeting.errors.not_joinable'));
        setPhase('not_joinable');
        trackConsultation('consultation_failed', { category: 'access_denied' });
      } else {
        setError(t(`meeting.errors.${code}`, { defaultValue: t('meeting.errors.connect_failed') }));
        trackConsultation('consultation_failed', {
          category: code === 'turnstile_failed' ? 'verification_failed' : 'connect_failed',
        });
      }
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setJoining(false);
    }
  };

  // ---- live-meeting side effects ------------------------------------------
  // addSystemMessage is a stable useCallback, so these effects only re-run when
  // the signal they watch actually changes.
  const { addSystemMessage, agentPresent, messages } = meeting;

  const agentAnnounced = useRef(false);
  useEffect(() => {
    if (agentPresent && !agentAnnounced.current) {
      agentAnnounced.current = true;
      addSystemMessage(t('meeting.system.buddyJoined'));
      trackConsultation('agent_joined');
    }
  }, [agentPresent, addSystemMessage, t]);

  const firstResponse = useRef(false);
  useEffect(() => {
    if (!firstResponse.current && messages.some((m) => m.sender === 'buddy')) {
      firstResponse.current = true;
      trackConsultation('first_response_received');
    }
  }, [messages]);

  const lastProposalVersion = useRef(0);
  useEffect(() => {
    if (proposal && proposal.version > lastProposalVersion.current) {
      lastProposalVersion.current = proposal.version;
      addSystemMessage(t('meeting.system.proposalUpdated'));
      trackConsultation('proposal_presented', { count: proposal.version });
    }
  }, [proposal, addSystemMessage, t]);

  const completionTracked = useRef(false);
  useEffect(() => {
    if (finalized && !completionTracked.current) {
      completionTracked.current = true;
      trackConsultation('consultation_completed');
    }
  }, [finalized]);

  // Microphone publication: the client is told the moment their audio is not
  // actually going out, and text chat stays available as the fallback. The
  // meeting is never ended automatically.
  const micPublication = meeting.micPublication;
  const lastPublication = useRef<string>('unknown');
  useEffect(() => {
    if (phase !== 'live' || micPublication === lastPublication.current) return;
    const previous = lastPublication.current;
    lastPublication.current = micPublication;
    if (micPublication === 'failed' || micPublication === 'lost') {
      addSystemMessage(t('meeting.audioRecovery.systemNotice'));
      trackConsultation('consultation_failed', { category: 'mic_publish_failed' });
    } else if (micPublication === 'published' && (previous === 'failed' || previous === 'lost')) {
      addSystemMessage(t('meeting.audioRecovery.restored'));
    }
  }, [micPublication, phase, addSystemMessage, t]);

  // Device notices: the client is told BEFORE the meeting falls back to
  // another input device, and told when no input device exists at all.
  const { micNotice, clearMicNotice } = meeting;
  useEffect(() => {
    if (!micNotice) return;
    addSystemMessage(t(`meeting.audioRecovery.notice.${micNotice}`));
    clearMicNotice();
  }, [micNotice, clearMicNotice, addSystemMessage, t]);

  // Agent-dispatch timeout: if Buddy never arrives, offer clear fallbacks.
  const [agentTimedOut, setAgentTimedOut] = useState(false);
  useEffect(() => {
    if (phase !== 'live' || agentPresent) {
      setAgentTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setAgentTimedOut(true);
      trackConsultation('consultation_failed', { category: 'agent_timeout' });
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [phase, agentPresent]);

  // ---- panel actions -------------------------------------------------------
  const handleSubmitLinks = async (items: LinkSubmission[]) => {
    if (!accessToken) return;
    setLinkSaving(true);
    setLinkError(null);
    try {
      await submitLinks(meetingReference, accessToken, items);
      setLinks((prev) => [...prev, ...items]);
      meeting.addSystemMessage(t('meeting.system.fileReceived'));
    } catch (err) {
      const code = err instanceof ConsultationError ? err.code : 'network';
      setLinkError(t(`meeting.errors.${code}`, { defaultValue: t('meeting.errors.network') }));
    } finally {
      setLinkSaving(false);
    }
  };

  const handleRequestReview = async () => {
    if (!accessToken || reviewRequested) return;
    try {
      await requestHumanReview(meetingReference, accessToken);
      setReviewRequested(true);
      meeting.addSystemMessage(t('meeting.system.reviewRequested'));
      trackConsultation('human_review_requested');
    } catch {
      setError(t('meeting.errors.network'));
    }
  };

  const downloadSummary = () => {
    const lines: string[] = [
      'SCS Softwares — AI Consultation Meeting summary',
      `Meeting reference: ${meetingReference}`,
      finalReference ? `Submission reference: ${finalReference}` : '',
      '',
      t('meeting.proposal.disclaimer'),
      '',
    ];
    if (proposal) {
      lines.push(
        `Summary: ${proposal.summary}`,
        `Estimated hours: ${proposal.totalHoursMin}–${proposal.totalHoursMax}`,
        `Estimated cost (USD): ${proposal.totalCostMin}–${proposal.totalCostMax}`,
        `Estimated duration (weeks): ${proposal.durationWeeksMin}–${proposal.durationWeeksMax} at ${proposal.weeklyCapacityHours} h/week`,
        `Confidence: ${proposal.confidence}`,
        '',
        `Recommended solution:\n- ${proposal.recommendedSolution.join('\n- ')}`,
        `In scope:\n- ${proposal.inScope.join('\n- ')}`,
        proposal.outOfScope.length ? `Out of scope:\n- ${proposal.outOfScope.join('\n- ')}` : '',
        proposal.risks.length ? `Risks:\n- ${proposal.risks.join('\n- ')}` : '',
        proposal.assumptions.length ? `Assumptions:\n- ${proposal.assumptions.join('\n- ')}` : '',
      );
    }
    const blob = new Blob([lines.filter(Boolean).join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scs-consultation-${meetingReference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const leave = async () => {
    await meeting.leave();
    setLiveSince(null);
    setPhase('ended');
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!supported) {
    return (
      <Shell>
        <Notice icon={AlertTriangle} tone="amber" title={t('meeting.errors.unsupported_browser')}>
          <Link to="/project-analysis" className="underline">
            {t('meeting.fallback.manualFlow')}
          </Link>
        </Notice>
      </Shell>
    );
  }

  if (phase === 'resolving') {
    return (
      <Shell>
        <p className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {t('common.loading')}
        </p>
      </Shell>
    );
  }

  // --- access proof required ---
  if (phase === 'need_token') {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-xl font-bold text-gray-900">{t('meeting.access.title')}</h1>
          <p className="mt-2 text-sm text-gray-600">{t('meeting.access.intro')}</p>
          <p className="mt-2 text-xs text-gray-500">
            {t('meeting.details.reference')}: <span className="font-mono">{meetingReference}</span>
          </p>
          <label htmlFor="access-token" className="mt-4 block text-sm text-gray-700">
            {t('meeting.access.tokenLabel')}
          </label>
          <input
            id="access-token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value.trim().slice(0, 128))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 font-mono text-sm focus:border-pink-500 focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void doResolve(tokenInput)}
            disabled={tokenInput.length < 40}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" /> {t('meeting.access.open')}
          </button>
          <Link
            to="/schedule-call"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('meeting.access.newMeeting')}
          </Link>
        </div>
      </Shell>
    );
  }

  // --- not joinable (too early / expired / cancelled / completed) ---
  if (phase === 'not_joinable' && view) {
    const opensAt = view.joinOpensAtUtc;
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-pink-600" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold text-gray-900">
            {t(`meeting.blocked.${view.joinBlockedReason ?? 'not_joinable'}`, {
              defaultValue: t('meeting.blocked.not_joinable'),
            })}
          </h1>
          {view.scheduledAtUtc && (
            <p className="mt-2 text-sm text-gray-700">
              {formatInTimezone(view.scheduledAtUtc, view.clientTimezone ?? 'UTC', i18n.language)}
            </p>
          )}
          {opensAt && <Countdown targetIso={opensAt} onReady={() => void (accessToken && doResolve(accessToken))} />}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => accessToken && void doResolve(accessToken)}
              className="min-h-11 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400"
            >
              {t('meeting.blocked.refresh')}
            </button>
            {view.status === 'scheduled' && accessToken && (
              <button
                type="button"
                onClick={async () => {
                  const next = await cancelMeeting(meetingReference, accessToken).catch(() => null);
                  if (next) setView(next);
                }}
                className="min-h-11 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                {t('meeting.blocked.cancel')}
              </button>
            )}
            <Link
              to="/schedule-call"
              className="min-h-11 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t('meeting.blocked.reschedule')}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // --- lobby ---
  if (phase === 'lobby' && view) {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {t('meeting.lobby.title')} <span className="text-gradient-ai">{t('meeting.lobby.titleAccent')}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">{t('meeting.lobby.subtitle', { name: view.name })}</p>

          {/* One vertical stack of full-width cards: identity strip, the two
              audio steps side by side, then verification + checklist + join.
              Keeps the lobby close to a single screen. */}
          <div className="mt-4 space-y-4">
            {/* Buddy — compact identity strip */}
            <section className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <img
                  src={BUDDY_AVATAR_URL}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full bg-white ring-2 ring-pink-500/30"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{t('meeting.buddyName')}</p>
                  <p className="text-sm text-pink-700">{t('meeting.buddyRole')}</p>
                  <p className="mt-1.5 inline-block rounded-lg bg-purple-50 px-2 py-1 text-xs text-purple-800">
                    {t('meeting.aiBadge')}
                  </p>
                </div>
                <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:justify-end">
                  <div>
                    <dt className="text-xs text-gray-500">{t('meeting.details.reference')}</dt>
                    <dd className="font-mono text-gray-900">{view.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">{t('meeting.details.language')}</dt>
                    <dd className="text-gray-900">
                      {t(`meeting.languages.${view.preferredLanguage ?? 'en'}`, {
                        defaultValue: view.preferredLanguage ?? 'en',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">{t('meeting.lobby.analysis')}</dt>
                    <dd className="text-gray-900">
                      {view.hasAnalysis ? t('meeting.lobby.analysisYes') : t('meeting.lobby.analysisNo')}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* mandatory 2-step audio setup — steps side by side */}
            <DeviceCheckPanel check={check} />

            {/* verification + checklist + join, full width under the steps.
                Turnstile and the checklist share one row so the button stays
                on the first screen. */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="shrink-0">
                  <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />
                </div>
                <div className="min-w-0 flex-1">
                  <JoinChecklist items={checklist} />
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void join()}
                  disabled={!canJoin}
                  aria-describedby="join-hint"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Video className="h-4 w-4" aria-hidden="true" />}
                  {t('meeting.lobby.join')}
                </button>
                {/* why the button is disabled, announced as it changes */}
                <p id="join-hint" aria-live="polite" className="mt-2 text-center text-xs text-gray-600">
                  {joining && meeting.joinStage !== 'idle'
                    ? t(`meeting.joinStage.${meeting.joinStage}`)
                    : blockReason
                      ? t(`meeting.setup.blocked.${blockReason}`)
                      : t('meeting.setup.readyToJoin')}
                </p>
                <p className="mt-1 text-center text-xs text-gray-500">{t('meeting.lobby.privacyNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // --- ended ---
  if (phase === 'ended') {
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold text-gray-900">{t('meeting.ended.title')}</h1>
          <p className="mt-2 text-sm text-gray-600">{t('meeting.ended.text')}</p>
          {finalReference && (
            <p className="mt-3 font-mono text-sm text-gray-900">
              {t('meeting.ended.reference', { code: finalReference })}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {proposal && (
              <button
                type="button"
                onClick={downloadSummary}
                className="min-h-11 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400"
              >
                {t('meeting.proposal.download')}
              </button>
            )}
            <button
              type="button"
              onClick={() => accessToken && void doResolve(accessToken)}
              className="min-h-11 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t('meeting.ended.rejoin')}
            </button>
            <Link
              to="/"
              className="min-h-11 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400"
            >
              {t('common.backToHome')}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // --- live meeting ---
  const panelTabs: Array<{ id: PanelTab; label: string }> = [
    { id: 'chat', label: t('meeting.panel.chat') },
    { id: 'details', label: t('meeting.panel.details') },
    { id: 'files', label: t('meeting.panel.files') },
    { id: 'proposal', label: t('meeting.panel.proposal') },
  ];

  const panelBody = (
    <>
      <div role="tablist" aria-label={t('meeting.panel.label')} className="flex shrink-0 border-b border-gray-200">
        {panelTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`panel-tab-${tab.id}`}
            aria-selected={panelTab === tab.id}
            aria-controls={`panel-body-${tab.id}`}
            onClick={() => setPanelTab(tab.id)}
            className={`min-h-11 flex-1 px-2 py-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
              panelTab === tab.id ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-body-${panelTab}`}
        aria-labelledby={`panel-tab-${panelTab}`}
        className="min-h-0 flex-1 overflow-hidden bg-white"
      >
        {panelTab === 'chat' && (
          <MeetingChat
            messages={meeting.messages}
            disabled={!meeting.agentPresent}
            onSend={meeting.sendChat}
          />
        )}
        {panelTab === 'details' && (
          <ProjectDetailsPanel
            hasAnalysis={view?.hasAnalysis ?? false}
            analysisMode={view?.analysisMode ?? null}
            reference={meetingReference}
            progress={meeting.buddyState?.progress ?? null}
            language={meeting.buddyState?.language ?? view?.preferredLanguage ?? null}
          />
        )}
        {panelTab === 'files' && (
          <FilesLinksPanel submitted={links} saving={linkSaving} error={linkError} onSubmit={handleSubmitLinks} />
        )}
        {panelTab === 'proposal' && <ProposalPanel proposal={proposal} onDownload={downloadSummary} />}
      </div>
    </>
  );

  // Emphasis follows the REAL publication: a client whose microphone is not
  // being sent must never be drawn as the active speaker.
  const micLive = meeting.micState === 'unmuted';
  const clientActive = meeting.clientSpeaking && micLive;
  const buddyActive = meeting.activity === 'speaking' && meeting.connection !== 'reconnecting';

  const failureBanner = (agentTimedOut || error) && (
    <div className="shrink-0 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
      <p className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {error ?? t('meeting.errors.agent_unavailable')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAgentTimedOut(false);
            setLiveSince(null);
            setPhase('lobby');
          }}
          className="min-h-11 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25"
        >
          {t('meeting.fallback.retry')}
        </button>
        <button
          type="button"
          onClick={() => {
            setPanelOpen(true);
            setPanelTab('chat');
          }}
          className="min-h-11 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25"
        >
          {t('meeting.fallback.useChat')}
        </button>
        <button
          type="button"
          onClick={() => void handleRequestReview()}
          className="min-h-11 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25"
        >
          {t('meeting.fallback.humanReview')}
        </button>
        <Link
          to="/project-analysis"
          className="min-h-11 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25"
        >
          {t('meeting.fallback.manualFlow')}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] min-h-[30rem] flex-col overflow-hidden bg-navy-950 text-white">
      <MeetingHeader
        reference={meetingReference}
        connection={meeting.connection}
        startedAt={liveSince}
        finalizedLabel={
          finalized
            ? finalReference
              ? t('meeting.ended.reference', { code: finalReference })
              : t('meeting.ended.title')
            : null
        }
      />

      {/* screen-reader announcements for participant/connection changes */}
      <p aria-live="polite" className="sr-only">
        {t(`meeting.joinStage.${meeting.joinStage}`)}
        {meeting.connection === 'reconnecting' ? ` ${t('meeting.states.reconnecting')}` : ''}
      </p>

      {/* Staged join progress. "Connected" appears only once the room, the
          local participant, the microphone publication and Buddy are all real
          (deriveJoinStage) — never before. */}
      {meeting.joinStage !== 'connected' && meeting.joinStage !== 'no_microphone' && (
        <p className="shrink-0 px-3 pb-1 text-center text-xs text-white/70 sm:px-4">
          <Loader2 className="me-1.5 inline h-3 w-3 animate-spin" aria-hidden="true" />
          {t(`meeting.joinStage.${meeting.joinStage}`)}
        </p>
      )}

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {/* meeting stage: client left, Buddy right */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-3 pb-2 sm:px-4">
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <div className="m-auto flex h-full max-h-full w-full min-h-0 max-w-[1600px] flex-col gap-2 sm:gap-3 md:grid md:auto-rows-fr md:grid-cols-2 lg:aspect-[16/7] lg:h-auto lg:min-h-[15rem]">
              <ClientTile
                name={view?.name ?? ''}
                cameraStream={meeting.cameraStream}
                micMuted={!micLive}
                cameraEnabled={meeting.cameraEnabled}
                speaking={meeting.clientSpeaking}
                reduceMotion={reduceMotion}
                className={`min-h-[9rem] transition-[flex-grow] duration-300 ${clientActive ? 'flex-[1.35]' : 'flex-1'}`}
              />
              <BuddyTile
                activity={meeting.activity}
                agentPresent={meeting.agentPresent}
                reconnecting={meeting.connection === 'reconnecting'}
                quality={meeting.quality}
                audioLevel={meeting.audioLevel}
                speakerMuted={!meeting.speakerEnabled}
                reduceMotion={reduceMotion}
                className={`min-h-[12.5rem] transition-[flex-grow] duration-300 ${buddyActive ? 'flex-[1.35]' : 'flex-1'}`}
              />
            </div>
          </div>

          {/* audio recovery: the microphone is not actually being published */}
          {(micPublication === 'failed' || micPublication === 'lost') && (
            <AudioRecoveryBanner
              status={micPublication}
              retrying={meeting.retryingMic}
              microphones={meeting.microphones}
              onRetry={() => void meeting.retryMicrophone()}
              onSelectMicrophone={(deviceId) => void meeting.switchMicrophone(deviceId)}
              onRefreshMicrophones={() => void meeting.refreshMicrophones()}
              onOpenChat={() => {
                setPanelOpen(true);
                setPanelTab('chat');
              }}
            />
          )}

          {/* failure / fallback banners */}
          {failureBanner}
        </div>

        {/* right-side drawer (desktop): the stage resizes instead of being hidden */}
        <aside
          aria-hidden={!panelOpen}
          className={`hidden min-h-0 shrink-0 overflow-hidden pb-2 pe-4 transition-[width,opacity] duration-300 ease-out lg:block ${
            panelOpen ? 'w-[23rem] opacity-100 xl:w-[25rem]' : 'w-0 opacity-0'
          }`}
        >
          {panelOpen && isDesktop && (
            <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t('meeting.panel.label')}
                </p>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label={t('meeting.panel.close')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {panelBody}
            </div>
          )}
        </aside>
      </main>

      <MeetingControls
        micState={meeting.micState}
        cameraEnabled={meeting.cameraEnabled}
        speakerEnabled={meeting.speakerEnabled}
        panelOpen={panelOpen}
        canSubmit={Boolean(proposal) && !finalized}
        submitting={false}
        onToggleMic={meeting.toggleMic}
        onToggleCamera={meeting.toggleCamera}
        onToggleSpeaker={meeting.toggleSpeaker}
        onToggleChat={() => {
          setPanelOpen((o) => !o || panelTab !== 'chat');
          setPanelTab('chat');
        }}
        onToggleContext={() => {
          setPanelOpen(true);
          setPanelTab('details');
        }}
        onLeave={() => void leave()}
        onEndAndSubmit={() => {
          // Submission itself is finalized by Buddy after explicit
          // confirmation — this prompts the client to say so out loud
          // (or type it), it never submits on the client's behalf.
          setPanelOpen(true);
          setPanelTab('proposal');
          meeting.addSystemMessage(t('meeting.system.askToSubmit'));
          meeting.sendChat(t('meeting.system.submitPhrase'));
        }}
      />

      {/* tablet / mobile: full-height overlay with a clear close button */}
      {panelOpen && !isDesktop && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('meeting.panel.label')}
          className="fixed inset-0 z-50 flex flex-col bg-white text-gray-900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">{t('meeting.panel.label')}</p>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label={t('meeting.panel.close')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {panelBody}
        </div>
      )}
    </div>
  );
};

// --- small building blocks ---------------------------------------------------

/** True at the desktop breakpoint (>=1024px). Decides whether the side panel
 * renders as the right-side drawer or the full-height overlay, so the panel
 * exists exactly once in the DOM. */
const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches === true,
  );
  useEffect(() => {
    const mql = window.matchMedia?.('(min-width: 1024px)');
    if (!mql) return;
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 text-gray-900">
    <main className="container mx-auto px-4 py-10 sm:py-14">{children}</main>
  </div>
);

const Notice: React.FC<{
  icon: typeof AlertTriangle;
  tone: 'amber' | 'rose';
  title: string;
  children?: React.ReactNode;
}> = ({ icon: Icon, tone, title, children }) => (
  <div
    className={`mx-auto max-w-lg rounded-2xl border p-6 text-center ${
      tone === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-rose-300 bg-rose-50 text-rose-900'
    }`}
  >
    <Icon className="mx-auto h-10 w-10" aria-hidden="true" />
    <p className="mt-3 font-semibold">{title}</p>
    {children && <div className="mt-3 text-sm">{children}</div>}
  </div>
);

const Countdown: React.FC<{ targetIso: string; onReady: () => void }> = ({ targetIso, onReady }) => {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() => Date.parse(targetIso) - Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Date.parse(targetIso) - Date.now();
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(timer);
        onReady();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso, onReady]);

  if (remaining <= 0) return null;
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <p aria-live="polite" className="mt-4 font-mono text-lg text-gray-900">
      {days > 0 && `${days}${t('meeting.countdown.d')} `}
      {(days > 0 || hours > 0) && `${hours}${t('meeting.countdown.h')} `}
      {minutes}
      {t('meeting.countdown.m')} {String(seconds).padStart(2, '0')}
      {t('meeting.countdown.s')}
    </p>
  );
};

export default AiConsultation;

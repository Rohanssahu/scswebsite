import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ASSISTANT_OPEN_EVENT } from '@/components/ai-assistant/assistantBus';
import { getQuestions } from '@/data/analysisQuestions';
import { ESTIMATE_DISCLAIMER_KEY, GUIDE_WEEKLY_CAPACITY_HOURS, resolveGuideEstimate } from '@/data/guideEstimate';
import { getRouteQuickActions, GUIDE_WELCOME_KEY, WELCOME_ACTIONS, WHATSAPP_NUMBER } from '@/data/guideContent';
import { emitBuddyReaction, looksLikeJoke } from '@/data/buddyReactions';
import { clarifyReply, routeMessage } from '@/data/guideIntents';
import { TOUR_STEPS } from '@/data/guideTour';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import i18n, { setAppLanguage } from '@/i18n/config';
import { formatUsd, getLocaleConfig, isSupportedLanguage, LanguageCode, SpeechSpeed, valueKey } from '@/i18n/languageConfig';
import { loadDraft, saveDraft, saveResult } from '@/lib/analysisStore';
import { AnswerValue, ProjectMode } from '@/types/projectAnalysis';
import {
  AvatarState,
  GuideAction,
  GuideChatMessage,
  GuideEstimate,
  RequirementFlowState,
  TourState,
} from '@/types/virtualGuide';

// Central conversation / tour / requirement-flow state for Buddy — Your SCS
// Guide. Deterministic frontend logic only — swap `routeMessage` and
// `buildGuideEstimate` for a real AI service later without touching the UI.
//
// Language-aware: guide messages are stored as i18n keys, so the whole
// conversation re-renders when the visitor changes language, and speech uses
// the selected language's voice and rate. The language itself is detected
// automatically from the visitor's country/browser settings (English is the
// fallback, including India); "Change language" lives in Buddy's settings and
// the navbar switcher. Storage keys are versioned (v2) so older saved
// assistant data can never break this flow.

const CONVERSATION_KEY = 'scs-buddy-conversation-v2';
const PREFS_KEY = 'scs-buddy-prefs-v2';
const INVITE_KEY = 'scs-buddy-invite-dismissed-v2';
const ESTIMATE_KEY = 'scs-buddy-estimate-v2';
const TOUR_PROGRESS_KEY = 'scs-buddy-tour-v2';
const CONTACT_PREFILL_KEY = 'scs-guide-contact-prefill';
const SKIPPED = '(skipped)';

interface QueueItem {
  key: string;
  params?: Record<string, unknown>;
  actions?: GuideAction[];
}

/**
 * Queue an already-final sentence (the estimation policy's own client-facing
 * wording) instead of an i18n key. `defaultValue` makes i18next return the
 * sentence verbatim, so the commercial text Buddy says is byte-identical to the
 * text the report renders — no separate translation can drift from it.
 */
const asPlainText = (text: string): QueueItem => ({ key: text, params: { defaultValue: text } });

interface GuidePrefs {
  voiceEnabled: boolean;
  speechSpeed: SpeechSpeed;
}

/** Caption stored as key+params so it re-renders in the current language. */
export interface CaptionState {
  key: string;
  params?: Record<string, unknown>;
}

/** Which auxiliary view fills the panel body. */
export type GuideSettingsMode = 'settings' | 'voice' | null;

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `${Date.now()}-${messageCounter}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function welcomeMessage(): GuideChatMessage {
  return {
    id: nextId(),
    from: 'guide',
    text: i18n.t(GUIDE_WELCOME_KEY),
    tKey: GUIDE_WELCOME_KEY,
    actions: WELCOME_ACTIONS,
  };
}

function initialMessages(): GuideChatMessage[] {
  const stored = safeParse<GuideChatMessage[]>(sessionStorage.getItem(CONVERSATION_KEY));
  if (stored && Array.isArray(stored) && stored.length && stored.every((m) => m && typeof m.text === 'string')) {
    return stored;
  }
  return [welcomeMessage()];
}

function loadPrefs(): GuidePrefs {
  const stored = safeParse<Partial<GuidePrefs>>(localStorage.getItem(PREFS_KEY));
  return {
    voiceEnabled: stored?.voiceEnabled === true,
    speechSpeed: stored?.speechSpeed === 'slow' || stored?.speechSpeed === 'fast' ? stored.speechSpeed : 'normal',
  };
}

/** Translate an enumerable canonical value for display; falls back to itself. */
function tValue(category: string, value: string): string {
  return i18n.t(`${category}.${valueKey(value)}`, { defaultValue: value });
}

function displayAnswer(value: AnswerValue): string {
  if (Array.isArray(value)) return value.map((v) => tValue('options', v)).join(', ');
  return value === SKIPPED ? i18n.t('options.skipped') : tValue('options', value);
}

export function useVirtualGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion() ?? false;
  const tts = useSpeechSynthesis();

  const [settingsMode, setSettingsMode] = useState<GuideSettingsMode>(null);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<GuideChatMessage[]>(initialMessages);
  const [typing, setTyping] = useState(false);
  const [caption, setCaption] = useState<CaptionState | null>(null);
  const [paused, setPaused] = useState(false);
  const [prefs, setPrefs] = useState<GuidePrefs>(loadPrefs);
  const [muted, setMuted] = useState(false);
  const [flow, setFlow] = useState<RequirementFlowState | null>(null);
  const [tour, setTour] = useState<TourState>({ active: false, index: 0, paused: false });
  const [estimate, setEstimate] = useState<GuideEstimate | null>(() => {
    const stored = safeParse<GuideEstimate>(localStorage.getItem(ESTIMATE_KEY));
    // Versioned shape check — invalid/legacy data resets safely to defaults.
    return stored && Array.isArray(stored.summaryItems) ? stored : null;
  });
  const [resultsOpen, setResultsOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(() => localStorage.getItem(INVITE_KEY) !== '1');
  const [langTick, setLangTick] = useState(0);

  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const pausedRef = useRef(false);
  const voiceRef = useRef({ enabled: prefs.voiceEnabled, muted, speed: prefs.speechSpeed });
  voiceRef.current = { enabled: prefs.voiceEnabled, muted, speed: prefs.speechSpeed };
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const estimateRef = useRef(estimate);
  estimateRef.current = estimate;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const speechRate = useCallback(() => getLocaleConfig(i18n.language).speechRates[voiceRef.current.speed], []);

  // ---------- persistence ----------
  useEffect(() => {
    sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages.slice(-60)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    if (estimate) localStorage.setItem(ESTIMATE_KEY, JSON.stringify(estimate));
  }, [estimate]);

  useEffect(() => {
    if (tour.active) sessionStorage.setItem(TOUR_PROGRESS_KEY, JSON.stringify({ index: tour.index }));
  }, [tour.active, tour.index]);

  // ---------- timers ----------
  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // ---------- message queue (typing + optional speech, one message at a time) ----------
  const processQueue = useCallback(() => {
    if (processingRef.current || pausedRef.current) return;
    const item = queueRef.current.shift();
    if (!item) return;
    processingRef.current = true;
    setTyping(true);
    addTimer(
      () => {
        // Paused while "typing": put the message back and wait for resume.
        if (pausedRef.current) {
          queueRef.current.unshift(item);
          processingRef.current = false;
          setTyping(false);
          return;
        }
        setTyping(false);
        const text = i18n.t(item.key, item.params);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), from: 'guide', text, tKey: item.key, tParams: item.params, actions: item.actions },
        ]);
        setCaption({ key: item.key, params: item.params });
        const finish = () => {
          processingRef.current = false;
          processQueue();
        };
        const { enabled, muted: isMuted } = voiceRef.current;
        if (enabled && !isMuted && tts.supported) {
          tts.speak(text, { lang: i18n.language, rate: speechRate(), onEnd: finish });
        } else {
          addTimer(finish, reduceMotion ? 100 : 500);
        }
      },
      reduceMotion ? 100 : 650,
    );
  }, [addTimer, reduceMotion, speechRate, tts]);

  const enqueueGuide = useCallback(
    (items: QueueItem[]) => {
      queueRef.current.push(...items);
      processQueue();
    },
    [processQueue],
  );

  const stopSpeaking = useCallback(() => {
    tts.cancel();
  }, [tts]);

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), from: 'user', text }]);
  }, []);

  // ---------- pause / resume ----------
  const pause = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
    stopSpeaking();
    if (tourRef.current.active) setTour((t) => ({ ...t, paused: true }));
  }, [stopSpeaking]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    if (tourRef.current.active) setTour((t) => ({ ...t, paused: false }));
    processingRef.current = false;
    processQueue();
  }, [processQueue]);

  // ---------- panel open/close ----------
  const openPanel = useCallback(() => {
    setOpen(true);
    setMinimized(false);
    setInviteVisible(false);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    setExpanded(false);
    // Clear the queue before cancelling speech: cancel settles the current
    // utterance's onEnd, which would otherwise pull the next queued message.
    queueRef.current = [];
    stopSpeaking();
    processingRef.current = false;
    setTyping(false);
    setTour({ active: false, index: 0, paused: false });
  }, [stopSpeaking]);

  const minimize = useCallback(() => {
    setMinimized(true);
    stopSpeaking();
  }, [stopSpeaking]);

  // Full-screen chat: the panel fills the viewport so long conversations,
  // the estimate flow and captions are comfortable to read.
  const toggleExpand = useCallback(() => setExpanded((e) => !e), []);

  const dismissInvite = useCallback(() => {
    setInviteVisible(false);
    localStorage.setItem(INVITE_KEY, '1');
  }, []);

  // ---------- requirement flow ----------
  const askCurrentQuestion = useCallback(
    (mode: ProjectMode, index: number) => {
      const questions = getQuestions(mode);
      const q = questions[index];
      if (q) enqueueGuide([{ key: `questions.${mode}.${q.id}.prompt` }]);
    },
    [enqueueGuide],
  );

  const enterReview = useCallback(
    (mode: ProjectMode) => {
      setFlow((f) => (f ? { ...f, status: 'review', index: getQuestions(mode).length } : f));
      emitBuddyReaction('step-complete');
      enqueueGuide([
        {
          key: 'guide.msg.review',
          actions: [{ label: 'Run project analysis', kind: 'run-analysis' }],
        },
      ]);
    },
    [enqueueGuide],
  );

  const startFlow = useCallback(
    (mode: ProjectMode) => {
      dismissInvite();
      setOpen(true);
      setMinimized(false);
      setTour({ active: false, index: 0, paused: false });
      const draft = loadDraft();
      const questions = getQuestions(mode);
      const answers = draft.mode === mode ? draft.answers : {};
      const firstUnanswered = questions.findIndex((q) => answers[q.id] === undefined);
      const index = firstUnanswered === -1 ? questions.length : firstUnanswered;
      setFlow({ mode, answers, index, status: index >= questions.length ? 'review' : 'active' });
      saveDraft({ ...draft, mode, method: 'ai', answers });
      const introKey = mode === 'new' ? 'guide.msg.introNew' : 'guide.msg.introExisting';
      if (index >= questions.length) {
        enqueueGuide([{ key: introKey }, { key: 'guide.msg.haveSavedSuffix' }]);
        enterReview(mode);
      } else if (index > 0) {
        enqueueGuide([{ key: introKey }, { key: 'guide.msg.resumedSuffix' }]);
        askCurrentQuestion(mode, index);
      } else {
        enqueueGuide([{ key: introKey }]);
        askCurrentQuestion(mode, index);
      }
    },
    [askCurrentQuestion, dismissInvite, enqueueGuide, enterReview],
  );

  const answerQuestion = useCallback(
    (value: AnswerValue) => {
      const f = flowRef.current;
      if (!f || f.status !== 'active') return;
      const questions = getQuestions(f.mode);
      const q = questions[f.index];
      if (!q) return;
      pushUser(displayAnswer(value));
      emitBuddyReaction('answered');
      const answers = { ...f.answers, [q.id]: value };
      const nextIndex = f.index + 1;
      const draft = loadDraft();
      saveDraft({ ...draft, mode: f.mode, method: 'ai', answers });
      if (nextIndex >= questions.length) {
        setFlow({ ...f, answers, index: nextIndex, status: 'review' });
        enterReview(f.mode);
      } else {
        setFlow({ ...f, answers, index: nextIndex });
        askCurrentQuestion(f.mode, nextIndex);
      }
    },
    [askCurrentQuestion, enterReview, pushUser],
  );

  const flowBack = useCallback(() => {
    const f = flowRef.current;
    if (!f || f.index === 0) return;
    const questions = getQuestions(f.mode);
    const prevIndex = Math.min(f.index, questions.length) - 1;
    const prev = questions[prevIndex];
    const answers = { ...f.answers };
    delete answers[prev.id];
    const draft = loadDraft();
    saveDraft({ ...draft, mode: f.mode, method: 'ai', answers });
    setFlow({ ...f, answers, index: prevIndex, status: 'active' });
    enqueueGuide([
      { key: 'guide.msg.editThat', params: { prompt: i18n.t(`questions.${f.mode}.${prev.id}.prompt`) } },
    ]);
  }, [enqueueGuide]);

  const flowSkip = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    const q = getQuestions(f.mode)[f.index];
    if (q?.optional) answerQuestion(SKIPPED);
  }, [answerQuestion]);

  const flowRestart = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    const draft = loadDraft();
    saveDraft({ ...draft, mode: f.mode, method: 'ai', answers: {} });
    setFlow({ mode: f.mode, answers: {}, index: 0, status: 'active' });
    enqueueGuide([{ key: 'guide.msg.freshStart' }]);
    askCurrentQuestion(f.mode, 0);
  }, [askCurrentQuestion, enqueueGuide]);

  const flowSwitch = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    const mode: ProjectMode = f.mode === 'new' ? 'existing' : 'new';
    enqueueGuide([{ key: mode === 'new' ? 'guide.msg.switchingNew' : 'guide.msg.switchingExisting' }]);
    const questions = getQuestions(mode);
    const firstUnanswered = questions.findIndex((q) => f.answers[q.id] === undefined);
    const index = firstUnanswered === -1 ? questions.length : firstUnanswered;
    const draft = loadDraft();
    saveDraft({ ...draft, mode, method: 'ai', answers: f.answers });
    if (index >= questions.length) {
      setFlow({ mode, answers: f.answers, index, status: 'review' });
      enterReview(mode);
    } else {
      setFlow({ mode, answers: f.answers, index, status: 'active' });
      askCurrentQuestion(mode, index);
    }
  }, [askCurrentQuestion, enqueueGuide, enterReview]);

  const flowCancel = useCallback(() => {
    setFlow(null);
    enqueueGuide([{ key: 'guide.msg.cancelFlow', actions: WELCOME_ACTIONS }]);
  }, [enqueueGuide]);

  // ---------- analysis + estimate explanation ----------
  //
  // The estimate comes from the server (Gemini classifies the scope, the shared
  // policy computes every number). Nothing here does pricing arithmetic, and a
  // provider failure is announced rather than hidden behind a local result.
  const runAnalysis = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    pushUser(i18n.t('guide.msg.runAnalysis'));
    setFlow({ ...f, status: 'analyzing' });
  }, [pushUser]);

  /** Bumped whenever a new estimate is produced, so each one is a new version. */
  const estimateRevisionRef = useRef(0);

  const completeAnalysis = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    estimateRevisionRef.current += 1;
    void resolveGuideEstimate(f.mode, f.answers, estimateRevisionRef.current).then(
      ({ estimate: result, unavailableNotice }) => {
        // The flow may have been cancelled or restarted while the request ran.
        if (flowRef.current !== f) return;
        setEstimate(result);
        saveResult(result);
        setFlow({ ...f, status: 'done' });
        setCelebrating(true);
        emitBuddyReaction('requirement-complete');
        addTimer(() => setCelebrating(false), 4000);
        const roles = result.team
          .map((r) =>
            i18n.t('guide.msg.teamRole', {
              role: tValue('roles', r.role),
              hours: r.hours,
              rate: r.hourlyRate,
            }),
          )
          .join('; ');
        enqueueGuide([
          ...(unavailableNotice ? [asPlainText(unavailableNotice)] : []),
          {
            key: 'guide.msg.estimateReady',
            params: {
              service: tValue('services.names', result.recommendedService),
              tech: result.suggestedTech.join(', '),
            },
          },
          // The budget wording comes straight from the policy, so what Buddy
          // says here is character-for-character what the report renders.
          ...result.budgetLines.map(asPlainText),
          { key: 'guide.msg.teamRequirement', params: { roles, hours: result.totalHours, cost: result.totalCost } },
          { key: 'guide.msg.duration', params: { capacity: result.weeklyCapacityHours, weeks: result.estimatedWeeks } },
          {
            key: 'guide.msg.whyWorks',
            params: {
              pro: i18n.t(result.pros[0]),
              con: i18n.t(result.cons[0]),
              risk: i18n.t(result.risks[0]),
            },
          },
          {
            key: 'guide.msg.disclaimerNext',
            params: {
              disclaimer: i18n.t(ESTIMATE_DISCLAIMER_KEY),
              next: i18n.t(result.recommendedNextStep.key, result.recommendedNextStep.params),
            },
            actions: [
              { label: 'View detailed breakdown', kind: 'open-results' },
              { label: 'Edit requirements', kind: 'flow-edit' },
              { label: 'Continue to Contact', kind: 'contact-handoff' },
              { label: 'Open WhatsApp', kind: 'whatsapp' },
              { label: 'Schedule a Call', kind: 'schedule-handoff' },
              { label: 'Request Human Review', kind: 'contact-handoff' },
            ],
          },
        ]);
      },
    );
  }, [addTimer, enqueueGuide]);

  // ---------- lead conversion ----------
  const buildSummaryText = useCallback(() => {
    const e = estimateRef.current;
    if (e) {
      const summary = e.summaryItems.map((it) => i18n.t(it.key, it.params)).join('. ');
      return i18n.t('guide.msg.whatsappSummary', {
        summary,
        hours: e.totalHours,
        cost: formatUsd(e.totalCost, i18n.language),
        weeks: e.estimatedWeeks,
      });
    }
    return i18n.t('guide.msg.whatsappNoEstimate');
  }, []);

  const openWhatsApp = useCallback(() => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildSummaryText())}`, '_blank', 'noopener,noreferrer');
  }, [buildSummaryText]);

  const contactHandoff = useCallback(() => {
    const e = estimateRef.current;
    // The contact form's service <select> uses slug values.
    const serviceSlug = !e
      ? ''
      : e.recommendedService.includes('Mobile') && !e.recommendedService.includes('Web')
        ? 'mobile-development'
        : 'web-development';
    localStorage.setItem(CONTACT_PREFILL_KEY, JSON.stringify({ service: serviceSlug, message: buildSummaryText() }));
    navigate('/contact');
  }, [buildSummaryText, navigate]);

  // ---------- tour ----------
  const startTour = useCallback(() => {
    dismissInvite();
    setOpen(true);
    setMinimized(true); // compact avatar bubble; the tour card carries captions
    setExpanded(false); // the spotlight needs the page visible
    setResultsOpen(false);
    stopSpeaking();
    // Resume saved tour progress from this session, if any.
    const saved = safeParse<{ index: number }>(sessionStorage.getItem(TOUR_PROGRESS_KEY));
    const index = saved && Number.isInteger(saved.index) && saved.index > 0 && saved.index < TOUR_STEPS.length ? saved.index : 0;
    setTour({ active: true, index, paused: false });
  }, [dismissInvite, stopSpeaking]);

  const endTour = useCallback(
    (completed: boolean) => {
      stopSpeaking();
      setTour({ active: false, index: 0, paused: false });
      sessionStorage.removeItem(TOUR_PROGRESS_KEY);
      setOpen(true);
      setMinimized(false);
      enqueueGuide([
        completed
          ? {
              key: 'guide.msg.tourDoneComplete',
              actions: [
                { label: 'I have a new project', kind: 'flow-new' },
                { label: 'Fix an existing project', kind: 'flow-existing' },
                { label: 'Schedule a call', kind: 'schedule-handoff' },
              ],
            }
          : { key: 'guide.msg.tourDoneEarly', actions: WELCOME_ACTIONS },
      ]);
    },
    [enqueueGuide, stopSpeaking],
  );

  const tourNext = useCallback(() => {
    stopSpeaking();
    const t = tourRef.current;
    if (t.index >= TOUR_STEPS.length - 1) {
      endTour(true);
    } else {
      setTour({ ...t, index: t.index + 1, paused: false });
    }
  }, [endTour, stopSpeaking]);

  const tourBack = useCallback(() => {
    stopSpeaking();
    const t = tourRef.current;
    if (t.index > 0) setTour({ ...t, index: t.index - 1, paused: false });
  }, [stopSpeaking]);

  const tourSkip = useCallback(() => endTour(false), [endTour]);

  const tourAsk = useCallback(() => {
    stopSpeaking();
    setTour((t) => ({ ...t, paused: true }));
    setMinimized(false);
    setOpen(true);
    enqueueGuide([{ key: 'guide.msg.tourPausedAsk' }]);
  }, [enqueueGuide, stopSpeaking]);

  const tourResume = useCallback(() => {
    setTour((t) => ({ ...t, paused: false }));
    setMinimized(true);
  }, []);

  /** Called by the overlay when a step's target never appears — skip it gracefully. */
  const tourTargetMissing = useCallback(() => {
    const t = tourRef.current;
    if (!t.active) return;
    if (t.index >= TOUR_STEPS.length - 1) endTour(true);
    else setTour({ ...t, index: t.index + 1 });
  }, [endTour]);

  const currentTourStep = tour.active ? TOUR_STEPS[tour.index] : null;

  // Navigate to the step's route and speak its text. Re-runs on language
  // change (langTick) so captions and speech restart in the new language.
  useEffect(() => {
    if (!tour.active || tour.paused) return;
    const step = TOUR_STEPS[tour.index];
    if (!step) return;
    if (pathRef.current !== step.route) navigate(step.route);
    setCaption({ key: step.textKey });
    if (voiceRef.current.enabled && !voiceRef.current.muted && tts.supported) {
      tts.speak(i18n.t(step.textKey), { lang: i18n.language, rate: speechRate() });
    }
    return () => tts.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.active, tour.index, tour.paused, langTick]);

  // ---------- language ----------
  const chooseLanguage = useCallback(
    (code: LanguageCode, remember: boolean) => {
      if (!isSupportedLanguage(code)) return;
      stopSpeaking(); // stop current speech immediately; captions re-render via keys
      setAppLanguage(code, remember);
      setLangTick((n) => n + 1);
    },
    [stopSpeaking],
  );

  const openSettings = useCallback(() => {
    stopSpeaking();
    setSettingsMode('settings');
    setOpen(true);
    setMinimized(false);
  }, [stopSpeaking]);

  const closeSettings = useCallback(() => {
    setSettingsMode((m) => (m === 'settings' ? null : m));
  }, []);

  // ---------- voice mode (real-time Buddy voice session) ----------
  const [voiceAvatar, setVoiceAvatarState] = useState<AvatarState | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);

  const openVoice = useCallback(() => {
    stopSpeaking();
    setSettingsMode('voice');
    setOpen(true);
    setMinimized(false);
  }, [stopSpeaking]);

  const closeVoice = useCallback(() => {
    setSettingsMode((m) => (m === 'voice' ? null : m));
    setVoiceAvatarState(null);
    setVoiceLevel(0);
  }, []);

  /** Called by VoicePanel to mirror the live session onto the avatar. */
  const setVoiceAvatar = useCallback((state: AvatarState | null, level: number) => {
    setVoiceAvatarState(state);
    setVoiceLevel(level);
  }, []);

  const setSpeechSpeed = useCallback((speed: SpeechSpeed) => {
    setPrefs((p) => ({ ...p, speechSpeed: speed }));
  }, []);

  // Stop speech whenever the app language changes from anywhere (e.g. navbar).
  useEffect(() => {
    const onChange = () => {
      stopSpeaking();
      setLangTick((n) => n + 1);
    };
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, [stopSpeaking]);

  // ---------- messaging ----------
  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const f = flowRef.current;
      // While the flow is collecting answers, typed text answers the current question.
      if (f && f.status === 'active') {
        answerQuestion(text);
        return;
      }
      pushUser(text);
      const matched = routeMessage(text, pathRef.current);
      if (!matched) emitBuddyReaction('unknown');
      else if (looksLikeJoke(text)) emitBuddyReaction('joke');
      const reply = matched ?? clarifyReply(pathRef.current);
      enqueueGuide([{ key: reply.key, params: reply.params, actions: reply.actions }]);
    },
    [answerQuestion, enqueueGuide, pushUser],
  );

  /** Canned quick-reply: show the translated label as the user's bubble, match on the canonical message. */
  const sendCanned = useCallback(
    (action: GuideAction) => {
      if (!action.message) return;
      const f = flowRef.current;
      if (f && f.status === 'active') {
        answerQuestion(action.message);
        return;
      }
      pushUser(tValue('actions', action.label));
      const matched = routeMessage(action.message, pathRef.current);
      if (!matched) emitBuddyReaction('unknown');
      else if (looksLikeJoke(action.message)) emitBuddyReaction('joke');
      const reply = matched ?? clarifyReply(pathRef.current);
      enqueueGuide([{ key: reply.key, params: reply.params, actions: reply.actions }]);
    },
    [answerQuestion, enqueueGuide, pushUser],
  );

  // ---------- actions ----------
  const runAction = useCallback(
    (action: GuideAction) => {
      switch (action.kind) {
        case 'navigate': {
          if (!action.to) return;
          if (action.to.includes('services') || action.to.includes('product')) emitBuddyReaction('service-selected');
          const [path, hash] = action.to.split('#');
          navigate(path || '/');
          if (hash) {
            addTimer(() => document.getElementById(hash)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 200);
          }
          break;
        }
        case 'start-tour':
          startTour();
          break;
        case 'flow-new':
          startFlow('new');
          break;
        case 'flow-existing':
          startFlow('existing');
          break;
        case 'send':
          sendCanned(action);
          break;
        case 'whatsapp':
          openWhatsApp();
          break;
        case 'open-results':
          setResultsOpen(true);
          break;
        case 'contact-handoff':
          contactHandoff();
          break;
        case 'schedule-handoff':
          navigate('/schedule-call');
          break;
        case 'run-analysis':
          runAnalysis();
          break;
        case 'flow-edit': {
          const e = estimateRef.current;
          const mode: ProjectMode = e?.mode ?? 'new';
          startFlow(mode);
          break;
        }
        case 'open-voice':
          openVoice();
          break;
      }
    },
    [addTimer, contactHandoff, navigate, openVoice, openWhatsApp, reduceMotion, runAnalysis, sendCanned, startFlow, startTour],
  );

  const restartConversation = useCallback(() => {
    queueRef.current = [];
    stopSpeaking();
    processingRef.current = false;
    clearTimers();
    setTyping(false);
    setFlow(null);
    setTour({ active: false, index: 0, paused: false });
    setCaption(null);
    sessionStorage.removeItem(CONVERSATION_KEY);
    setMessages([welcomeMessage()]);
  }, [clearTimers, stopSpeaking]);

  // ---------- voice controls ----------
  const toggleVoice = useCallback(() => {
    setPrefs((p) => {
      if (p.voiceEnabled) tts.cancel();
      return { ...p, voiceEnabled: !p.voiceEnabled };
    });
  }, [tts]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) tts.cancel();
      return !m;
    });
  }, [tts]);

  const recognition = useSpeechRecognition(sendMessage);

  // ---------- external open events (e.g. result-page "explain estimate") ----------
  useEffect(() => {
    const handler = (e: Event) => {
      setOpen(true);
      setMinimized(false);
      setInviteVisible(false);
      const topic = (e as CustomEvent<{ topic?: string }>).detail?.topic;
      if (topic === 'estimate') {
        const stored = estimateRef.current;
        queueRef.current.push(
          stored
            ? {
                key: 'guide.msg.estimateShort',
                params: {
                  hours: stored.totalHours,
                  cost: stored.totalCost,
                  weeks: stored.estimatedWeeks,
                  capacity: stored.weeklyCapacityHours ?? GUIDE_WEEKLY_CAPACITY_HOURS,
                  disclaimer: i18n.t(ESTIMATE_DISCLAIMER_KEY),
                },
                actions: [
                  { label: 'View detailed breakdown', kind: 'open-results' },
                  { label: 'Schedule a review call', kind: 'schedule-handoff' },
                ],
              }
            : {
                key: 'guide.msg.noEstimateYet',
                actions: [
                  { label: 'Start requirement flow', kind: 'flow-new' },
                  { label: 'Fix an existing project', kind: 'flow-existing' },
                ],
              },
        );
        processQueue();
      }
    };
    window.addEventListener(ASSISTANT_OPEN_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, handler);
  }, [processQueue]);

  // Welcome wave whenever the panel is (re)opened. No audio plays automatically.
  const [waving, setWaving] = useState(false);
  useEffect(() => {
    if (open && !minimized) {
      setWaving(true);
      const id = window.setTimeout(() => setWaving(false), 2600);
      return () => window.clearTimeout(id);
    }
  }, [open, minimized]);

  // ---------- derived ----------
  const avatarState: AvatarState = useMemo(() => {
    if (settingsMode === 'voice' && voiceAvatar) return voiceAvatar;
    if (recognition.listening) return 'listening';
    if (tts.speaking) return 'speaking';
    if (typing || flow?.status === 'analyzing') return 'thinking';
    if (tour.active && !tour.paused) return 'pointing';
    if (celebrating) return 'success';
    if (waving) return 'welcome';
    if (minimized) return 'minimized';
    return 'idle';
  }, [settingsMode, voiceAvatar, recognition.listening, tts.speaking, typing, flow?.status, tour.active, tour.paused, celebrating, waving, minimized]);

  const quickActions = useMemo(() => getRouteQuickActions(location.pathname), [location.pathname]);

  const currentQuestion = useMemo(() => {
    if (!flow || flow.status !== 'active') return null;
    return getQuestions(flow.mode)[flow.index] ?? null;
  }, [flow]);

  const showInvite = inviteVisible && !open && location.pathname === '/';

  const voiceAvailableForLanguage = tts.voiceAvailable(i18n.language);

  return {
    // panel
    open,
    minimized,
    expanded,
    openPanel,
    closePanel,
    minimize,
    toggleExpand,
    restore: openPanel,
    // conversation
    messages,
    typing,
    caption,
    sendMessage,
    runAction,
    quickActions,
    restartConversation,
    // avatar / motion
    avatarState,
    reduceMotion,
    // pause
    paused,
    pause,
    resume,
    // voice
    voiceEnabled: prefs.voiceEnabled,
    toggleVoice,
    muted,
    toggleMute,
    ttsSupported: tts.supported,
    speaking: tts.speaking,
    voiceAvailableForLanguage,
    speechSpeed: prefs.speechSpeed,
    setSpeechSpeed,
    recognition,
    // language
    settingsMode,
    chooseLanguage,
    openSettings,
    closeSettings,
    // voice mode
    openVoice,
    closeVoice,
    setVoiceAvatar,
    voiceLevel,
    // flow
    flow,
    currentQuestion,
    answerQuestion,
    flowBack,
    flowSkip,
    flowRestart,
    flowSwitch,
    flowCancel,
    completeAnalysis,
    // estimate
    estimate,
    resultsOpen,
    setResultsOpen,
    // tour
    tour,
    currentTourStep,
    startTour,
    tourNext,
    tourBack,
    tourSkip,
    tourAsk,
    tourResume,
    tourTargetMissing,
    // invite
    showInvite,
    dismissInvite,
  };
}

export type VirtualGuideApi = ReturnType<typeof useVirtualGuide>;

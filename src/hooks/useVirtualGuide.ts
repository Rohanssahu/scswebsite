import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ASSISTANT_OPEN_EVENT } from '@/components/ai-assistant/assistantBus';
import { getQuestions } from '@/data/analysisQuestions';
import { buildGuideEstimate, ESTIMATE_DISCLAIMER } from '@/data/demoEstimate';
import { getRouteQuickActions, GUIDE_WELCOME, WELCOME_ACTIONS, WHATSAPP_NUMBER } from '@/data/guideContent';
import { clarifyReply, routeMessage } from '@/data/guideIntents';
import { TOUR_STEPS } from '@/data/guideTour';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
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

// Central conversation / tour / requirement-flow state for the Virtual Guide.
// Deterministic frontend logic only — swap `routeMessage` and
// `buildGuideEstimate` for a real AI service later without touching the UI.

const CONVERSATION_KEY = 'scs-guide-conversation';
const PREFS_KEY = 'scs-guide-prefs';
const INVITE_KEY = 'scs-guide-invite-dismissed';
const ESTIMATE_KEY = 'scs-guide-estimate';
const CONTACT_PREFILL_KEY = 'scs-guide-contact-prefill';
const SKIPPED = '(skipped)';

interface QueueItem {
  text: string;
  actions?: GuideAction[];
}

interface GuidePrefs {
  voiceEnabled: boolean;
}

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

function initialMessages(): GuideChatMessage[] {
  const stored = safeParse<GuideChatMessage[]>(sessionStorage.getItem(CONVERSATION_KEY));
  if (stored && stored.length) return stored;
  return [{ id: nextId(), from: 'guide', text: GUIDE_WELCOME, actions: WELCOME_ACTIONS }];
}

function loadPrefs(): GuidePrefs {
  return safeParse<GuidePrefs>(localStorage.getItem(PREFS_KEY)) ?? { voiceEnabled: false };
}

function displayAnswer(value: AnswerValue): string {
  const text = Array.isArray(value) ? value.join(', ') : value;
  return text === SKIPPED ? 'Skipped' : text;
}

export function useVirtualGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion() ?? false;
  const tts = useSpeechSynthesis();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<GuideChatMessage[]>(initialMessages);
  const [typing, setTyping] = useState(false);
  const [caption, setCaption] = useState('');
  const [paused, setPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => loadPrefs().voiceEnabled);
  const [muted, setMuted] = useState(false);
  const [flow, setFlow] = useState<RequirementFlowState | null>(null);
  const [tour, setTour] = useState<TourState>({ active: false, index: 0, paused: false });
  const [estimate, setEstimate] = useState<GuideEstimate | null>(() => safeParse<GuideEstimate>(localStorage.getItem(ESTIMATE_KEY)));
  const [resultsOpen, setResultsOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(() => localStorage.getItem(INVITE_KEY) !== '1');

  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const pausedRef = useRef(false);
  const voiceRef = useRef({ enabled: voiceEnabled, muted });
  voiceRef.current = { enabled: voiceEnabled, muted };
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const estimateRef = useRef(estimate);
  estimateRef.current = estimate;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // ---------- persistence ----------
  useEffect(() => {
    sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages.slice(-60)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ voiceEnabled }));
  }, [voiceEnabled]);

  useEffect(() => {
    if (estimate) localStorage.setItem(ESTIMATE_KEY, JSON.stringify(estimate));
  }, [estimate]);

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
        setMessages((prev) => [...prev, { id: nextId(), from: 'guide', text: item.text, actions: item.actions }]);
        setCaption(item.text);
        const finish = () => {
          processingRef.current = false;
          processQueue();
        };
        const { enabled, muted: isMuted } = voiceRef.current;
        if (enabled && !isMuted && tts.supported) {
          tts.speak(item.text, { onEnd: finish });
        } else {
          addTimer(finish, reduceMotion ? 100 : 500);
        }
      },
      reduceMotion ? 100 : 650,
    );
  }, [addTimer, reduceMotion, tts]);

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

  const dismissInvite = useCallback(() => {
    setInviteVisible(false);
    localStorage.setItem(INVITE_KEY, '1');
  }, []);

  // ---------- requirement flow ----------
  const askCurrentQuestion = useCallback(
    (mode: ProjectMode, index: number) => {
      const questions = getQuestions(mode);
      const q = questions[index];
      if (q) enqueueGuide([{ text: q.chatPrompt + (q.optional ? ' (Optional — you can skip.)' : '') }]);
    },
    [enqueueGuide],
  );

  const enterReview = useCallback(
    (mode: ProjectMode) => {
      setFlow((f) => (f ? { ...f, status: 'review', index: getQuestions(mode).length } : f));
      enqueueGuide([
        {
          text: "That's everything I need! Review your answers above (use Back to change any), then I'll run a quick demo analysis to prepare your preliminary estimate.",
          actions: [{ label: 'Run demo analysis', kind: 'run-analysis' }],
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
      const intro =
        mode === 'new'
          ? "Let's plan your new project! I'll ask a few short questions — answer with the quick options or type freely. You can go back, skip optional ones, or switch flows anytime."
          : "Let's rescue your existing project. A few quick questions about what you have, what works and what's broken — then I'll estimate the fix.";
      const resumed = index > 0 && index < questions.length ? ' I restored your saved answers, continuing where you left off.' : '';
      if (index >= questions.length) {
        enqueueGuide([{ text: intro + ' I already have your saved answers.' }]);
        enterReview(mode);
      } else {
        enqueueGuide([{ text: intro + resumed }]);
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
    enqueueGuide([{ text: `Let's edit that. ${prev.chatPrompt}` }]);
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
    enqueueGuide([{ text: 'Fresh start! All answers cleared.' }]);
    askCurrentQuestion(f.mode, 0);
  }, [askCurrentQuestion, enqueueGuide]);

  const flowSwitch = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    const mode: ProjectMode = f.mode === 'new' ? 'existing' : 'new';
    enqueueGuide([{ text: `Switching to the ${mode === 'new' ? 'new-project' : 'existing-project'} flow — shared answers are kept.` }]);
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
    enqueueGuide([
      { text: 'No problem — your answers stay saved, so we can pick this up anytime. Anything else I can help with?', actions: WELCOME_ACTIONS },
    ]);
  }, [enqueueGuide]);

  // ---------- demo analysis + estimate explanation ----------
  const runAnalysis = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    pushUser('Run demo analysis');
    setFlow({ ...f, status: 'analyzing' });
  }, [pushUser]);

  const completeAnalysis = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    const result = buildGuideEstimate(f.mode, f.answers);
    setEstimate(result);
    saveResult(result);
    setFlow({ ...f, status: 'done' });
    setCelebrating(true);
    addTimer(() => setCelebrating(false), 4000);
    const roles = result.team.map((r) => `${r.role} — ${r.hours}h at $${r.hourlyRate}/hr`).join('; ');
    enqueueGuide([
      {
        text: `Your demo estimate is ready! Recommended service: ${result.recommendedService}, suggested technology: ${result.suggestedTech.join(', ')}.`,
      },
      {
        text: `Team requirement: ${roles}. That totals ${result.totalHours} hours ≈ $${result.totalCost.toLocaleString()}.`,
      },
      {
        text: `Duration: with a ${result.weeklyCapacityHours}-hour weekly capacity, delivery is roughly ${result.estimatedWeeks} week${result.estimatedWeeks > 1 ? 's' : ''} plus a launch week.`,
      },
      {
        text: `Why this works — ${result.pros[0]}. Watch-outs: ${result.cons[0]} Main risk: ${result.risks[0]}.`,
      },
      {
        text: `${ESTIMATE_DISCLAIMER} ${result.recommendedNextStep}`,
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
  }, [addTimer, enqueueGuide]);

  // ---------- lead conversion ----------
  const buildSummaryText = useCallback(() => {
    const e = estimateRef.current;
    if (e) {
      return `Hello SCS Softwares! I used the Virtual Guide demo. ${e.requirementSummary.join('. ')}. Demo estimate: ${e.totalHours} hours, ~$${e.totalCost.toLocaleString()}, about ${e.estimatedWeeks} week(s). I'd like to discuss the next steps.`;
    }
    return 'Hello SCS Softwares! I explored your website with the Virtual Guide and would like to discuss a project.';
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
    setResultsOpen(false);
    stopSpeaking();
    setTour({ active: true, index: 0, paused: false });
  }, [dismissInvite, stopSpeaking]);

  const endTour = useCallback(
    (completed: boolean) => {
      stopSpeaking();
      setTour({ active: false, index: 0, paused: false });
      setOpen(true);
      setMinimized(false);
      enqueueGuide([
        completed
          ? {
              text: "That's the full tour! The best next step: tell me about your project and I'll prepare a preliminary demo estimate.",
              actions: [
                { label: 'I have a new project', kind: 'flow-new' },
                { label: 'Fix an existing project', kind: 'flow-existing' },
                { label: 'Schedule a call', kind: 'schedule-handoff' },
              ],
            }
          : {
              text: 'Tour ended — explore freely! I stay right here if you need directions, explanations or an estimate.',
              actions: WELCOME_ACTIONS,
            },
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
    enqueueGuide([{ text: 'Tour paused — ask me anything, or press Resume tour when ready.' }]);
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

  // Navigate to the step's route and speak its text.
  useEffect(() => {
    if (!tour.active || tour.paused) return;
    const step = TOUR_STEPS[tour.index];
    if (!step) return;
    if (pathRef.current !== step.route) navigate(step.route);
    setCaption(step.text);
    if (voiceRef.current.enabled && !voiceRef.current.muted && tts.supported) {
      tts.speak(step.text);
    }
    return () => tts.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.active, tour.index, tour.paused]);

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
      const reply = routeMessage(text, pathRef.current) ?? clarifyReply(pathRef.current);
      enqueueGuide([{ text: reply.text, actions: reply.actions }]);
    },
    [answerQuestion, enqueueGuide, pushUser],
  );

  // ---------- actions ----------
  const runAction = useCallback(
    (action: GuideAction) => {
      switch (action.kind) {
        case 'navigate': {
          if (!action.to) return;
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
          if (action.message) sendMessage(action.message);
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
      }
    },
    [addTimer, contactHandoff, navigate, openWhatsApp, reduceMotion, runAnalysis, sendMessage, startFlow, startTour],
  );

  const restartConversation = useCallback(() => {
    queueRef.current = [];
    stopSpeaking();
    processingRef.current = false;
    clearTimers();
    setTyping(false);
    setFlow(null);
    setTour({ active: false, index: 0, paused: false });
    setCaption('');
    sessionStorage.removeItem(CONVERSATION_KEY);
    setMessages([{ id: nextId(), from: 'guide', text: GUIDE_WELCOME, actions: WELCOME_ACTIONS }]);
  }, [clearTimers, stopSpeaking]);

  // ---------- voice controls ----------
  const toggleVoice = useCallback(() => {
    setVoiceEnabled((v) => {
      if (v) tts.cancel();
      return !v;
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
                text: `Here's your demo estimate in short: ${stored.totalHours} hours ≈ $${stored.totalCost.toLocaleString()}, about ${stored.estimatedWeeks} week(s) at ${stored.weeklyCapacityHours}h/week. ${ESTIMATE_DISCLAIMER}`,
                actions: [
                  { label: 'View detailed breakdown', kind: 'open-results' },
                  { label: 'Schedule a review call', kind: 'schedule-handoff' },
                ],
              }
            : {
                text: "You don't have a demo estimate from me yet — answer a few questions and I'll prepare one.",
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
    if (recognition.listening) return 'listening';
    if (tts.speaking) return 'speaking';
    if (typing || flow?.status === 'analyzing') return 'thinking';
    if (tour.active && !tour.paused) return 'pointing';
    if (celebrating) return 'success';
    if (waving) return 'welcome';
    if (minimized) return 'minimized';
    return 'idle';
  }, [recognition.listening, tts.speaking, typing, flow?.status, tour.active, tour.paused, celebrating, waving, minimized]);

  const quickActions = useMemo(() => getRouteQuickActions(location.pathname), [location.pathname]);

  const currentQuestion = useMemo(() => {
    if (!flow || flow.status !== 'active') return null;
    return getQuestions(flow.mode)[flow.index] ?? null;
  }, [flow]);

  const showInvite = inviteVisible && !open && location.pathname === '/';

  return {
    // panel
    open,
    minimized,
    openPanel,
    closePanel,
    minimize,
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
    voiceEnabled,
    toggleVoice,
    muted,
    toggleMute,
    ttsSupported: tts.supported,
    speaking: tts.speaking,
    recognition,
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

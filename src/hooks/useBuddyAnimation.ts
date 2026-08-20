import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BUDDY_REACT_EVENT, BUDDY_REACTIONS } from '@/data/buddyReactions';
import { BUDDY_TIMING } from '@/data/buddyTiming';
import { useBuddyInactivity, BuddyInactivityStage } from '@/hooks/useBuddyInactivity';
import { useBuddyPosition } from '@/hooks/useBuddyPosition';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import {
  BuddyAnimationState,
  BuddyEmotion,
  BuddyHomePhase,
  BuddyPrefsV1,
  BuddyReaction,
  BuddyReactionEvent,
} from '@/types/buddy';

// Central Buddy state machine. Layers are held separately — home phase
// (physical location/walking), conversation reaction (temporary pose),
// facial emotion, inactivity stage, speech — and combined in one derive step
// so they can never override each other incorrectly.

const BUDDY_PREFS_KEY = 'scs-buddy-character-v1';

const WAIT_BUBBLE_KEY = 'guide.buddy.waitBubble';
const GOODBYE_BUBBLE_KEY = 'guide.buddy.goodbye';
const BACK_BUBBLE_KEY = 'guide.buddy.back';

const DEFAULT_PREFS: BuddyPrefsV1 = {
  version: 1,
  insideHome: false,
  animationsPaused: false,
  reduceMotion: false,
  soundsEnabled: false, // sounds are opt-in, always off by default
};

function loadPrefs(): BuddyPrefsV1 {
  try {
    const raw = localStorage.getItem(BUDDY_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<BuddyPrefsV1>;
    // Versioned shape check — anything unexpected resets safely to defaults.
    if (parsed?.version !== 1) return DEFAULT_PREFS;
    return {
      version: 1,
      insideHome: parsed.insideHome === true,
      animationsPaused: parsed.animationsPaused === true,
      reduceMotion: parsed.reduceMotion === true,
      soundsEnabled: parsed.soundsEnabled === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Soft double-knock via WebAudio — only called when sounds are enabled. */
function playKnockSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    [0, 0.18].forEach((dt) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 170;
      gain.gain.setValueAtTime(0.25, t0 + dt);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 0.14);
    });
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // Sound is purely optional — never break the interaction over it.
  }
}

/** Temporary conversation-reaction poses, shared by stage and panel avatar. */
export function useBuddyReaction(): BuddyReaction | null {
  const [reaction, setReaction] = useState<BuddyReaction | null>(null);
  const timerRef = useRef<number>();
  const lastRef = useRef<{ type: BuddyReactionEvent; at: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent<{ type?: BuddyReactionEvent }>).detail?.type;
      const next = type ? BUDDY_REACTIONS[type] : undefined;
      if (!type || !next) return;
      const now = Date.now();
      // Keep reactions contextual: never replay the same one back-to-back.
      if (lastRef.current?.type === type && now - lastRef.current.at < BUDDY_TIMING.reactionRepeatGuardMs) return;
      lastRef.current = { type, at: now };
      setReaction(next);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setReaction(null), next.durationMs);
    };
    window.addEventListener(BUDDY_REACT_EVENT, handler);
    return () => {
      window.removeEventListener(BUDDY_REACT_EVENT, handler);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  return reaction;
}

// ---------- home-phase machine ----------

interface BuddyMachine {
  homePhase: BuddyHomePhase;
  inactivityStage: BuddyInactivityStage;
  bubbleKey: string | null;
}

type BuddyMachineEvent =
  | { type: 'HOME_PHASE'; phase: BuddyHomePhase }
  | { type: 'INACTIVITY'; stage: BuddyInactivityStage }
  | { type: 'BUBBLE'; key: string | null };

/** Legal home transitions; 'outside' is always reachable as a safe reset. */
const HOME_FLOW: Record<BuddyHomePhase, BuddyHomePhase[]> = {
  outside: ['goodbye'],
  goodbye: ['turning', 'entering'],
  turning: ['walkingHome'],
  walkingHome: ['entering'],
  entering: ['inside'],
  inside: ['knocking'],
  knocking: ['peeking'],
  peeking: ['walkingBack'],
  walkingBack: ['greeting'],
  greeting: [],
};

function machineReducer(state: BuddyMachine, event: BuddyMachineEvent): BuddyMachine {
  switch (event.type) {
    case 'HOME_PHASE': {
      const allowed = event.phase === 'outside' || HOME_FLOW[state.homePhase].includes(event.phase);
      if (!allowed) return state;
      return { ...state, homePhase: event.phase, inactivityStage: 0 };
    }
    case 'INACTIVITY': {
      if (state.homePhase !== 'outside') return state;
      const bubbleKey =
        event.stage === 0 && state.bubbleKey === WAIT_BUBBLE_KEY ? null : state.bubbleKey;
      return { ...state, inactivityStage: event.stage, bubbleKey };
    }
    case 'BUBBLE':
      return { ...state, bubbleKey: event.key };
    default:
      return state;
  }
}

// ---------- controller ----------

export function useBuddyAnimation(guide: VirtualGuideApi) {
  const position = useBuddyPosition();
  const reaction = useBuddyReaction();

  const [prefs, setPrefs] = useState<BuddyPrefsV1>(loadPrefs);
  const [machine, dispatch] = useReducer(machineReducer, undefined, () => ({
    homePhase: loadPrefs().insideHome ? ('inside' as BuddyHomePhase) : ('outside' as BuddyHomePhase),
    inactivityStage: 0 as BuddyInactivityStage,
    bubbleKey: null,
  }));

  const machineRef = useRef(machine);
  machineRef.current = machine;

  const [tabHidden, setTabHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const effectiveReduceMotion = guide.reduceMotion || prefs.reduceMotion;
  // Loops freeze while paused, in reduced motion, or when the tab is hidden.
  const animate = !prefs.animationsPaused && !effectiveReduceMotion && !tabHidden;

  // ---------- persistence ----------
  useEffect(() => {
    localStorage.setItem(BUDDY_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    if (machine.homePhase === 'inside' || machine.homePhase === 'outside') {
      setPrefs((p) => (p.insideHome === (machine.homePhase === 'inside') ? p : { ...p, insideHome: machine.homePhase === 'inside' }));
    }
  }, [machine.homePhase]);

  // ---------- sequences ----------
  const seqTimersRef = useRef<number[]>([]);
  const bubbleTimerRef = useRef<number>();

  const clearSequence = useCallback(() => {
    seqTimersRef.current.forEach((id) => window.clearTimeout(id));
    seqTimersRef.current = [];
  }, []);

  useEffect(
    () => () => {
      clearSequence();
      window.clearTimeout(bubbleTimerRef.current);
    },
    [clearSequence],
  );

  const showBubble = useCallback((key: string) => {
    dispatch({ type: 'BUBBLE', key });
    window.clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => dispatch({ type: 'BUBBLE', key: null }), BUDDY_TIMING.bubbleMs);
  }, []);

  const runSequence = useCallback(
    (steps: { phase: BuddyHomePhase; ms: number }[], final: BuddyHomePhase) => {
      clearSequence();
      let at = 0;
      steps.forEach((step, i) => {
        const start = at;
        if (i === 0) dispatch({ type: 'HOME_PHASE', phase: step.phase });
        else seqTimersRef.current.push(window.setTimeout(() => dispatch({ type: 'HOME_PHASE', phase: step.phase }), start));
        at += step.ms;
      });
      seqTimersRef.current.push(window.setTimeout(() => dispatch({ type: 'HOME_PHASE', phase: final }), at));
    },
    [clearSequence],
  );

  const walkMs = position.isMobile ? BUDDY_TIMING.walkMsMobile : BUDDY_TIMING.walkMs;

  /** Friendly retreat: funny wave → turn → walk → door → inside. */
  const sendHome = useCallback(() => {
    if (machineRef.current.homePhase !== 'outside') return;
    showBubble(GOODBYE_BUBBLE_KEY);
    if (!animate) {
      // Reduced motion / paused: gentle fade instead of walking.
      runSequence([{ phase: 'goodbye', ms: 900 }, { phase: 'entering', ms: 450 }], 'inside');
    } else {
      runSequence(
        [
          { phase: 'goodbye', ms: BUDDY_TIMING.goodbyeMs },
          { phase: 'turning', ms: BUDDY_TIMING.turnMs },
          { phase: 'walkingHome', ms: walkMs },
          { phase: 'entering', ms: BUDDY_TIMING.enterMs },
        ],
        'inside',
      );
    }
  }, [animate, runSequence, showBubble, walkMs]);

  /** Door knock: shake + light → peek → door opens → walk back → wave. */
  const knock = useCallback(() => {
    if (machineRef.current.homePhase !== 'inside') return;
    if (prefs.soundsEnabled) playKnockSound();
    if (!animate) {
      runSequence([{ phase: 'knocking', ms: 500 }, { phase: 'peeking', ms: 600 }, { phase: 'walkingBack', ms: 450 }, { phase: 'greeting', ms: BUDDY_TIMING.greetMs }], 'outside');
    } else {
      runSequence(
        [
          { phase: 'knocking', ms: BUDDY_TIMING.knockMs },
          { phase: 'peeking', ms: BUDDY_TIMING.peekMs },
          { phase: 'walkingBack', ms: walkMs },
          { phase: 'greeting', ms: BUDDY_TIMING.greetMs },
        ],
        'outside',
      );
    }
    showBubble(BACK_BUBBLE_KEY);
  }, [animate, prefs.soundsEnabled, runSequence, showBubble, walkMs]);

  // ---------- inactivity (local timers only) ----------
  const onInactivityStage = useCallback(
    (stage: BuddyInactivityStage) => {
      if (stage === 3) {
        sendHome();
        return;
      }
      dispatch({ type: 'INACTIVITY', stage });
      if (stage === 2) showBubble(WAIT_BUBBLE_KEY);
    },
    [sendHome, showBubble],
  );

  const { markInteraction } = useBuddyInactivity({
    enabled: machine.homePhase === 'outside' && !guide.open && !tabHidden && !prefs.animationsPaused,
    onStage: onInactivityStage,
  });

  // Any Buddy interaction resets inactivity; returning after a sleepy/waiting
  // stretch earns a friendly welcome-back wave. Repeated dismissals send
  // Buddy home without nagging.
  const prevOpenRef = useRef(guide.open);
  const dismissCountRef = useRef(0);
  const [welcomeBack, setWelcomeBack] = useState(false);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = guide.open;
    if (guide.open && !wasOpen && machineRef.current.inactivityStage >= 1) {
      setWelcomeBack(true);
      window.setTimeout(() => setWelcomeBack(false), 2600);
    }
    if (!guide.open && wasOpen) {
      dismissCountRef.current += 1;
      if (dismissCountRef.current >= BUDDY_TIMING.dismissRetreatCount) {
        dismissCountRef.current = 0;
        sendHome();
      }
    }
    markInteraction();
  }, [guide.open, markInteraction, sendHome]);

  useEffect(() => {
    markInteraction();
  }, [guide.messages.length, guide.tour.active, guide.tour.index, markInteraction]);

  // ---------- preference toggles ----------
  const togglePauseAnimations = useCallback(() => setPrefs((p) => ({ ...p, animationsPaused: !p.animationsPaused })), []);
  const toggleReduceMotion = useCallback(() => setPrefs((p) => ({ ...p, reduceMotion: !p.reduceMotion })), []);
  const toggleSounds = useCallback(() => setPrefs((p) => ({ ...p, soundsEnabled: !p.soundsEnabled })), []);

  // ---------- derived character state ----------
  const { state: characterState, emotion } = useMemo((): { state: BuddyAnimationState; emotion: BuddyEmotion } => {
    switch (machine.homePhase) {
      case 'goodbye':
        return { state: 'waving', emotion: 'funny' };
      case 'turning':
      case 'walkingHome':
        return { state: 'goingHome', emotion: 'neutral' };
      case 'entering':
        return { state: 'walking', emotion: 'neutral' };
      case 'inside':
        return { state: 'insideHome', emotion: 'sleepy' };
      case 'knocking':
      case 'peeking':
        return { state: 'knockingResponse', emotion: 'surprised' };
      case 'walkingBack':
        return { state: 'returning', emotion: 'happy' };
      case 'greeting':
        return { state: 'welcoming', emotion: 'happy' };
      default:
        break;
    }
    if (welcomeBack) return { state: 'waving', emotion: 'happy' };
    if (reaction) return { state: reaction.state, emotion: reaction.emotion };
    if (machine.inactivityStage === 2) return { state: 'sleepy', emotion: 'sleepy' };
    if (machine.inactivityStage === 1) return { state: 'waiting', emotion: 'neutral' };
    if (guide.tour.active && !guide.tour.paused) return { state: position.pointInward, emotion: 'smiling' };
    switch (guide.avatarState) {
      case 'listening':
        return { state: 'listening', emotion: 'neutral' };
      case 'speaking':
        return { state: 'speaking', emotion: 'neutral' };
      case 'thinking':
        return { state: 'thinking', emotion: 'neutral' };
      case 'welcome':
        return { state: 'welcoming', emotion: 'happy' };
      case 'success':
        return { state: 'celebrating', emotion: 'happy' };
      case 'pointing':
        return { state: position.pointInward, emotion: 'smiling' };
      default:
        return { state: 'idle', emotion: 'neutral' };
    }
  }, [machine.homePhase, machine.inactivityStage, welcomeBack, reaction, guide.tour.active, guide.tour.paused, guide.avatarState, position.pointInward]);

  const atHome = ['walkingHome', 'entering', 'inside', 'knocking', 'peeking'].includes(machine.homePhase);

  return {
    // state
    homePhase: machine.homePhase,
    insideHome: machine.homePhase === 'inside',
    characterState,
    emotion,
    talking: guide.speaking,
    bubbleKey: machine.bubbleKey,
    atHome,
    walkMs,
    animate,
    effectiveReduceMotion,
    position,
    // actions
    sendHome,
    knock,
    bringBack: knock,
    markInteraction,
    // preferences
    prefs,
    togglePauseAnimations,
    toggleReduceMotion,
    toggleSounds,
  };
}

export type BuddyApi = ReturnType<typeof useBuddyAnimation>;

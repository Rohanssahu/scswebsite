import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Slow continuous scroll speed while a button is held (px per frame ≈ 360px/s at 60fps).
const HOLD_SPEED = 6;
// A press shorter than this is treated as a tap → one smooth page-step instead.
const TAP_MS = 250;
// Fade the controls after this long without scrolling.
const IDLE_MS = 3000;

const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Floating page controls on the right edge of every page:
 * up/down scroll buttons (tap = page step, hold = slow continuous scroll),
 * a reading-progress ring, and a WhatsApp quick button.
 * Fades when idle; wakes on scroll or hover.
 */
const ScrollButtons = () => {
  const { t } = useTranslation();
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [progress, setProgress] = useState(0);
  const [idle, setIdle] = useState(false);

  const rafRef = useRef<number>();
  const pressStartRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setAtTop(y <= 4);
      setAtBottom(y >= max - 4);
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
    };
    const onScroll = () => {
      update();
      wake();
    };
    update();
    wake();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [wake]);

  const stopHold = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  };

  const startHold = (dir: 1 | -1) => {
    pressStartRef.current = Date.now();
    stopHold();
    const step = () => {
      window.scrollBy(0, dir * HOLD_SPEED);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const stepScroll = (dir: 1 | -1) => {
    window.scrollBy({ top: dir * window.innerHeight * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const endHold = (dir: 1 | -1) => {
    stopHold();
    if (Date.now() - pressStartRef.current < TAP_MS) stepScroll(dir);
  };

  // Page fits in the viewport — nothing to scroll.
  if (atTop && atBottom) return null;

  const btnCls = (disabled: boolean) =>
    `relative flex h-11 w-11 select-none items-center justify-center rounded-full border bg-white/90 shadow-lg backdrop-blur transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
      disabled
        ? 'pointer-events-none border-gray-200 text-gray-300 opacity-50'
        : 'border-gray-200 text-gray-600 hover:scale-105 hover:border-pink-400 hover:text-pink-600'
    }`;

  return (
    <div
      className={`no-print fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 transition-opacity duration-500 sm:right-4 ${
        idle ? 'opacity-30 hover:opacity-100' : 'opacity-100'
      }`}
      onPointerEnter={wake}
      aria-label={t('a11y.pageScrollControls')}
    >
      {/* Scroll up — with reading-progress ring */}
      <button
        type="button"
        aria-label={t('a11y.scrollUp')}
        className={btnCls(atTop)}
        onPointerDown={() => startHold(-1)}
        onPointerUp={() => endHold(-1)}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            stepScroll(-1);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
          <defs>
            <linearGradient id="scroll-progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            stroke="url(#scroll-progress-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
          />
        </svg>
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Scroll down */}
      <button
        type="button"
        aria-label={t('a11y.scrollDown')}
        className={btnCls(atBottom)}
        onPointerDown={() => startHold(1)}
        onPointerUp={() => endHold(1)}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            stepScroll(1);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      >
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
      </button>

    </div>
  );
};

export default ScrollButtons;

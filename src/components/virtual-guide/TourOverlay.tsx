import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MessageCircleQuestion, X } from 'lucide-react';
import { TOUR_STEPS, TOUR_TARGET_TIMEOUT_MS } from '@/data/guideTour';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import AnimatedPointer from './AnimatedPointer';

// Spotlight overlay for the guided tour. Targets are found by their stable
// data-guide-id attribute; a target that never renders is skipped gracefully.

interface TourOverlayProps {
  guide: VirtualGuideApi;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TourOverlay = ({ guide }: TourOverlayProps) => {
  const step = guide.currentTourStep;
  const paused = guide.tour.paused;
  const [rect, setRect] = useState<Rect | null>(null);
  const { tourTargetMissing, tourSkip, reduceMotion } = guide;

  // Find and track the step target. Runs a light polling loop so it also
  // follows smooth scrolling and late-rendering sections.
  useEffect(() => {
    if (!step || paused) return;
    setRect(null);
    let cancelled = false;
    let scrolled = false;
    const started = performance.now();

    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-guide-id="${step.targetId}"]`);
      if (el) {
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (performance.now() - started > TOUR_TARGET_TIMEOUT_MS) {
        cancelled = true;
        tourTargetMissing(); // skip missing targets without crashing
        return;
      }
      timer = window.setTimeout(tick, 150);
    };
    let timer = window.setTimeout(tick, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [step, paused, reduceMotion, tourTargetMissing]);

  // Escape ends the tour.
  useEffect(() => {
    if (!step || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tourSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, paused, tourSkip]);

  if (!step || paused) return null;

  const pointerBelow = rect ? rect.top + rect.height + 56 < window.innerHeight : true;
  const pointerX = rect ? Math.min(Math.max(rect.left + rect.width / 2, 24), window.innerWidth - 24) : 0;
  const pointerY = rect ? (pointerBelow ? rect.top + rect.height + 6 : Math.max(rect.top - 48, 8)) : 0;

  return (
    <>
      {/* Spotlight: a transparent window over the target, dimming everything else */}
      <AnimatePresence>
        {rect && (
          <motion.div
            key={step.id}
            className="pointer-events-none fixed z-[70] rounded-2xl border-2 border-pink-400"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{
              opacity: 1,
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 200vmax rgba(15, 23, 42, 0.55)',
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {rect && <AnimatedPointer x={pointerX} y={pointerY} direction={pointerBelow ? 'up' : 'down'} reduceMotion={reduceMotion} />}

      {/* Step card with captions + controls */}
      <div
        role="region"
        aria-label={`Tour step ${guide.tour.index + 1} of ${TOUR_STEPS.length}: ${step.title}`}
        className="fixed inset-x-3 bottom-24 z-[76] mx-auto max-w-md rounded-2xl border border-gray-300 bg-white p-4 shadow-2xl shadow-gray-600/30 sm:inset-x-auto sm:left-1/2 sm:bottom-6 sm:w-[26rem] sm:-translate-x-1/2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-600">
              SCS Virtual Guide — Demo · Step {guide.tour.index + 1}/{TOUR_STEPS.length}
            </p>
            <h3 className="mt-0.5 text-sm font-bold text-gray-900">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={guide.tourSkip}
            aria-label="Skip tour"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600" aria-live="polite">
          {rect ? step.text : 'Taking you there…'}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={guide.tourBack}
            disabled={guide.tour.index === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
          </button>
          <button
            type="button"
            onClick={guide.tourAsk}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" /> Ask
          </button>
          <button
            type="button"
            onClick={guide.tourNext}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-3.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            {guide.tour.index === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
};

export default TourOverlay;

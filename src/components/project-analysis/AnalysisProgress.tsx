import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const STEPS = [
  'Reading requirements',
  'Identifying project scope',
  'Detecting required skills',
  'Classifying essential and optional scope',
  'Fitting the scope to your budget',
  'Calculating hours, cost and delivery timeline',
];

interface AnalysisProgressProps {
  onComplete: () => void;
  /**
   * When false, the animation holds on the final step until the real AI
   * analysis resolves; onComplete only fires once both are done.
   */
  ready?: boolean;
  /** True when a real AI analysis is running (changes the copy). */
  ai?: boolean;
}

const AnalysisProgress = ({ onComplete, ready = true, ai = false }: AnalysisProgressProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const stepDuration = reduceMotion ? 250 : 900;

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      const done = setTimeout(onComplete, reduceMotion ? 100 : 600);
      return () => clearTimeout(done);
    }
    // Hold the last step while the AI analysis is still in flight.
    if (currentStep === STEPS.length - 1 && !ready) return;
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), stepDuration);
    return () => clearTimeout(timer);
  }, [currentStep, onComplete, ready, reduceMotion, stepDuration]);

  const progress = Math.min(100, Math.round((currentStep / STEPS.length) * 100));

  return (
    <div className="mx-auto max-w-lg text-center" role="status" aria-live="polite">
      <div className="relative mx-auto mb-8 h-20 w-20">
        <div className="absolute inset-0 animate-pulse-glow rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 blur-xl" aria-hidden="true" />
        <div className="relative flex h-full w-full items-center justify-center rounded-full border border-pink-300 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" aria-hidden="true" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">
        {ai ? 'Preparing your AI analysis…' : 'Preparing your estimate…'}
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {ai
          ? 'Our AI is reviewing your answers and documents, then we calculate the scope that fits your budget.'
          : 'Calculating a basic estimate from your answers at our standard rate of up to $5 per hour.'}
      </p>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.4 }}
        />
      </div>

      <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left">
        {STEPS.map((step, i) => {
          const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              {state === 'done' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : state === 'active' ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-pink-600" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-gray-300" aria-hidden="true" />
              )}
              <span
                className={
                  state === 'done' ? 'text-gray-700' : state === 'active' ? 'font-medium text-gray-900' : 'text-gray-400'
                }
              >
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AnalysisProgress;

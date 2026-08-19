import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { DEMO_ANALYSIS_STEPS } from '@/data/demoEstimate';

// Simulated "Demo analysis" progress sequence shown inside the chat before
// the estimate appears. Timed frontend transitions only — nothing is analyzed.

interface DemoAnalysisProps {
  onComplete: () => void;
  reduceMotion: boolean;
}

const DemoAnalysis = ({ onComplete, reduceMotion }: DemoAnalysisProps) => {
  const [step, setStep] = useState(0);
  const stepDuration = reduceMotion ? 200 : 850;
  // Keep the callback in a ref so parent re-renders never reset the timers.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (step >= DEMO_ANALYSIS_STEPS.length) {
      const done = window.setTimeout(() => onCompleteRef.current(), reduceMotion ? 100 : 500);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), stepDuration);
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion, stepDuration]);

  const progress = Math.min(100, Math.round((step / DEMO_ANALYSIS_STEPS.length) * 100));

  return (
    <div
      className="max-w-[92%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-3.5 py-3"
      role="status"
      aria-live="polite"
      aria-label="Demo analysis in progress"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-900">Demo analysis</p>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Simulated — not real code analysis
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {DEMO_ANALYSIS_STEPS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'pending';
          return (
            <li key={label} className="flex items-center gap-2 text-xs">
              {state === 'done' ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : state === 'active' ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-pink-600" aria-hidden="true" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
              )}
              <span className={state === 'done' ? 'text-gray-700' : state === 'active' ? 'font-medium text-gray-900' : 'text-gray-400'}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DemoAnalysis;

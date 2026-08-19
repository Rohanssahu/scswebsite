import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface HealthScoreProps {
  score: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  mode: 'new' | 'existing';
}

const RISK_STYLES: Record<HealthScoreProps['riskLevel'], string> = {
  Low: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  Medium: 'border-amber-300 bg-amber-50 text-amber-700',
  High: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
};

const HealthScore = ({ score, riskLevel, mode }: HealthScoreProps) => {
  const reduceMotion = useReducedMotion();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative h-36 w-36" role="img" aria-label={`Project health score ${score} out of 100`}>
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(17,24,39,0.08)" strokeWidth="10" />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <div className="text-center sm:text-left">
        <h3 className="text-lg font-semibold text-gray-900">
          {mode === 'new' ? 'Project readiness score' : 'Project health score'}
        </h3>
        <p className="mt-1 max-w-xs text-sm text-gray-600">
          {mode === 'new'
            ? 'How well-defined your requirements are for an accurate quote.'
            : 'Estimated condition of the project based on the details you shared.'}
        </p>
        <span
          className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${RISK_STYLES[riskLevel]}`}
        >
          {riskLevel} risk
        </span>
      </div>
    </div>
  );
};

export default HealthScore;

import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DetectedIssue } from '@/types/projectAnalysis';

interface IssueCardsProps {
  issues: DetectedIssue[];
}

const SEVERITY = {
  high: { icon: AlertTriangle, cls: 'text-rose-600', label: 'High' },
  medium: { icon: AlertCircle, cls: 'text-amber-400', label: 'Medium' },
  low: { icon: Info, cls: 'text-sky-600', label: 'Low' },
} as const;

const IssueCards = ({ issues }: IssueCardsProps) => {
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <ul className="space-y-3">
      {issues.map((issue, i) => {
        const sev = SEVERITY[issue.severity];
        const Icon = sev.icon;
        const expanded = open === i;
        return (
          <li key={issue.title} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : i)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Icon className={`h-5 w-5 shrink-0 ${sev.cls}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-gray-900">{issue.title}</span>
                <span className="block truncate text-xs text-gray-500">{issue.summary}</span>
              </span>
              <span className={`shrink-0 rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase ${sev.cls}`}>
                {sev.label}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="border-t border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-600">
                    {issue.detail}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
};

export default IssueCards;

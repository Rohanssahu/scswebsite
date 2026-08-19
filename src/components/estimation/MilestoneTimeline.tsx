import React from 'react';
import { Flag, CheckCircle2 } from 'lucide-react';
import { Milestone } from '@/types/projectAnalysis';

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

const MilestoneTimeline = ({ milestones }: MilestoneTimelineProps) => (
  <ol className="relative space-y-6 border-l border-gray-300 pl-6">
    {milestones.map((m, i) => (
      <li key={m.title} className="relative">
        <span
          className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-pink-400 bg-white"
          aria-hidden="true"
        >
          <Flag className="h-2.5 w-2.5 text-pink-600" />
        </span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className="font-semibold text-gray-900">
            {i + 1}. {m.title}
          </h4>
          <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-500">
            {m.week}
          </span>
        </div>
        <ul className="mt-2 space-y-1">
          {m.deliverables.map((d) => (
            <li key={d} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              {d}
            </li>
          ))}
        </ul>
      </li>
    ))}
  </ol>
);

export default MilestoneTimeline;

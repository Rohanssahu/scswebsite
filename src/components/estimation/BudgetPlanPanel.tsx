import React from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, DollarSign, Gauge, MinusCircle } from 'lucide-react';
import {
  formatUsd,
  monthlyCostRangeLabel,
  STANDARD_HOURLY_RATE_USD,
  WEEKLY_CAPACITY_HOURS,
  WEEKLY_COST_USD,
  type BudgetPlan,
  type PlanTier,
  type ScopeItem,
} from '@/policy/estimationPolicy';

// =============================================================================
// The budget section of every generated report (Phase 6 of the estimation
// policy). It renders — in order — the client's selected budget, the standard
// rate, the available hours, the budget-fit MVP with its included AND deferred
// requirements, the duration at 40 h/week, the preliminary total, and the two
// optional tiers when (and only when) they actually add something.
//
// It renders NOTHING it was not given. Every figure here comes from the
// validated `BudgetPlan`, so this panel, the chat text and the voice agent are
// literally reading the same object.
// =============================================================================

const ScopeList = ({
  items,
  tone,
}: {
  items: ScopeItem[];
  tone: 'included' | 'deferred' | 'unclear';
}) => {
  if (items.length === 0) return null;
  const Icon = tone === 'included' ? CheckCircle2 : tone === 'deferred' ? MinusCircle : AlertTriangle;
  const color = tone === 'included' ? 'text-emerald-600' : tone === 'deferred' ? 'text-gray-400' : 'text-amber-600';
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={`${tone}-${item.label}`} className="flex items-start gap-2 text-sm text-gray-700">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
          <span>
            {item.label}
            <span className="ml-1.5 text-xs text-gray-400">
              {item.tier === 'unclear' ? 'needs more detail' : `${item.hours} h`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};

const OptionalTierCard = ({ tier, budgetUsd }: { tier: PlanTier; budgetUsd: number }) => (
  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="text-sm font-semibold text-gray-900">
        {tier.label}{' '}
        <span className="rounded-full border border-purple-300 bg-white px-2 py-0.5 text-xs font-medium text-purple-700">
          Optional
        </span>
      </h4>
      <p className="text-sm font-semibold text-purple-700">
        {formatUsd(tier.costUsd)}{' '}
        <span className="font-normal text-gray-500">
          (+{tier.percentAboveBudget}% on {formatUsd(budgetUsd)}, {formatUsd(tier.costUsd - budgetUsd)} more)
        </span>
      </p>
    </div>
    <p className="mt-1 text-xs text-gray-600">
      {tier.hours} hours · about {tier.weeks} week{tier.weeks === 1 ? '' : 's'} at {WEEKLY_CAPACITY_HOURS} h/week
    </p>
    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">What the extra budget adds</p>
    <div className="mt-1.5">
      <ScopeList items={tier.addedVsBase} tone="included" />
    </div>
  </div>
);

const Stat = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-3">
    <Icon className="h-4 w-4 text-pink-600" aria-hidden="true" />
    <p className="mt-1.5 text-base font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

interface BudgetPlanPanelProps {
  plan: BudgetPlan;
  /** The client-facing wording built by the policy. Rendered verbatim. */
  narrative: string[];
}

const BudgetPlanPanel = ({ plan, narrative }: BudgetPlanPanelProps) => {
  const base = plan.base;

  return (
    <div className="space-y-5">
      {/* 1-3: selected budget, standard rate, available hours */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={DollarSign}
          label={plan.budgetProvided ? 'Your selected budget' : 'No budget set — full scope priced'}
          value={formatUsd(plan.selectedBudgetUsd)}
        />
        <Stat icon={Gauge} label="Standard hourly rate" value={`up to ${formatUsd(STANDARD_HOURLY_RATE_USD)}/h`} />
        <Stat icon={Clock} label="Available development hours" value={`${plan.availableHours} h`} />
        <Stat
          icon={ArrowUpRight}
          label="Estimated scope coverage"
          value={plan.coverageBand === 'unknown' ? '—' : `${plan.budgetFitPercent}%`}
        />
      </div>

      {/* The policy's own client-facing wording — the same text Buddy speaks. */}
      <div className="space-y-2 rounded-xl border border-pink-200 bg-pink-50/60 p-4">
        {narrative.map((line) => (
          <p key={line} className="text-sm leading-relaxed text-gray-800">
            {line}
          </p>
        ))}
      </div>

      {plan.coverageBand === 'below-mvp' && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            This budget does not yet cover the essential launch scope, so nothing below is presented as a complete
            project. We would rather agree a smaller Phase 1 than quote under what a usable release needs.
          </p>
        </div>
      )}

      {/* 4-8: the budget-fit MVP, its included and deferred scope, duration, total */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{base.label}</h4>
          <p className="text-sm font-semibold text-emerald-700">
            {formatUsd(base.costUsd)}{' '}
            <span className="font-normal text-gray-500">
              ({base.hours} h × {formatUsd(STANDARD_HOURLY_RATE_USD)})
            </span>
          </p>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Estimated duration: about {base.weeks} week{base.weeks === 1 ? '' : 's'} at a maximum of{' '}
          {WEEKLY_CAPACITY_HOURS} development hours per week ({formatUsd(WEEKLY_COST_USD)} per full week; a full-time
          month is approximately {monthlyCostRangeLabel()}).
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Included requirements</p>
            <div className="mt-1.5">
              {base.includedScope.length > 0 ? (
                <ScopeList items={base.includedScope} tone="included" />
              ) : (
                <p className="text-sm text-gray-500">Nothing can be included at this budget yet.</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Deferred requirements — not included in {formatUsd(base.costUsd)}
            </p>
            <div className="mt-1.5">
              {base.deferredScope.length > 0 ? (
                <ScopeList items={base.deferredScope} tone="deferred" />
              ) : (
                <p className="text-sm text-gray-500">
                  Nothing is deferred — every recorded requirement is included.
                </p>
              )}
            </div>
          </div>
        </div>

        {plan.unclearScope.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Not costed yet — we need more detail
            </p>
            <div className="mt-1.5">
              <ScopeList items={plan.unclearScope} tone="unclear" />
            </div>
          </div>
        )}
      </div>

      {/* 9-10: the optional tiers, only when they add real value */}
      {(plan.recommended || plan.growth) && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Optional upgrades — neither is required or preselected
          </p>
          {plan.recommended && <OptionalTierCard tier={plan.recommended} budgetUsd={plan.selectedBudgetUsd} />}
          {plan.growth && <OptionalTierCard tier={plan.growth} budgetUsd={plan.selectedBudgetUsd} />}
        </div>
      )}
    </div>
  );
};

export default BudgetPlanPanel;

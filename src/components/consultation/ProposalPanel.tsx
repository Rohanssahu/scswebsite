import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download } from 'lucide-react';
import { formatUsd } from '@/policy/estimationPolicy';
import type { BuddyProposalView } from '@/services/voiceSessionCore';

interface ProposalPanelProps {
  proposal: BuddyProposalView | null;
  onDownload: () => void;
}

const Section = ({ title, items }: { title: string; items: string[] }) => {
  if (!items.length) return null;
  return (
    <section className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-gray-700">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Live preliminary proposal. Every figure comes from the server-side
 * deterministic engine; the mandatory disclaimer is always rendered. */
const ProposalPanel: React.FC<ProposalPanelProps> = ({ proposal, onDownload }) => {
  const { t } = useTranslation();

  if (!proposal) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">{t('meeting.proposal.pending')}</p>
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t('meeting.proposal.disclaimer')}
        </p>
      </div>
    );
  }

  const plan = proposal.budgetPlan;
  const range = (min: number, max: number, unit: string) =>
    min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
  const money = (min: number, max: number) =>
    min === max
      ? formatUsd(min)
      : `${formatUsd(min)}–${formatUsd(max)}`;

  const stats = [
    { label: t('meeting.proposal.hours'), value: range(proposal.totalHoursMin, proposal.totalHoursMax, 'h') },
    { label: t('meeting.proposal.cost'), value: money(proposal.totalCostMin, proposal.totalCostMax) },
    {
      label: t('meeting.proposal.duration'),
      value: range(proposal.durationWeeksMin, proposal.durationWeeksMax, t('meeting.proposal.weeks')),
    },
    { label: t('meeting.proposal.rate'), value: `≤ ${formatUsd(proposal.hourlyRateUsd)}/h` },
  ];

  return (
    <div className="overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('meeting.proposal.title')}</h3>
          <p className="text-xs text-gray-500">
            {t('meeting.proposal.version', { version: proposal.version })} · {t('meeting.proposal.confidence')}:{' '}
            {t(`meeting.proposal.confidenceLevels.${proposal.confidence}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> {t('meeting.proposal.download')}
        </button>
      </div>

      {/* mandatory disclaimer, always visible with the figures */}
      <p className="mt-3 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t('meeting.proposal.disclaimer')}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-gray-700">{proposal.summary}</p>

      {/* The client's budget and exactly what it covers. These are the same
          sentences Buddy speaks — read from the same published object — so a
          spoken figure and a rendered figure can never disagree. */}
      {proposal.budgetNarrative.length > 0 && (
        <div className="mt-4 space-y-1.5 rounded-xl border border-pink-200 bg-pink-50/60 p-3">
          {proposal.budgetNarrative.map((line) => (
            <p key={line} className="text-sm leading-relaxed text-gray-800">
              {line}
            </p>
          ))}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-2.5">
            <dt className="text-[11px] text-gray-500">{s.label}</dt>
            <dd className="text-sm font-semibold text-gray-900">{s.value}</dd>
          </div>
        ))}
      </dl>

      {plan && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('meeting.proposal.budgetFit')}
          </h4>
          <dl className="mt-1.5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white p-2.5">
              <dt className="text-[11px] text-gray-500">{t('meeting.proposal.selectedBudget')}</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {plan.budgetProvided ? formatUsd(plan.selectedBudgetUsd) : t('meeting.proposal.noBudgetSet')}
              </dd>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-2.5">
              <dt className="text-[11px] text-gray-500">{t('meeting.proposal.availableHours')}</dt>
              <dd className="text-sm font-semibold text-gray-900">{plan.availableHours} h</dd>
            </div>
          </dl>
          <Section
            title={t('meeting.proposal.included')}
            items={plan.base.includedScope.map((i) => `${i.label} — ${i.hours} h`)}
          />
          <Section
            title={t('meeting.proposal.deferred')}
            items={plan.base.deferredScope.map((i) => `${i.label} — ${i.hours} h`)}
          />
          {plan.unclearScope.length > 0 && (
            <Section
              title={t('meeting.proposal.needsDetail')}
              items={plan.unclearScope.map((i) => i.label)}
            />
          )}
          {(plan.recommended || plan.growth) && (
            <Section
              title={t('meeting.proposal.optionalUpgrades')}
              items={[plan.recommended, plan.growth]
                .filter((tier): tier is NonNullable<typeof tier> => tier !== null)
                .map(
                  (tier) =>
                    `+${tier.percentAboveBudget}% → ${formatUsd(tier.costUsd)} (${tier.hours} h): ` +
                    `${tier.addedVsBase.map((i) => i.label).join(', ')}`,
                )}
            />
          )}
        </section>
      )}

      <Section title={t('meeting.proposal.recommended')} items={proposal.recommendedSolution} />
      <Section title={t('meeting.proposal.architecture')} items={proposal.architecture} />
      <Section title={t('meeting.proposal.stack')} items={proposal.technologyStack} />
      <Section title={t('meeting.proposal.inScope')} items={proposal.inScope} />
      <Section title={t('meeting.proposal.outOfScope')} items={proposal.outOfScope} />
      <Section title={t('meeting.proposal.aiRoles')} items={proposal.aiRoles} />
      <Section title={t('meeting.proposal.humanRoles')} items={proposal.humanRoles} />

      {proposal.milestones.length > 0 && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('meeting.proposal.milestones')}
          </h4>
          <ol className="mt-1.5 space-y-1.5">
            {proposal.milestones.map((m) => (
              <li key={`${m.title}-${m.weeks}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                <span className="font-medium text-gray-900">{m.title}</span>
                {m.weeks && <span className="ms-2 text-xs text-gray-500">{m.weeks}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Section title={t('meeting.proposal.assumptions')} items={proposal.assumptions} />
      <Section title={t('meeting.proposal.dependencies')} items={proposal.dependencies} />
      <Section title={t('meeting.proposal.risks')} items={proposal.risks} />

      <p className="mt-5 rounded-xl bg-purple-50 px-3 py-2 text-xs font-medium text-purple-800">
        {t('meeting.proposal.humanReviewRequired')}
      </p>
    </div>
  );
};

export default ProposalPanel;

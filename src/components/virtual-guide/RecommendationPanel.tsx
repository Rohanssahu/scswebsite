import React from 'react';
import { CalendarClock, DollarSign, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ESTIMATE_DISCLAIMER_KEY } from '@/data/guideEstimate';
import { formatNumber, formatUsd, valueKey } from '@/i18n/languageConfig';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import QuickReplies from './QuickReplies';

// Detailed demo-estimate panel. Opens over the conversation (Sheet handles
// focus trap + Escape) so the visitor never loses their chat context.
// Fully language-aware: labels and rule-generated content are i18n keys;
// amounts stay in USD (clearly labelled) formatted per locale — no conversion.

interface RecommendationPanelProps {
  guide: VirtualGuideApi;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-pink-600">{children}</h3>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="mt-1.5 space-y-1 text-sm text-gray-700">
    {items.map((item) => (
      <li key={item} className="flex gap-2">
        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-pink-500" aria-hidden="true" />
        {item}
      </li>
    ))}
  </ul>
);

const RecommendationPanel = ({ guide }: RecommendationPanelProps) => {
  const { t, i18n } = useTranslation();
  const e = guide.estimate;
  const lang = i18n.language;
  const usd = (n: number) => formatUsd(n, lang);
  const num = (n: number) => formatNumber(n, lang);

  return (
    <Sheet open={guide.resultsOpen} onOpenChange={guide.setResultsOpen}>
      <SheetContent side="right" className="z-[90] w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('guide.estimate.panelTitle')}</SheetTitle>
          <SheetDescription>{t(ESTIMATE_DISCLAIMER_KEY)}</SheetDescription>
        </SheetHeader>

        {!e ? (
          <p className="mt-6 text-sm text-gray-600">{t('guide.estimate.noEstimate')}</p>
        ) : (
          <div className="pb-6">
            {/* Key numbers */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <Users className="mx-auto h-4 w-4 text-pink-600" aria-hidden="true" />
                <p className="mt-1 text-lg font-bold text-gray-900">{num(e.totalHours)}h</p>
                <p className="text-[10px] text-gray-500">{t('guide.estimate.totalHours')}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <DollarSign className="mx-auto h-4 w-4 text-pink-600" aria-hidden="true" />
                <p className="mt-1 text-lg font-bold text-gray-900">{usd(e.totalCost)}</p>
                <p className="text-[10px] text-gray-500">{t('guide.estimate.estimatedCost')}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <CalendarClock className="mx-auto h-4 w-4 text-pink-600" aria-hidden="true" />
                <p className="mt-1 text-lg font-bold text-gray-900">{t('guide.estimate.weeksShort', { weeks: num(e.estimatedWeeks) })}</p>
                <p className="text-[10px] text-gray-500">{t('guide.estimate.capacity', { capacity: num(e.weeklyCapacityHours) })}</p>
              </div>
            </div>

            <SectionTitle>{t('guide.estimate.budgetFit')}</SectionTitle>
            <div className="mt-1.5 space-y-1.5 rounded-xl border border-pink-200 bg-pink-50/60 p-3">
              {e.budgetLines.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-gray-800">
                  {line}
                </p>
              ))}
            </div>

            <SectionTitle>{t('guide.estimate.requirementSummary')}</SectionTitle>
            <List items={e.summaryItems.map((it) => t(it.key, it.params))} />

            <SectionTitle>{t('guide.estimate.recommendedService')}</SectionTitle>
            <p className="mt-1.5 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">
                {t(`services.names.${valueKey(e.recommendedService)}`, { defaultValue: e.recommendedService })}
              </span>{' '}
              — {t('guide.estimate.suggestedStack')} {e.suggestedTech.join(', ')}.
            </p>

            <SectionTitle>{t('guide.estimate.teamHours')}</SectionTitle>
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                    <th scope="col" className="px-3 py-2 text-start font-medium">{t('guide.estimate.role')}</th>
                    <th scope="col" className="px-3 py-2 text-start font-medium">{t('guide.estimate.hours')}</th>
                    <th scope="col" className="px-3 py-2 text-start font-medium">{t('guide.estimate.rate')}</th>
                    <th scope="col" className="px-3 py-2 text-start font-medium">{t('guide.estimate.cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {e.team.map((r) => (
                    <tr key={r.role} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-900">{t(`roles.${valueKey(r.role)}`, { defaultValue: r.role })}</td>
                      <td className="px-3 py-2 text-gray-700">{num(r.hours)}h</td>
                      <td className="px-3 py-2 text-gray-700">{usd(r.hourlyRate)}/h</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{usd(r.hours * r.hourlyRate)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-gray-900">
                    <td className="px-3 py-2">{t('guide.estimate.total')}</td>
                    <td className="px-3 py-2">{num(e.totalHours)}h</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2">{usd(e.totalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SectionTitle>{t('guide.estimate.benefits')}</SectionTitle>
            <List items={e.benefits} />

            <SectionTitle>{t('guide.estimate.pros')}</SectionTitle>
            <List items={e.pros.map((k) => t(k, { defaultValue: k }))} />

            <SectionTitle>{t('guide.estimate.cons')}</SectionTitle>
            <List items={e.cons.map((k) => t(k, { defaultValue: k }))} />

            <SectionTitle>{t('guide.estimate.risks')}</SectionTitle>
            <List items={e.risks.map((k) => t(k, { defaultValue: k }))} />

            <SectionTitle>{t('guide.estimate.alternatives')}</SectionTitle>
            <List
              items={[
                `${t('guide.estimate.cheaperPrefix')} ${t(e.cheaperAlternative.key, e.cheaperAlternative.params)}`,
                `${t('guide.estimate.phasedPrefix')} ${t(e.phasedAlternative.key, e.phasedAlternative.params)}`,
              ]}
            />

            <SectionTitle>{t('guide.estimate.nextStep')}</SectionTitle>
            <p className="mt-1.5 text-sm text-gray-700">{t(e.recommendedNextStep.key, e.recommendedNextStep.params)}</p>

            <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              {t(ESTIMATE_DISCLAIMER_KEY)} {t('guide.estimate.demoNote')}
            </p>

            <QuickReplies
              className="mt-4"
              ariaLabel={t('guide.estimate.nextActions')}
              onAction={(a) => {
                guide.setResultsOpen(false);
                guide.runAction(a);
              }}
              actions={[
                { label: 'Edit requirements', kind: 'flow-edit' },
                { label: 'Continue to Contact', kind: 'contact-handoff' },
                { label: 'Open WhatsApp', kind: 'whatsapp' },
                { label: 'Schedule a Call', kind: 'schedule-handoff' },
                { label: 'Request Human Review', kind: 'contact-handoff' },
              ]}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default RecommendationPanel;

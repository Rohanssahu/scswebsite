import React from 'react';
import { CalendarClock, DollarSign, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ESTIMATE_DISCLAIMER } from '@/data/demoEstimate';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import QuickReplies from './QuickReplies';

// Detailed demo-estimate panel. Opens over the conversation (Sheet handles
// focus trap + Escape) so the visitor never loses their chat context.

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
  const e = guide.estimate;
  return (
    <Sheet open={guide.resultsOpen} onOpenChange={guide.setResultsOpen}>
      <SheetContent side="right" className="z-[90] w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Preliminary demo estimate</SheetTitle>
          <SheetDescription>{ESTIMATE_DISCLAIMER}</SheetDescription>
        </SheetHeader>

        {!e ? (
          <p className="mt-6 text-sm text-gray-600">
            No estimate yet — answer the requirement questions with the Virtual Guide and your breakdown appears here.
          </p>
        ) : (
          <div className="pb-6">
            {/* Key numbers */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <Users className="mx-auto h-4 w-4 text-pink-600" aria-hidden="true" />
                <p className="mt-1 text-lg font-bold text-gray-900">{e.totalHours}h</p>
                <p className="text-[10px] text-gray-500">Total hours</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <DollarSign className="mx-auto h-4 w-4 text-pink-600" aria-hidden="true" />
                <p className="mt-1 text-lg font-bold text-gray-900">${e.totalCost.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">Estimated cost</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <CalendarClock className="mx-auto h-4 w-4 text-pink-600" aria-hidden="true" />
                <p className="mt-1 text-lg font-bold text-gray-900">
                  ~{e.estimatedWeeks} wk{e.estimatedWeeks > 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-gray-500">{e.weeklyCapacityHours}h/week capacity</p>
              </div>
            </div>

            <SectionTitle>Requirement summary</SectionTitle>
            <List items={e.requirementSummary} />

            <SectionTitle>Recommended service & technology</SectionTitle>
            <p className="mt-1.5 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{e.recommendedService}</span> — suggested stack:{' '}
              {e.suggestedTech.join(', ')}.
            </p>

            <SectionTitle>Team & hours</SectionTitle>
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                    <th scope="col" className="px-3 py-2 font-medium">Role</th>
                    <th scope="col" className="px-3 py-2 font-medium">Hours</th>
                    <th scope="col" className="px-3 py-2 font-medium">Rate</th>
                    <th scope="col" className="px-3 py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {e.team.map((r) => (
                    <tr key={r.role} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-900">{r.role}</td>
                      <td className="px-3 py-2 text-gray-700">{r.hours}h</td>
                      <td className="px-3 py-2 text-gray-700">${r.hourlyRate}/h</td>
                      <td className="px-3 py-2 font-medium text-gray-900">${(r.hours * r.hourlyRate).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-gray-900">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2">{e.totalHours}h</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2">${e.totalCost.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SectionTitle>Benefits</SectionTitle>
            <List items={e.benefits} />

            <SectionTitle>Pros</SectionTitle>
            <List items={e.pros} />

            <SectionTitle>Cons</SectionTitle>
            <List items={e.cons} />

            <SectionTitle>Risks</SectionTitle>
            <List items={e.risks} />

            <SectionTitle>Alternatives</SectionTitle>
            <List items={[`Cheaper: ${e.cheaperAlternative}`, `Faster: ${e.fasterAlternative}`]} />

            <SectionTitle>Recommended next step</SectionTitle>
            <p className="mt-1.5 text-sm text-gray-700">{e.recommendedNextStep}</p>

            <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              {ESTIMATE_DISCLAIMER} This demo result is generated by frontend example rules — it is not a real code or
              requirement analysis.
            </p>

            <QuickReplies
              className="mt-4"
              ariaLabel="Next actions"
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

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pencil,
  Download,
  Share2,
  Sparkles,
  UserCheck,
  PhoneCall,
  Clock,
  DollarSign,
  CalendarRange,
  Gauge,
  CheckCircle2,
  ListChecks,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import HealthScore from '../components/estimation/HealthScore';
import TeamBreakdown from '../components/estimation/TeamBreakdown';
import MilestoneTimeline from '../components/estimation/MilestoneTimeline';
import IssueCards from '../components/estimation/IssueCards';
import SubmitRequirementDialog, { SubmitVariant } from '../components/estimation/SubmitRequirementDialog';
import { loadDraft, loadResult } from '@/lib/analysisStore';
import { downloadEstimateReport } from '@/lib/estimateReport';
import BudgetPlanPanel from '../components/estimation/BudgetPlanPanel';
import {
  AI_UNAVAILABLE_NOTICE,
  BASIC_ESTIMATE_DISCLAIMER,
  estimatedWeeks,
  sampleAnalysis,
  totalCost,
  totalHours,
} from '@/data/basicEstimate';
import { formatUsd, STANDARD_HOURLY_RATE_USD } from '@/policy/estimationPolicy';
import { openAssistant } from '@/components/ai-assistant/assistantBus';
import { useToast } from '@/hooks/use-toast';

const SectionCard = ({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 ${className}`}>
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
      {icon}
      {title}
    </h2>
    {children}
  </section>
);

const Bullets = ({ items, icon }: { items: string[]; icon?: React.ReactNode }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {icon ?? <CheckCircle2 className="h-4 w-4 text-pink-500" />}
        </span>
        {item}
      </li>
    ))}
  </ul>
);

const ProjectAnalysisResult = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const stored = useMemo(loadResult, []);
  const [isSample] = useState(!stored);
  const result = stored ?? sampleAnalysis();
  const draftAnswers = useMemo(() => loadDraft().answers, []);
  const [submitDialog, setSubmitDialog] = useState<SubmitVariant | null>(null);

  const hours = totalHours(result.team);
  const cost = totalCost(result.team);
  const weeks = estimatedWeeks(result.team, result.weeklyCapacityHours);

  // Saves the branded report: the same watermarked, company-labelled document
  // Buddy hands out, built from this stored result. Falls back to the browser's
  // own print view if an iframe cannot be opened.
  const downloadReport = () => {
    if (downloadEstimateReport(result)) return;
    toast({ title: 'Opening the print view instead', description: 'Choose "Save as PDF" to keep your report.' });
    window.print();
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?demo=1`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Demo link copied', description: 'Share URL copied to your clipboard.' });
    } catch {
      toast({ title: 'Could not copy automatically', description: url });
    }
  };

  const stats = [
    { icon: Clock, label: 'Total estimated hours', value: `${hours} h` },
    { icon: DollarSign, label: 'Preliminary total cost', value: formatUsd(cost) },
    { icon: Gauge, label: 'Standard rate', value: `up to ${formatUsd(STANDARD_HOURLY_RATE_USD)}/h` },
    { icon: CalendarRange, label: 'Estimated duration', value: `≈ ${weeks} week${weeks > 1 ? 's' : ''}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      <main className="container mx-auto px-4 py-10 sm:py-14 print-area">
        {/* Title + actions */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
                result.source === 'ai'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-amber-300 bg-amber-50 text-amber-700'
              }`}
            >
              {result.source === 'ai'
                ? 'AI analysis — preliminary, requires human review'
                : 'Basic estimate — calculated from your answers, not an AI analysis'}
            </span>
            {result.aiUnavailable && (
              <p className="mt-2 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {AI_UNAVAILABLE_NOTICE}
              </p>
            )}
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Your project <span className="text-gradient-ai">analysis dashboard</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              {isSample
                ? 'No submission found — showing a sample estimate. Run the analysis flow to generate your own.'
                : `Generated from your ${result.mode === 'new' ? 'new project idea' : 'existing project details'}.`}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/project-analysis')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit requirements
            </button>
            <button
              type="button"
              onClick={downloadReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Download report (PDF)
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" /> Share
            </button>
            <Link
              to="/schedule-call"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:scale-[1.02] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" /> Schedule a Call
            </Link>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <s.icon className="h-5 w-5 text-pink-600" aria-hidden="true" />
              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            <Reveal>
              <SectionCard
                title="Your budget and what it covers"
                icon={<DollarSign className="h-5 w-5 text-pink-600" aria-hidden="true" />}
              >
                <BudgetPlanPanel plan={result.budgetPlan} narrative={result.planNarrative} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Project health" icon={<Gauge className="h-5 w-5 text-pink-600" aria-hidden="true" />}>
                <HealthScore score={result.healthScore} riskLevel={result.riskLevel} mode={result.mode} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard
                title="Requirement summary"
                icon={<ListChecks className="h-5 w-5 text-pink-600" aria-hidden="true" />}
              >
                <Bullets items={result.requirementSummary} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Problems detected" icon={<Sparkles className="h-5 w-5 text-pink-600" aria-hidden="true" />}>
                <IssueCards issues={result.problemsDetected} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard
                title="Recommended team & cost breakdown"
                icon={<UserCheck className="h-5 w-5 text-pink-600" aria-hidden="true" />}
              >
                <TeamBreakdown team={result.team} />
                <p className="mt-3 text-xs text-gray-500">
                  Every role is billed at our standard rate of up to {formatUsd(STANDARD_HOURLY_RATE_USD)} per hour, and
                  these hours add up to exactly the {formatUsd(cost)} budget-fit total above ·{' '}
                  {result.weeklyCapacityHours}h maximum weekly capacity → ≈ {weeks} week{weeks > 1 ? 's' : ''} delivery.
                </p>
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard
                title="Suggested milestones"
                icon={<CalendarRange className="h-5 w-5 text-pink-600" aria-hidden="true" />}
              >
                <MilestoneTimeline milestones={result.milestones} />
              </SectionCard>
            </Reveal>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Reveal>
              <SectionCard title="What currently works">
                <Bullets items={result.currentlyWorking} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Requested requirements">
                <Bullets
                  items={result.missingFeatures}
                  icon={<ArrowRight className="h-4 w-4 text-purple-500" />}
                />
                {result.budgetPlan.base.deferredScope.length > 0 && (
                  <p className="mt-3 text-xs text-gray-500">
                    {result.budgetPlan.base.deferredScope.length} of these fall outside the selected budget and are
                    listed as deferred above. They are not included in the preliminary total.
                  </p>
                )}
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Recommended solution" icon={<Lightbulb className="h-5 w-5 text-pink-600" aria-hidden="true" />}>
                <Bullets items={result.recommendedSolution} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Assumptions">
                <Bullets items={result.assumptions} icon={<ShieldCheck className="h-4 w-4 text-gray-500" />} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Why SCS Softwares">
                <Bullets items={result.benefits} />
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard title="Next steps">
                <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
                  {result.nextSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <div className="no-print mt-5 flex flex-col gap-2">
                  {!isSample && (
                    <button
                      type="button"
                      onClick={() => setSubmitDialog('project_requirement')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Submit Requirement to SCS
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openAssistant('estimate')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-300 bg-pink-50 px-4 py-2.5 text-sm font-medium text-pink-700 hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Ask AI About This Estimate
                  </button>
                  {isSample ? (
                    <Link
                      to="/contact"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      <UserCheck className="h-4 w-4" aria-hidden="true" /> Request Human Review
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubmitDialog('human_review')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      <UserCheck className="h-4 w-4" aria-hidden="true" /> Request Human Review
                    </button>
                  )}
                  <Link
                    to="/schedule-call"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    <PhoneCall className="h-4 w-4" aria-hidden="true" /> Schedule a Call
                  </Link>
                </div>
              </SectionCard>
            </Reveal>
          </div>
        </div>

        <p className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
          {BASIC_ESTIMATE_DISCLAIMER}
        </p>

        {submitDialog && !isSample && (
          <SubmitRequirementDialog
            variant={submitDialog}
            open
            onClose={() => setSubmitDialog(null)}
            result={result}
            answers={draftAnswers}
          />
        )}
      </main>

      </main>

      <Footer />
    </div>
  );
};

export default ProjectAnalysisResult;

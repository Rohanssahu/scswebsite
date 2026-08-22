import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ModeSelection from '../components/project-analysis/ModeSelection';
import ChatFlow from '../components/project-analysis/ChatFlow';
import ManualFlow from '../components/project-analysis/ManualFlow';
import AnalysisProgress from '../components/project-analysis/AnalysisProgress';
import { AnalysisDraft, AnalysisResult, EntryMethod, ProjectMode } from '@/types/projectAnalysis';
import { clearDraft, hasDraftAnswers, loadDraft, saveDraft, saveResult } from '@/lib/analysisStore';
import { buildDemoAnalysis } from '@/data/demoAnalysis';
import { generateAiAnalysis, isAiAnalysisReady } from '@/services/aiAnalysis';
import { trackConversion } from '@/utils/conversionAnalytics';

type Phase = 'select' | 'entry' | 'analyzing';

const ProjectAnalysis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState<AnalysisDraft>(() => {
    let draft = loadDraft();
    const urlMode = searchParams.get('mode');
    const urlMethod = searchParams.get('method');
    if ((urlMode === 'new' || urlMode === 'existing') && draft.mode !== urlMode) {
      // Explicit mode in the URL starts that flow fresh (answers belong to a mode).
      draft = { ...draft, mode: urlMode, method: null, answers: {}, files: [] };
    }
    if (urlMethod === 'ai' || urlMethod === 'manual') {
      draft = { ...draft, method: urlMethod };
    }
    return draft;
  });
  const [phase, setPhase] = useState<Phase>('select');
  const [restoredNotice, setRestoredNotice] = useState(() => hasDraftAnswers(loadDraft()));

  // Persist every change so switching modes or reloading never loses data.
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  // Re-apply URL params when they change without a remount (e.g. assistant
  // navigation while already on this page).
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const urlMethod = searchParams.get('method');
    setDraft((d) => {
      let next = d;
      if ((urlMode === 'new' || urlMode === 'existing') && d.mode !== urlMode) {
        next = { ...next, mode: urlMode, method: null, answers: {}, files: [] };
      }
      if ((urlMethod === 'ai' || urlMethod === 'manual') && next.method !== urlMethod) {
        next = { ...next, method: urlMethod };
      }
      return next;
    });
    setPhase('select');
  }, [searchParams]);

  useEffect(() => {
    if (restoredNotice) {
      const t = setTimeout(() => setRestoredNotice(false), 6000);
      return () => clearTimeout(t);
    }
  }, [restoredNotice]);

  const startOver = () => {
    clearDraft();
    setDraft({ mode: null, method: null, answers: {}, files: [], updatedAt: new Date().toISOString() });
    setPhase('select');
  };

  // Real AI analysis runs alongside the progress animation. `aiPending` keeps
  // the animation holding on its last step until the AI responds; the result
  // ref avoids stale closures when finishAnalysis fires.
  const aiResultRef = useRef<AnalysisResult | null>(null);
  const [aiPending, setAiPending] = useState(false);

  const generate = () => {
    setPhase('analyzing');
    aiResultRef.current = null;
    if (draft.mode && isAiAnalysisReady) {
      setAiPending(true);
      generateAiAnalysis(draft.mode, draft.answers, draft.files)
        .then((result) => {
          aiResultRef.current = result;
        })
        .catch(() => {
          aiResultRef.current = null; // fall back to the local engine below
        })
        .finally(() => setAiPending(false));
    }
  };

  const finishAnalysis = () => {
    if (!draft.mode) return;
    const result =
      aiResultRef.current ?? { ...buildDemoAnalysis(draft.mode, draft.answers), source: 'demo' as const };
    saveResult(result);
    // Which engine produced it is the only detail reported: 'ai' or 'demo'.
    trackConversion('project_analysis_completed', result.source === 'ai' ? 'ai' : 'demo');
    navigate('/project-analysis/result');
  };

  const showEntry = phase !== 'analyzing' && draft.mode && draft.method;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      <main className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-pink-200/50 blur-3xl"
          aria-hidden="true"
        />

        <div className="container relative mx-auto px-4 py-12 sm:py-16">
          {phase === 'analyzing' ? (
            <AnalysisProgress onComplete={finishAnalysis} ready={!aiPending} ai={isAiAnalysisReady} />
          ) : showEntry ? (
            <div>
              <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-2 text-sm">
                <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-gray-700">
                  {draft.mode === 'new' ? 'New project' : 'Existing project'} ·{' '}
                  {draft.method === 'ai' ? (isAiAnalysisReady ? 'AI assistant' : 'AI assistant (demo)') : 'Manual form'}
                </span>
                <button
                  type="button"
                  onClick={startOver}
                  className="text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
                >
                  Start over
                </button>
              </div>

              {draft.method === 'ai' ? (
                <ChatFlow
                  mode={draft.mode as ProjectMode}
                  answers={draft.answers}
                  files={draft.files}
                  onAnswersChange={(answers) => setDraft((d) => ({ ...d, answers }))}
                  onFilesChange={(files) => setDraft((d) => ({ ...d, files }))}
                  onSwitchToManual={() => setDraft((d) => ({ ...d, method: 'manual' as EntryMethod }))}
                  onGenerate={generate}
                />
              ) : (
                <ManualFlow
                  mode={draft.mode as ProjectMode}
                  answers={draft.answers}
                  files={draft.files}
                  onAnswersChange={(answers) => setDraft((d) => ({ ...d, answers }))}
                  onFilesChange={(files) => setDraft((d) => ({ ...d, files }))}
                  onSwitchToChat={() => setDraft((d) => ({ ...d, method: 'ai' as EntryMethod }))}
                  onGenerate={generate}
                />
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {restoredNotice && hasDraftAnswers(draft) && (
                <p
                  role="status"
                  className="mx-auto mb-6 max-w-md rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700"
                >
                  Welcome back — your saved draft was restored.
                </p>
              )}
              <ModeSelection
                mode={draft.mode}
                onSelectMode={(mode) =>
                  setDraft((d) => ({ ...d, mode, answers: d.mode === mode ? d.answers : {}, files: d.mode === mode ? d.files : [] }))
                }
                onSelectMethod={(method) => setDraft((d) => ({ ...d, method }))}
                onBack={() => setDraft((d) => ({ ...d, mode: null }))}
              />
              <p className="mt-10 text-center text-xs text-gray-400">
                {isAiAnalysisReady
                  ? 'AI-assisted analysis — estimates are generated from your answers and documents. The final quote follows a review call.'
                  : 'Demo analysis — estimates are generated with example logic in your browser. No data leaves this page.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* The analyser itself is one of the AI systems we build for clients. */}
      <section className="border-t border-gray-200 py-10">
        <div className="container mx-auto px-4 text-center">
          <p className="mx-auto max-w-2xl text-sm text-gray-600">
            This analyser is an example of the requirement-analysis systems we build for clients.{' '}
            <Link
              to="/services/ai-development"
              className="rounded font-medium text-pink-700 underline underline-offset-4 transition-colors hover:text-pink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              See our AI development service
            </Link>
            .
          </p>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
};

export default ProjectAnalysis;

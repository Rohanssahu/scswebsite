import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, MessageSquare, Plus, X } from 'lucide-react';
import { getQuestions } from '@/data/analysisQuestions';
import { AnswerMap, ProjectMode, UploadedFileMeta } from '@/types/projectAnalysis';
import FileDropzone from './FileDropzone';
import { extractFromDocument, isAiAnalysisReady, isReadableDocument, readDocument } from '@/services/aiAnalysis';

interface ManualFlowProps {
  mode: ProjectMode;
  answers: AnswerMap;
  files: UploadedFileMeta[];
  onAnswersChange: (answers: AnswerMap) => void;
  onFilesChange: (files: UploadedFileMeta[]) => void;
  onSwitchToChat: () => void;
  onGenerate: () => void;
}

const ManualFlow = ({
  mode,
  answers,
  files,
  onAnswersChange,
  onFilesChange,
  onSwitchToChat,
  onGenerate,
}: ManualFlowProps) => {
  const questions = useMemo(() => getQuestions(mode), [mode]);
  const totalSteps = questions.length + 1; // final step = attachments & review
  const reduceMotion = useReducedMotion();

  const firstUnanswered = questions.findIndex((q) => answers[q.id] === undefined && !q.optional);
  const [step, setStep] = useState(firstUnanswered === -1 ? 0 : firstUnanswered);
  const [error, setError] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState('');

  useEffect(() => {
    setCustomDraft('');
  }, [step]);

  const isReviewStep = step === questions.length;
  const question = isReviewStep ? null : questions[step];

  const valueOf = (id: string) => answers[id];

  const validate = (): boolean => {
    if (!question || question.optional) return true;
    const value = valueOf(question.id);
    const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      setError('Please answer this question before continuing (or use Skip on optional steps).');
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const setAnswer = (value: string | string[]) => {
    if (!question) return;
    setError(null);
    onAnswersChange({ ...answers, [question.id]: value });
  };

  // Read added documents with AI: attach a content summary for the analysis
  // and auto-fill any questions the visitor has not answered yet. Failures are
  // silent — the file stays attached as name/size only.
  const [docStatus, setDocStatus] = useState<string | null>(null);

  const handleRawFiles = async (raw: File[]) => {
    const fresh = raw.slice(0, 5 - files.length);
    if (!fresh.length) return;
    let currentFiles = [...files, ...fresh.map((f) => ({ name: f.name, size: f.size }))].slice(0, 5);
    onFilesChange(currentFiles);
    if (!isAiAnalysisReady) return;
    let currentAnswers = { ...answers };
    for (const file of fresh) {
      if (!isReadableDocument(file)) continue;
      setDocStatus(`Reading "${file.name}" with AI…`);
      try {
        const doc = await readDocument(file);
        const { answers: extracted, docSummary } = await extractFromDocument(mode, doc);
        currentFiles = currentFiles.map((f) => (f.name === file.name ? { ...f, text: docSummary } : f));
        onFilesChange(currentFiles);
        let filled = 0;
        for (const q of questions) {
          const value = currentAnswers[q.id];
          const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
          if (empty && extracted[q.id] !== undefined) {
            currentAnswers = { ...currentAnswers, [q.id]: extracted[q.id] };
            filled += 1;
          }
        }
        if (filled > 0) onAnswersChange(currentAnswers);
        setDocStatus(
          filled > 0
            ? `Read "${file.name}" and auto-filled ${filled} unanswered question${filled === 1 ? '' : 's'}.`
            : `Read "${file.name}" — its content will be used in the analysis.`,
        );
      } catch {
        setDocStatus(`Couldn't read "${file.name}" — it stays attached as a reference.`);
      }
    }
  };

  // Free-typed value for multi-selects where no predefined option fits.
  const addCustomToMulti = () => {
    if (!question) return;
    const value = customDraft.trim();
    if (!value) return;
    const currentValue = (valueOf(question.id) as string[]) ?? [];
    if (!currentValue.some((o) => o.toLowerCase() === value.toLowerCase())) {
      setAnswer([...currentValue, value]);
    }
    setCustomDraft('');
  };

  return (
    <div className="glow-card mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'new' ? 'New project requirements' : 'Existing project details'}
          </h2>
          <p className="text-xs text-gray-500">Draft saved automatically in your browser</p>
        </div>
        <button
          type="button"
          onClick={onSwitchToChat}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Use AI assistant
        </button>
      </div>

      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <li key={i} className="flex-1">
            <button
              type="button"
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => i < step && setStep(i)}
              className={`h-1.5 w-full rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                i < step
                  ? 'bg-pink-500'
                  : i === step
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500'
                    : 'bg-gray-200'
              }`}
            />
          </li>
        ))}
      </ol>

      <motion.div
        key={step}
        initial={reduceMotion ? false : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        {question ? (
          <fieldset>
            <legend className="text-xl font-semibold text-gray-900">
              {question.chatPrompt}
              {question.optional && <span className="ml-2 text-xs font-normal text-gray-500">(optional)</span>}
            </legend>

            <div className="mt-5">
              {question.type === 'text' && (
                <input
                  value={(valueOf(question.id) as string) ?? ''}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={question.placeholder}
                  aria-label={question.label}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
                />
              )}
              {question.type === 'textarea' && (
                <textarea
                  value={(valueOf(question.id) as string) ?? ''}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={question.placeholder}
                  aria-label={question.label}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
                />
              )}
              {question.type === 'single' && question.options && (
                <div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((opt) => {
                      const selected = valueOf(question.id) === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setAnswer(opt)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                            selected
                              ? 'border-pink-500 bg-pink-50 text-gray-900'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            {opt}
                            {selected && <Check className="h-4 w-4 text-pink-600" aria-hidden="true" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {question.allowCustom && (
                    <input
                      value={
                        question.options.includes(valueOf(question.id) as string)
                          ? ''
                          : ((valueOf(question.id) as string) ?? '')
                      }
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={question.customPlaceholder ?? 'Or type your own…'}
                      aria-label={`${question.label} — type your own`}
                      className="mt-3 w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
                    />
                  )}
                </div>
              )}
              {question.type === 'multi' && question.options && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((opt) => {
                      const currentValue = (valueOf(question.id) as string[]) ?? [];
                      const selected = currentValue.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setAnswer(selected ? currentValue.filter((o) => o !== opt) : [...currentValue, opt])
                          }
                          className={`rounded-full border px-3.5 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                            selected
                              ? 'border-pink-500 bg-pink-100 text-gray-900'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {((valueOf(question.id) as string[]) ?? [])
                      .filter((opt) => !question.options!.includes(opt))
                      .map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed
                          onClick={() =>
                            setAnswer(((valueOf(question.id) as string[]) ?? []).filter((o) => o !== opt))
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-pink-500 bg-pink-100 px-3.5 py-2 text-sm text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        >
                          {opt}
                          <X className="h-3.5 w-3.5 text-pink-600" aria-hidden="true" />
                        </button>
                      ))}
                  </div>
                  {question.allowCustom && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={customDraft}
                        onChange={(e) => setCustomDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomToMulti();
                          }
                        }}
                        placeholder={question.customPlaceholder ?? 'Or type your own…'}
                        aria-label={`${question.label} — type your own`}
                        className="w-full max-w-xs rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={!customDraft.trim()}
                        onClick={addCustomToMulti}
                        aria-label="Add your answer"
                        className="rounded-full border border-gray-300 p-2.5 text-gray-600 hover:border-pink-400 hover:text-gray-900 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </fieldset>
        ) : (
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Attachments & review</h3>
            <p className="mt-1 text-sm text-gray-600">
              Optionally add reference documents, then generate your demo analysis.
            </p>
            <div className="mt-5">
              <FileDropzone
                files={files}
                onChange={onFilesChange}
                onRawFiles={isAiAnalysisReady ? handleRawFiles : undefined}
                aiEnabled={isAiAnalysisReady}
              />
              {docStatus && (
                <p role="status" className="mt-2 text-xs text-pink-700">
                  {docStatus}
                </p>
              )}
            </div>
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-900">Your answers</h4>
              <dl className="mt-3 space-y-2 text-sm">
                {questions.map((q) => (
                  <div key={q.id} className="flex flex-col sm:flex-row sm:gap-3">
                    <dt className="w-44 shrink-0 text-gray-500">{q.label}</dt>
                    <dd className="text-gray-700">
                      {answers[q.id] === undefined || answers[q.id] === '' || answers[q.id] === '(skipped)' ? (
                        <em className="text-gray-400">Not provided</em>
                      ) : Array.isArray(answers[q.id]) ? (
                        (answers[q.id] as string[]).join(', ')
                      ) : (
                        (answers[q.id] as string)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>

        {isReviewStep ? (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />{' '}
            {isAiAnalysisReady ? 'Generate AI Analysis' : 'Generate Demo Analysis'}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ManualFlow;

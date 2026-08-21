import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Send, ArrowLeft, SkipForward, ClipboardList, Sparkles, Plus, X, Paperclip, FileText } from 'lucide-react';
import { getQuestions } from '@/data/analysisQuestions';
import { AnswerMap, AnswerValue, ProjectMode, UploadedFileMeta } from '@/types/projectAnalysis';
import {
  documentContextFor,
  extractFromDocument,
  extractionChatNotice,
  isAiAnalysisReady,
  readDocument,
  UnsupportedDocumentError,
} from '@/services/aiAnalysis';

interface ChatFlowProps {
  mode: ProjectMode;
  answers: AnswerMap;
  files: UploadedFileMeta[];
  onAnswersChange: (answers: AnswerMap) => void;
  onFilesChange: (files: UploadedFileMeta[]) => void;
  onSwitchToManual: () => void;
  onGenerate: () => void;
}

const SKIPPED = '(skipped)';

function displayValue(value: AnswerValue): string {
  return Array.isArray(value) ? value.join(', ') : value;
}

const TypingDots = () => (
  <span className="inline-flex gap-1" aria-label="Assistant is typing">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-pink-500"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </span>
);

type DocStage = 'ask' | 'reading' | 'done';

const ChatFlow = ({ mode, answers, files, onAnswersChange, onFilesChange, onSwitchToManual, onGenerate }: ChatFlowProps) => {
  const questions = useMemo(() => getQuestions(mode), [mode]);
  const reduceMotion = useReducedMotion();

  // Resume where the visitor left off: first unanswered question.
  const firstUnanswered = questions.findIndex((q) => answers[q.id] === undefined);
  const [index, setIndex] = useState(firstUnanswered === -1 ? questions.length : firstUnanswered);
  const [typing, setTyping] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  // Document intake: offered once at the start so answers can be auto-filled.
  const [docStage, setDocStage] = useState<DocStage>(() =>
    isAiAnalysisReady && firstUnanswered <= 0 && files.length === 0 ? 'ask' : 'done',
  );
  const [docNotice, setDocNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const current = index < questions.length ? questions[index] : null;
  const done = index >= questions.length;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  // Show a short typing indicator whenever a new question appears.
  useEffect(() => {
    setTyping(true);
    setTextInput('');
    setMultiDraft([]);
    setCustomInput('');
    const t = setTimeout(() => setTyping(false), reduceMotion ? 100 : 750);
    return () => clearTimeout(t);
  }, [index, docStage, reduceMotion]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [index, typing, multiDraft, docStage, docNotice, reduceMotion]);

  useEffect(() => {
    if (!typing && docStage === 'done' && current && (current.type === 'text' || current.type === 'textarea')) {
      inputRef.current?.focus();
    }
  }, [typing, current, docStage]);

  const submitAnswer = (value: AnswerValue) => {
    if (!current) return;
    onAnswersChange({ ...answers, [current.id]: value });
    setIndex(index + 1);
  };

  const goBack = () => {
    if (index === 0) return;
    const prev = questions[Math.min(index, questions.length) - 1];
    const next = { ...answers };
    delete next[prev.id];
    onAnswersChange(next);
    setIndex(Math.min(index, questions.length) - 1);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    submitAnswer(textInput.trim());
  };

  // Read the uploaded document, let the AI auto-fill answers, then resume the
  // questionnaire at the first question that is still missing. Any failure
  // falls through to the normal question flow — the visitor is never blocked.
  const handleDocFile = async (file: File | null | undefined) => {
    if (!file) return;
    setDocStage('reading');
    try {
      const doc = await readDocument(file);
      const extraction = await extractFromDocument(mode, doc);
      const valid: AnswerMap = {};
      for (const q of questions) {
        if (extraction.answers[q.id] !== undefined) valid[q.id] = extraction.answers[q.id];
      }
      const merged = { ...answers, ...valid };
      onAnswersChange(merged);
      // Only carry the document forward when something was actually understood.
      const documentContext = documentContextFor(extraction);
      onFilesChange(
        [
          ...files.filter((f) => f.name !== file.name),
          { name: file.name, size: file.size, text: documentContext || undefined },
        ].slice(0, 5),
      );
      const nextIdx = questions.findIndex((q) => merged[q.id] === undefined);
      setIndex(nextIdx === -1 ? questions.length : nextIdx);
      setDocNotice(extractionChatNotice(file.name, Object.keys(valid).length, extraction.status));
    } catch (e) {
      setDocNotice(
        e instanceof UnsupportedDocumentError
          ? `${e.message}. No problem — let's continue with the questions instead.`
          : "I couldn't read that document right now. No problem — let's continue with the questions instead.",
      );
    } finally {
      setDocStage('done');
    }
  };

  // Free-typed value for questions where no predefined option fits:
  // single-choice submits immediately, multi-choice joins the draft as a chip.
  const addCustomValue = (e: React.FormEvent) => {
    e.preventDefault();
    const value = customInput.trim();
    if (!value || !current) return;
    if (current.type === 'single') {
      submitAnswer(value);
      return;
    }
    if (!multiDraft.some((o) => o.toLowerCase() === value.toLowerCase())) {
      setMultiDraft([...multiDraft, value]);
    }
    setCustomInput('');
  };

  return (
    <div className="glow-card mx-auto flex h-[600px] max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
            <Bot className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">SCS Project Assistant</p>
            <p className="text-xs text-gray-500">
              {isAiAnalysisReady ? 'AI-assisted — reads your documents & analyzes your answers' : 'Demo — scripted questions, no live AI'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Use form instead
        </button>
      </div>

      {/* Progress */}
      <div className="border-b border-gray-200 px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Question {Math.min(index + 1, questions.length)} of {questions.length}
          </span>
          <span>{Math.round((answeredCount / questions.length) * 100)}% complete</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
            animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
          />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        {docNotice && docStage === 'done' && (
          <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-tl-sm border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm text-gray-700">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
            <span>{docNotice}</span>
          </div>
        )}
        {questions.slice(0, Math.min(index, questions.length)).map((q) => (
          <div key={q.id} className="space-y-2">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
              {q.chatPrompt}
            </div>
            {answers[q.id] !== undefined && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm text-white">
                  {displayValue(answers[q.id]) === SKIPPED ? (
                    <em className="opacity-80">Skipped</em>
                  ) : (
                    displayValue(answers[q.id])
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <AnimatePresence mode="wait">
          {typing ? (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-3"
            >
              <TypingDots />
            </motion.div>
          ) : docStage !== 'done' ? (
            <motion.div
              key={`doc-${docStage}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {docStage === 'ask' ? (
                <>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                    {mode === 'new'
                      ? 'Before we start — do you have a requirements document (PDF, TXT, MD…)? Upload it and I will read it, auto-fill your answers and only ask what is missing.'
                      : 'Before we start — do you have any project documents (requirements, specs, notes — PDF, TXT, MD…)? Upload one and I will read it, auto-fill your answers and only ask what is missing.'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-1.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Upload document
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocStage('done')}
                      className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      No document — ask me questions
                    </button>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.markdown,.csv,.json,.html,.htm,.rtf,.xml,.yml,.yaml"
                      className="hidden"
                      onChange={(e) => {
                        handleDocFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="inline-flex max-w-[85%] items-center gap-3 rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                  <TypingDots />
                  Reading your document with AI — this takes a few seconds…
                </div>
              )}
            </motion.div>
          ) : current ? (
            <motion.div
              key={current.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                {current.chatPrompt}
                {current.hint && <p className="mt-1 text-xs text-gray-500">{current.hint}</p>}
              </div>

              {(current.type === 'single' || current.type === 'multi') && current.options && (
                <div className="space-y-2">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Quick replies">
                  {current.options.map((opt) => {
                    const selected = multiDraft.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={current.type === 'multi' ? selected : undefined}
                        onClick={() => {
                          if (current.type === 'single') {
                            submitAnswer(opt);
                          } else {
                            setMultiDraft(selected ? multiDraft.filter((o) => o !== opt) : [...multiDraft, opt]);
                          }
                        }}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                          selected
                            ? 'border-pink-500 bg-pink-100 text-gray-900'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400 hover:text-gray-900'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {current.type === 'multi' &&
                    multiDraft
                      .filter((opt) => !current.options!.includes(opt))
                      .map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed
                          onClick={() => setMultiDraft(multiDraft.filter((o) => o !== opt))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-pink-500 bg-pink-100 px-3 py-1.5 text-sm text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        >
                          {opt}
                          <X className="h-3.5 w-3.5 text-pink-600" aria-hidden="true" />
                        </button>
                      ))}
                  {current.type === 'multi' && (
                    <button
                      type="button"
                      disabled={multiDraft.length === 0}
                      onClick={() => submitAnswer(multiDraft)}
                      className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      Confirm selection
                    </button>
                  )}
                </div>
                {current.allowCustom && (
                  <form onSubmit={addCustomValue} className="flex items-center gap-2">
                    <input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={current.customPlaceholder ?? 'Or type your own…'}
                      aria-label="Type your own answer"
                      className="w-full max-w-xs rounded-full border border-dashed border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!customInput.trim()}
                      aria-label={current.type === 'multi' ? 'Add your answer' : 'Send your answer'}
                      className="rounded-full border border-gray-300 p-2 text-gray-600 hover:border-pink-400 hover:text-gray-900 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      {current.type === 'multi' ? (
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </form>
                )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                {isAiAnalysisReady
                  ? 'That\'s everything I need! Generate your AI analysis to see the recommended team, hours, cost and timeline tailored to your project.'
                  : 'That\'s everything I need! Generate your demo analysis to see the recommended team, hours, cost and timeline.'}
              </div>
              <button
                type="button"
                onClick={onGenerate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />{' '}
                {isAiAnalysisReady ? 'Generate AI Analysis' : 'Generate Demo Analysis'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
        {current && !typing && docStage === 'done' && (current.type === 'text' || current.type === 'textarea') && (
          <form onSubmit={handleTextSubmit} className="flex items-end gap-2">
            {current.type === 'textarea' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (textInput.trim()) submitAnswer(textInput.trim());
                  }
                }}
                rows={2}
                placeholder={current.placeholder ?? 'Type your answer…'}
                aria-label={current.label}
                className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={current.placeholder ?? 'Type your answer…'}
                aria-label={current.label}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
              />
            )}
            <button
              type="submit"
              disabled={!textInput.trim()}
              aria-label="Send answer"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-2.5 text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        <div className="mt-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back / edit answer
          </button>
          {current?.optional && !typing && (
            <button
              type="button"
              onClick={() => submitAnswer(SKIPPED)}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
            >
              Skip <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatFlow;

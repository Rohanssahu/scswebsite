import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Send, ArrowLeft, SkipForward, ClipboardList, Sparkles } from 'lucide-react';
import { getQuestions } from '@/data/analysisQuestions';
import { AnswerMap, AnswerValue, ProjectMode } from '@/types/projectAnalysis';

interface ChatFlowProps {
  mode: ProjectMode;
  answers: AnswerMap;
  onAnswersChange: (answers: AnswerMap) => void;
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

const ChatFlow = ({ mode, answers, onAnswersChange, onSwitchToManual, onGenerate }: ChatFlowProps) => {
  const questions = useMemo(() => getQuestions(mode), [mode]);
  const reduceMotion = useReducedMotion();

  // Resume where the visitor left off: first unanswered question.
  const firstUnanswered = questions.findIndex((q) => answers[q.id] === undefined);
  const [index, setIndex] = useState(firstUnanswered === -1 ? questions.length : firstUnanswered);
  const [typing, setTyping] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const current = index < questions.length ? questions[index] : null;
  const done = index >= questions.length;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  // Show a short typing indicator whenever a new question appears.
  useEffect(() => {
    setTyping(true);
    setTextInput('');
    setMultiDraft([]);
    const t = setTimeout(() => setTyping(false), reduceMotion ? 100 : 750);
    return () => clearTimeout(t);
  }, [index, reduceMotion]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [index, typing, multiDraft, reduceMotion]);

  useEffect(() => {
    if (!typing && current && (current.type === 'text' || current.type === 'textarea')) {
      inputRef.current?.focus();
    }
  }, [typing, current]);

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
            <p className="text-xs text-gray-500">Demo — scripted questions, no live AI</p>
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
                That's everything I need! Generate your demo analysis to see the recommended team, hours, cost and
                timeline.
              </div>
              <button
                type="button"
                onClick={onGenerate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate Demo Analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
        {current && !typing && (current.type === 'text' || current.type === 'textarea') && (
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

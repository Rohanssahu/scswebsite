import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import DemoAnalysis from './DemoAnalysis';
import GuideMessage from './GuideMessage';
import QuickReplies from './QuickReplies';
import RequirementFlow from './RequirementFlow';

// Chat panel: message history, route-aware quick replies, requirement flow,
// inline demo analysis and the always-available text composer with optional mic.

interface GuideChatProps {
  guide: VirtualGuideApi;
}

const TypingDots = () => {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl rounded-ss-sm border border-gray-200 bg-gray-100 px-4 py-3" aria-label={t('guide.chat.typing')}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-pink-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
};

const GuideChat = ({ guide }: GuideChatProps) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyzing = guide.flow?.status === 'analyzing';
  const lastGuideMessageId = [...guide.messages].reverse().find((m) => m.from === 'guide')?.id;
  const q = guide.currentQuestion;
  const qBase = guide.flow ? `questions.${guide.flow.mode}` : '';

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: guide.reduceMotion ? 'auto' : 'smooth',
    });
  }, [guide.messages, guide.typing, analyzing, guide.reduceMotion]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    guide.sendMessage(text);
  };

  const placeholder = q
    ? q.placeholder
      ? t(`${qBase}.${q.id}.placeholder`, { defaultValue: q.placeholder })
      : t('guide.chat.inputAnswer')
    : t('guide.chat.inputDefault');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3" aria-live="polite">
        {guide.messages.map((m) => (
          <GuideMessage key={m.id} message={m} onAction={guide.runAction} actionsEnabled={m.id === lastGuideMessageId || m.actions?.length === 0} />
        ))}
        {analyzing && <DemoAnalysis onComplete={guide.completeAnalysis} reduceMotion={guide.reduceMotion} />}
        {guide.typing && <TypingDots />}
      </div>

      {/* Route-aware suggestions (hidden while a flow question is pending) */}
      {!q && !analyzing && (
        <div className="border-t border-gray-100 px-3.5 py-2">
          <QuickReplies actions={guide.quickActions} onAction={guide.runAction} ariaLabel={t('guide.chat.suggestedActions')} />
        </div>
      )}

      <RequirementFlow guide={guide} />

      <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-gray-200 px-3 py-2.5">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label={q ? t(`${qBase}.${q.id}.label`, { defaultValue: q.label }) : t('guide.chat.inputLabel')}
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
        />
        {guide.recognition.supported && (
          <button
            type="button"
            onClick={guide.recognition.listening ? guide.recognition.stop : guide.recognition.start}
            aria-label={guide.recognition.listening ? t('guide.chat.micStop') : t('guide.chat.micStart')}
            aria-pressed={guide.recognition.listening}
            title={guide.recognition.listening ? t('guide.chat.micTitleStop') : t('guide.chat.micTitleStart')}
            className={`min-h-11 min-w-11 rounded-xl p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
              guide.recognition.listening
                ? 'bg-emerald-500 text-white'
                : 'border border-gray-300 text-gray-500 hover:border-pink-400 hover:text-gray-900'
            }`}
          >
            {guide.recognition.listening ? <MicOff className="mx-auto h-4 w-4" aria-hidden="true" /> : <Mic className="mx-auto h-4 w-4" aria-hidden="true" />}
          </button>
        )}
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label={t('guide.chat.send')}
          className="min-h-11 min-w-11 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-2.5 text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <Send className="mx-auto h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </form>
      {guide.recognition.error && (
        <p className="px-3.5 pb-2 text-[11px] text-amber-700" role="alert">
          {t(guide.recognition.error)}
        </p>
      )}
    </div>
  );
};

export default GuideChat;

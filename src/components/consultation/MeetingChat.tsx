import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowDown, Clock, Send } from 'lucide-react';
import type { ChatMessage } from '@/services/consultationCore';

interface MeetingChatProps {
  messages: ChatMessage[];
  disabled: boolean;
  onSend: (text: string) => void;
}

const timeOf = (at: number, locale: string): string => {
  try {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(at));
  } catch {
    return '';
  }
};

/** Meeting chat: client text, Buddy replies, system events, delivery state,
 * auto-scroll with a "new messages" affordance. No message content is ever
 * logged to the console. */
const MeetingChat: React.FC<MeetingChatProps> = ({ messages, disabled, onSend }) => {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(messages.length);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grew = messages.length > lastCount.current;
    lastCount.current = messages.length;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
      setUnseen(0);
    } else if (grew) {
      setUnseen((n) => n + 1);
    }
  }, [messages, atBottom]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
  };

  const jumpToLatest = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setUnseen(0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label={t('meeting.panel.chat')}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 && <p className="text-sm text-gray-500">{t('meeting.chat.empty')}</p>}
        {messages.map((m) => {
          if (m.sender === 'system') {
            return (
              <p key={m.id} className="text-center text-xs text-gray-500">
                {m.text}
              </p>
            );
          }
          const mine = m.sender === 'client';
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="mb-0.5 text-[11px] text-gray-500">
                {mine ? t('meeting.you') : t('meeting.buddyName')} · {timeOf(m.at, i18n.language)}
              </span>
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                } ${m.final ? '' : 'opacity-70'}`}
              >
                {m.text}
              </div>
              {mine && m.delivery !== 'sent' && (
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${
                    m.delivery === 'error' ? 'text-rose-600' : 'text-gray-500'
                  }`}
                >
                  {m.delivery === 'error' ? (
                    <>
                      <AlertCircle className="h-3 w-3" aria-hidden="true" /> {t('meeting.chat.failed')}
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" aria-hidden="true" /> {t('meeting.chat.sending')}
                    </>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!atBottom && unseen > 0 && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="mx-auto mb-1 inline-flex items-center gap-1 rounded-full bg-pink-600 px-3 py-1 text-xs font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> {t('meeting.chat.newMessages', { count: unseen })}
        </button>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-gray-200 p-3">
        <label htmlFor="meeting-chat-input" className="sr-only">
          {t('meeting.chat.inputLabel')}
        </label>
        <textarea
          id="meeting-chat-input"
          value={draft}
          rows={1}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
          placeholder={t('meeting.chat.placeholder')}
          className="min-h-11 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          aria-label={t('meeting.chat.send')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};

export default MeetingChat;

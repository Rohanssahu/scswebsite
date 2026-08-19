import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, X, Minus, Send } from 'lucide-react';
import {
  AssistantAction,
  FALLBACK_ACTIONS,
  FALLBACK_RESPONSE,
  GREETING,
  matchIntent,
} from '@/data/assistantIntents';
import { loadResult } from '@/lib/analysisStore';
import { estimatedWeeks, totalCost, totalHours } from '@/data/demoAnalysis';
import { ASSISTANT_OPEN_EVENT } from './assistantBus';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  actions?: AssistantAction[];
}

const STORAGE_KEY = 'scs-assistant-conversation';

function initialMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    /* fall through to greeting */
  }
  return [{ from: 'bot', text: GREETING, actions: FALLBACK_ACTIONS }];
}

function estimateExplanation(): ChatMessage {
  const result = loadResult();
  if (!result) {
    return {
      from: 'bot',
      text: "You don't have a demo estimate yet. Run a quick project analysis first and I'll walk you through the numbers.",
      actions: [{ label: 'Start project analysis', to: '/project-analysis' }],
    };
  }
  const hours = totalHours(result.team);
  const cost = totalCost(result.team);
  const weeks = estimatedWeeks(result.team);
  const roles = result.team.map((r) => `${r.role} (${r.hours}h × $${r.hourlyRate}/hr)`).join(', ');
  return {
    from: 'bot',
    text: `Here's how your demo estimate breaks down: ${roles}. That totals ${hours} hours ≈ $${cost.toLocaleString()}. With a ${result.weeklyCapacityHours}-hour weekly capacity, delivery is roughly ${weeks} week${weeks > 1 ? 's' : ''} (plus a launch week). Remember — this is a demo figure; a review call confirms the final quote.`,
    actions: [
      { label: 'View full dashboard', to: '/project-analysis/result' },
      { label: 'Schedule a review call', to: '/schedule-call' },
    ],
  };
}

const AssistantWidget = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, typing, open, minimized, reduceMotion]);

  useEffect(() => {
    const handler = (e: Event) => {
      setOpen(true);
      setMinimized(false);
      const topic = (e as CustomEvent<{ topic?: string }>).detail?.topic;
      if (topic === 'estimate') {
        setMessages((prev) => [...prev, estimateExplanation()]);
      }
    };
    window.addEventListener(ASSISTANT_OPEN_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, handler);
  }, []);

  const respond = (userText: string) => {
    setMessages((prev) => [...prev, { from: 'user', text: userText }]);
    setTyping(true);
    setTimeout(
      () => {
        const intent = matchIntent(userText);
        const reply: ChatMessage =
          intent?.id === 'estimate-explain'
            ? estimateExplanation()
            : intent
              ? { from: 'bot', text: intent.response, actions: intent.actions }
              : { from: 'bot', text: FALLBACK_RESPONSE, actions: FALLBACK_ACTIONS };
        setMessages((prev) => [...prev, reply]);
        setTyping(false);
      },
      reduceMotion ? 100 : 700,
    );
  };

  const handleAction = (action: AssistantAction) => {
    if (!action.to) return;
    const [path, hash] = action.to.split('#');
    const target = action.state ? `${path}?mode=${action.state}` : path || '/';
    navigate(target);
    if (hash) {
      // Allow the page to render before scrolling to the section.
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 150);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    respond(text);
  };

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {(!open || minimized) && (
          <motion.button
            key="launcher"
            type="button"
            aria-label="Open SCS Website Assistant (demo)"
            onClick={() => {
              setOpen(true);
              setMinimized(false);
            }}
            initial={reduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            exit={reduceMotion ? undefined : { scale: 0 }}
            className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white shadow-xl shadow-pink-400/40 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <Bot className="h-7 w-7" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            key="panel"
            role="dialog"
            aria-label="SCS Website Assistant — Demo"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-[60] flex h-[520px] max-h-[80vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl shadow-gray-400/40"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-white" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-white">SCS Website Assistant</p>
                  <p className="text-[11px] text-white/80">Demo — rule-based, no live AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Minimize assistant"
                  onClick={() => setMinimized(true)}
                  className="rounded p-1.5 text-white/80 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Close assistant"
                  onClick={() => setOpen(false)}
                  className="rounded p-1.5 text-white/80 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
              {messages.map((m, i) => (
                <div key={i}>
                  <div
                    className={
                      m.from === 'bot'
                        ? 'max-w-[88%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-700'
                        : 'ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-orange-500 to-pink-500 px-3.5 py-2.5 text-sm text-white'
                    }
                  >
                    {m.text}
                  </div>
                  {m.from === 'bot' && m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          onClick={() => handleAction(a)}
                          className="rounded-full border border-pink-300 bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-pink-500"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 border-t border-gray-200 px-3 py-2.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try "How much will development cost?"'
                aria-label="Message the assistant"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="Send message"
                className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-2.5 text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AssistantWidget;

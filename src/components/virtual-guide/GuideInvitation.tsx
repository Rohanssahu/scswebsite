import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { INVITE_ACTIONS, INVITE_TEXT } from '@/data/guideContent';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import GuideAvatar from './GuideAvatar';

// Small non-blocking first-visit invitation shown on the homepage.
// Dismissal is remembered in localStorage; no audio plays automatically.

interface GuideInvitationProps {
  guide: VirtualGuideApi;
}

const GuideInvitation = ({ guide }: GuideInvitationProps) => (
  <motion.div
    role="dialog"
    aria-label="SCS Virtual Guide invitation — demo"
    initial={guide.reduceMotion ? false : { opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={guide.reduceMotion ? undefined : { opacity: 0, y: 16 }}
    transition={{ duration: 0.25 }}
    className="fixed bottom-24 right-5 z-[75] w-[calc(100vw-2.5rem)] max-w-xs rounded-2xl border border-gray-300 bg-white p-4 shadow-2xl shadow-gray-400/40"
  >
    <button
      type="button"
      onClick={guide.dismissInvite}
      aria-label="Dismiss guide invitation"
      className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
    <div className="flex items-start gap-3">
      <GuideAvatar state="welcome" size={48} reduceMotion={guide.reduceMotion} />
      <div>
        <p className="pr-4 text-sm text-gray-800">{INVITE_TEXT}</p>
        <p className="mt-0.5 text-[10px] text-gray-400">SCS Virtual Guide — Demo</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {INVITE_ACTIONS.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => guide.runAction(a)}
          className="rounded-full border border-pink-300 bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {a.label}
        </button>
      ))}
      <button
        type="button"
        onClick={guide.dismissInvite}
        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        Explore myself
      </button>
    </div>
  </motion.div>
);

export default GuideInvitation;

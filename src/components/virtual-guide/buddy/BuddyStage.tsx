import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BuddyApi } from '@/hooks/useBuddyAnimation';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import BuddyCharacter from './BuddyCharacter';
import BuddyHome from './BuddyHome';
import BuddySpeechBubble from './BuddySpeechBubble';

// Buddy's on-page stage: the full-body character (also the panel launcher)
// plus its small home at the outer screen edge. Docks to the logical end
// side — right in LTR, left in RTL — and respects safe-area insets. Never
// covers page content: everything is pointer-events-none except Buddy and
// the door.

interface BuddyStageProps {
  guide: VirtualGuideApi;
  buddy: BuddyApi;
}

const BuddyStage = ({ guide, buddy }: BuddyStageProps) => {
  const { t } = useTranslation();
  const { position } = buddy;
  const { characterSize, homeSize, walkDistance, homeShift, facingHome, facingGuide } = position;

  // Character visibility along the retreat/return journey.
  const hidden = buddy.homePhase === 'inside' || buddy.homePhase === 'knocking' || buddy.homePhase === 'peeking';
  const entering = buddy.homePhase === 'entering';
  const walkingPhase = buddy.homePhase === 'walkingHome' || buddy.homePhase === 'walkingBack';

  // Where Buddy stands: 0 = guide position, homeShift = at the doorstep.
  // In reduced-motion / paused mode Buddy never slides — retreat and return
  // become gentle fades at the guide position instead of walks.
  const x = buddy.animate && (buddy.atHome || entering) ? homeShift : 0;
  const facing: 1 | -1 =
    buddy.homePhase === 'turning' || buddy.homePhase === 'walkingHome' || entering
      ? facingHome
      : buddy.homePhase === 'walkingBack'
        ? facingGuide
        : 1;

  const charWidth = characterSize * 0.8;
  const stageWidth = walkDistance + homeSize + charWidth;

  return (
    <div
      className="pointer-events-none fixed bottom-2 end-2 z-[78]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative" style={{ width: stageWidth, height: characterSize * 1.35 }}>
        {/* Home at the outer edge */}
        <div className="absolute bottom-0 end-0">
          <BuddyHome
            phase={buddy.homePhase}
            size={homeSize}
            animate={buddy.animate}
            onKnock={() => {
              buddy.knock();
              buddy.markInteraction();
            }}
          />
        </div>

        {/* Full-body Buddy — also the panel launcher */}
        <AnimatePresence>
          {!hidden && (
            <motion.div
              key="buddy-walker"
              className="absolute bottom-0 start-0"
              // Mounting mid-return: start at the doorstep and walk back.
              initial={buddy.animate && buddy.homePhase === 'walkingBack' ? { x: homeShift, opacity: 1, scale: 1 } : { opacity: 0, x, scale: 1 }}
              animate={{
                x,
                opacity: entering ? 0 : 1,
                scale: entering ? 0.55 : 1,
              }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{
                x: buddy.animate
                  ? { duration: (walkingPhase || entering ? buddy.walkMs : 300) / 1000, ease: 'easeInOut' }
                  : { duration: 0.35 },
                opacity: { duration: entering ? 0.6 : 0.3 },
                scale: { duration: entering ? 0.6 : 0.3 },
              }}
            >
              {/* Speech bubble above Buddy */}
              <div className="absolute -top-16 start-0">
                <BuddySpeechBubble text={buddy.bubbleKey ? t(buddy.bubbleKey) : null} animate={buddy.animate} />
              </div>

              <button
                type="button"
                aria-label={t('guide.openLabel')}
                onClick={() => {
                  buddy.markInteraction();
                  guide.openPanel();
                }}
                className="pointer-events-auto relative block min-h-11 min-w-11 rounded-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <BuddyCharacter
                  state={buddy.characterState}
                  emotion={buddy.emotion}
                  talking={buddy.talking}
                  size={characterSize}
                  facing={facing}
                  animate={buddy.animate}
                />
                <span className="absolute -top-1 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-medium text-white rtl:translate-x-1/2">
                  {t('common.demoBadge')}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble stays readable while Buddy is inside the home */}
        {hidden && (
          <div className="absolute -top-10 end-0">
            <BuddySpeechBubble text={buddy.bubbleKey ? t(buddy.bubbleKey) : null} animate={buddy.animate} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BuddyStage;

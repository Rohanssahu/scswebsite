import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVirtualGuide } from '@/hooks/useVirtualGuide';
import AvatarWindow from './AvatarWindow';
import GuideAvatar from './GuideAvatar';
import GuideInvitation from './GuideInvitation';
import RecommendationPanel from './RecommendationPanel';
import TourOverlay from './TourOverlay';

// SCS Virtual Guide — Demo. Frontend-only guided assistant:
// no real employee, live video call or AI model is connected.

const VirtualGuide = () => {
  const guide = useVirtualGuide();
  const isMobile = useIsMobile();
  const panelVisible = guide.open && !guide.minimized;
  const launcherVisible = !panelVisible;

  return (
    <>
      {/* First-visit invitation (homepage only, remembered in localStorage) */}
      <AnimatePresence>{guide.showInvite && <GuideInvitation guide={guide} />}</AnimatePresence>

      {/* Floating avatar launcher (also the minimized state) */}
      <AnimatePresence>
        {launcherVisible && (
          <motion.button
            key="guide-launcher"
            type="button"
            aria-label="Open SCS Virtual Guide (demo)"
            onClick={guide.openPanel}
            initial={guide.reduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            exit={guide.reduceMotion ? undefined : { scale: 0 }}
            className="fixed bottom-5 right-5 z-[78] rounded-full shadow-xl shadow-pink-400/40 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <GuideAvatar state={guide.tour.active ? 'pointing' : guide.avatarState} size={56} reduceMotion={guide.reduceMotion} />
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-medium text-white">
              Demo
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Video-call style panel / mobile bottom sheet */}
      <AnimatePresence>{panelVisible && <AvatarWindow guide={guide} isMobile={isMobile} />}</AnimatePresence>

      {/* Guided tour spotlight + step card */}
      <TourOverlay guide={guide} />

      {/* Detailed estimate panel */}
      <RecommendationPanel guide={guide} />
    </>
  );
};

export default VirtualGuide;

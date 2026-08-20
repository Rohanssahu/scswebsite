import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBuddyAnimation } from '@/hooks/useBuddyAnimation';
import { useVirtualGuide } from '@/hooks/useVirtualGuide';
import AvatarWindow from './AvatarWindow';
import GuideInvitation from './GuideInvitation';
import RecommendationPanel from './RecommendationPanel';
import TourOverlay from './TourOverlay';
import BuddyStage from './buddy/BuddyStage';

// Buddy — Your SCS Guide (demo). Frontend-only guided assistant:
// no real employee, live video call or AI model is connected.
// Docks to the logical end side: right in LTR, left in RTL.

const VirtualGuide = () => {
  const guide = useVirtualGuide();
  const buddy = useBuddyAnimation(guide);
  const isMobile = useIsMobile();
  const panelVisible = guide.open && !guide.minimized;
  const stageVisible = !panelVisible;

  return (
    <>
      {/* First-visit invitation (homepage only, remembered in localStorage) */}
      <AnimatePresence>{guide.showInvite && <GuideInvitation guide={guide} />}</AnimatePresence>

      {/* Full-body Buddy + its home (also the panel launcher / minimized state) */}
      {stageVisible && <BuddyStage guide={guide} buddy={buddy} />}

      {/* Video-call style panel / mobile bottom sheet */}
      <AnimatePresence>{panelVisible && <AvatarWindow guide={guide} buddy={buddy} isMobile={isMobile} />}</AnimatePresence>

      {/* Guided tour spotlight + step card */}
      <TourOverlay guide={guide} />

      {/* Detailed estimate panel */}
      <RecommendationPanel guide={guide} />
    </>
  );
};

export default VirtualGuide;

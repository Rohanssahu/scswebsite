import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { BUDDY_HOME_SIZE, BUDDY_SIZE, BUDDY_WALK_DISTANCE } from '@/data/buddyTiming';
import { BuddyAnimationState } from '@/types/buddy';

// Layout/direction facts for Buddy's stage: where home sits (outer screen
// edge on the logical end side — right in LTR, left in RTL), how far Buddy
// walks, which way "inward" pointing is, and responsive sizes.

export interface BuddyPositionInfo {
  rtl: boolean;
  isMobile: boolean;
  characterSize: number;
  homeSize: number;
  walkDistance: number;
  /** Physical x delta (px) from the guide position to the home doorstep. */
  homeShift: number;
  /** Pointing state aimed at the page content from Buddy's dock side. */
  pointInward: BuddyAnimationState;
  /** Character mirroring while walking toward home / back to the guide spot. */
  facingHome: 1 | -1;
  facingGuide: 1 | -1;
}

export function useBuddyPosition(): BuddyPositionInfo {
  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const rtl = i18n.dir() === 'rtl';

  return useMemo(() => {
    const walkDistance = isMobile ? BUDDY_WALK_DISTANCE.mobile : BUDDY_WALK_DISTANCE.desktop;
    return {
      rtl,
      isMobile,
      characterSize: isMobile ? BUDDY_SIZE.mobile : BUDDY_SIZE.desktop,
      homeSize: isMobile ? BUDDY_HOME_SIZE.mobile : BUDDY_HOME_SIZE.desktop,
      walkDistance,
      homeShift: rtl ? -walkDistance : walkDistance,
      pointInward: rtl ? 'pointingRight' : 'pointingLeft',
      facingHome: rtl ? 1 : -1,
      facingGuide: rtl ? -1 : 1,
    };
  }, [rtl, isMobile]);
}

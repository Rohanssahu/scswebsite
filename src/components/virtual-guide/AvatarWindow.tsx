import React, { useEffect, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { GripHorizontal, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BuddyApi } from '@/hooks/useBuddyAnimation';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import GuideAvatar from './GuideAvatar';
import GuideChat from './GuideChat';
import GuideControls from './GuideControls';
import GuideSettings from './GuideSettings';

// Compact video-call style window: avatar stage with live captions on top,
// chat below (or the settings view). Draggable on desktop (header handle),
// bottom sheet with safe-area padding on mobile. Docks to the logical end
// side — right in LTR, left in RTL.

interface AvatarWindowProps {
  guide: VirtualGuideApi;
  buddy: BuddyApi;
  isMobile: boolean;
}

const AvatarWindow = ({ guide, buddy, isMobile }: AvatarWindowProps) => {
  const { t } = useTranslation();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Move focus into the panel when it opens; Escape closes it.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      guide.closePanel();
    }
  };

  const panel = (
    <motion.div
      ref={panelRef}
      key="guide-panel"
      role="dialog"
      aria-label={t('guide.panelLabel')}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      drag={!isMobile}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0.05}
      initial={guide.reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={guide.reduceMotion ? undefined : { opacity: 0, y: 24 }}
      transition={{ duration: 0.2 }}
      className={
        isMobile
          ? 'pointer-events-auto fixed inset-x-0 bottom-0 z-[80] flex h-[80vh] max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-gray-300 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-gray-500/40 outline-none'
          : 'pointer-events-auto fixed bottom-5 end-5 z-[80] flex h-[600px] max-h-[85vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl shadow-gray-500/40 outline-none'
      }
    >
      {/* Header / drag handle */}
      <div
        onPointerDown={(e) => {
          if (isMobile) return;
          if ((e.target as HTMLElement).closest('button')) return; // keep controls clickable
          dragControls.start(e);
        }}
        className={`flex items-center justify-between gap-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-3 py-2.5 ${
          isMobile ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {!isMobile && <GripHorizontal className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {t('guide.fullName')} <span className="font-normal text-white/80">— {t('common.demoBadge')}</span>
            </p>
            <p className="truncate text-[10px] text-white/75">{t('guide.tagline')}</p>
          </div>
        </div>
        <GuideControls guide={guide} />
      </div>

      {/* Avatar stage with live captions */}
      <div className="relative flex shrink-0 items-center gap-3 bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 px-4 py-3">
        <div className="shrink-0">
          <GuideAvatar state={guide.avatarState} size={isMobile ? 64 : 80} reduceMotion={guide.reduceMotion} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {!guide.reduceMotion && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" aria-hidden="true" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            </span>
            <p className="text-[11px] font-medium text-emerald-300">{t(`guide.states.${guide.avatarState}`)}</p>
            {guide.paused && <span className="rounded bg-amber-400/20 px-1.5 text-[10px] text-amber-300">{t('guide.paused')}</span>}
          </div>
          {/* Captions for every spoken/shown message — always available */}
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-200" aria-live="polite" aria-label={t('guide.captionsLabel')}>
            {guide.caption ? t(guide.caption.key, guide.caption.params) : t('guide.captionsPlaceholder')}
          </p>
          {guide.tour.active && guide.tour.paused && (
            <button
              type="button"
              onClick={guide.tourResume}
              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Play className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" /> {t('guide.resumeTour')}
            </button>
          )}
        </div>
      </div>

      {guide.settingsMode ? <GuideSettings guide={guide} buddy={buddy} /> : <GuideChat guide={guide} />}
    </motion.div>
  );

  if (isMobile) return panel;

  return (
    <div ref={constraintsRef} className="pointer-events-none fixed inset-0 z-[80]">
      {panel}
    </div>
  );
};

export default AvatarWindow;

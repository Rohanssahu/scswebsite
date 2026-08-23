// =============================================================================
// ConnectionStatus — the right-edge connection drawer.
//
// What a visitor gets when the internet drops mid-visit:
//
//   - the page they are on is left completely alone (no overlay, no blocking
//     dialog, no route change) so everything already downloaded keeps working;
//   - a drawer slides in on the right edge naming the problem, what still
//     works, how long the outage has lasted and which of their actions failed;
//   - it stays for the whole outage. Collapsing it leaves a permanent rail on
//     the edge — there is no way to dismiss a live outage, only to shrink it;
//   - the moment the connection is confirmed back it turns green, and it offers
//     a reload when an action was lost while offline.
//
// The file is split the way the lobby's device check is: `ConnectionPanel` is
// the pure view (every value arrives already formatted, so it is renderable in
// a test), and the default export is the thin wiring that feeds it from
// `useNetworkStatus`. Neither holds network code — every retry is either the
// visitor's button or the monitor's own backing-off probe.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, RefreshCw, RotateCw, Wifi, WifiOff, X } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getLocaleConfig } from '@/i18n/languageConfig';
import type { BlockedAction, BlockedActionKind } from '@/services/networkStatus';

/** How long the "back online" state stays before it hides itself. */
const RECOVERY_VISIBLE_MS = 6000;

/** m:ss — deliberately numeric, so it needs no plural rules per language. */
const formatOutage = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
};

const BLOCKED_LABEL_KEY: Record<BlockedActionKind, string> = {
  page: 'connection.blocked.page',
  form: 'connection.blocked.form',
  ai: 'connection.blocked.ai',
  meeting: 'connection.blocked.meeting',
  request: 'connection.blocked.request',
};

export interface ConnectionPanelProps {
  /** Probe-confirmed state: false paints the amber outage drawer. */
  online: boolean;
  /** A confirmation request is in flight. */
  checking: boolean;
  /** Preformatted "m:ss" outage length, or null while online. */
  outage: string | null;
  /** Preformatted local time of the last probe, or null if none has run. */
  lastChecked: string | null;
  /** Actions the visitor lost during this outage. */
  blocked: BlockedAction[];
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onCheck: () => void;
  onDismiss: () => void;
  onReload: () => void;
}

/** The whole drawer, driven entirely by props. */
export const ConnectionPanel = ({
  online,
  checking,
  outage,
  lastChecked,
  blocked,
  collapsed,
  onCollapse,
  onExpand,
  onCheck,
  onDismiss,
  onReload,
}: ConnectionPanelProps) => {
  const { t } = useTranslation();
  const title = t(online ? 'connection.onlineTitle' : 'connection.offlineTitle');
  const accent = online ? 'border-emerald-200 bg-emerald-50/95' : 'border-amber-200 bg-amber-50/95';

  // Collapsed: a rail the visitor cannot lose while the outage lasts.
  if (collapsed) {
    return (
      <div className="no-print fixed right-0 top-20 z-[60] sm:top-24">
        <button
          type="button"
          onClick={onExpand}
          aria-label={t(online ? 'connection.showOnline' : 'connection.showOffline')}
          className={`flex flex-col items-center gap-1.5 rounded-l-xl border border-r-0 px-2 py-3 shadow-lg backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${accent}`}
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" aria-hidden="true" />
          {online ? (
            <Wifi className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          ) : (
            <WifiOff className="h-5 w-5 animate-pulse text-amber-600 motion-reduce:animate-none" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className={`no-print fixed right-0 top-20 z-[60] w-[min(21rem,calc(100vw-1.5rem))] rounded-l-2xl border border-r-0 shadow-2xl backdrop-blur transition-colors sm:top-24 ${accent}`}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            online ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {online ? <Wifi className="h-5 w-5" aria-hidden="true" /> : <WifiOff className="h-5 w-5" aria-hidden="true" />}
        </span>

        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {t(online ? 'connection.onlineBody' : 'connection.offlineBody')}
          </p>

          {!online && outage !== null && (
            <p className="mt-2 font-mono text-xs text-amber-800">
              {t('connection.offlineFor', { duration: outage })}
            </p>
          )}

          {blocked.length > 0 && (
            <div className="mt-3 rounded-lg border border-black/5 bg-white/70 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {t('connection.waitingTitle')}
              </p>
              <ul className="mt-1.5 space-y-1">
                {blocked.map((action) => (
                  <li key={action.kind} className="flex items-center justify-between gap-2 text-xs text-gray-700">
                    <span className="truncate">{t(BLOCKED_LABEL_KEY[action.kind])}</span>
                    {action.count > 1 && (
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                        {t('connection.repeated', { count: action.count })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {online ? (
              <>
                {blocked.length > 0 && (
                  <button
                    type="button"
                    onClick={onReload}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('connection.reload')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDismiss}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  {t('connection.dismiss')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onCheck}
                disabled={checking}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${checking ? 'animate-spin motion-reduce:animate-none' : ''}`}
                  aria-hidden="true"
                />
                {t(checking ? 'connection.checking' : 'connection.checkAgain')}
              </button>
            )}
          </div>

          {lastChecked !== null && !checking && (
            <p className="mt-2 text-[11px] text-gray-500">
              {t('connection.lastChecked', { time: lastChecked })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={online ? onDismiss : onCollapse}
          aria-label={t(online ? 'connection.dismiss' : 'connection.hide')}
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          {online ? <X className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

const ConnectionStatus = () => {
  const { i18n } = useTranslation();
  const { online, checking, offlineSince, recoveredAt, lastCheckedAt, blocked, check, dismiss } =
    useNetworkStatus();
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const outageRef = useRef<number | null>(null);

  // A new outage always arrives expanded, however the last one was left.
  useEffect(() => {
    if (offlineSince !== null && outageRef.current !== offlineSince) {
      outageRef.current = offlineSince;
      setCollapsed(false);
    }
  }, [offlineSince]);

  // Drives the "offline for m:ss" counter; only runs during an outage.
  useEffect(() => {
    if (online) return;
    setTick(Date.now());
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [online]);

  // The recovery notice hides itself — unless an action was lost, in which case
  // the visitor decides when they are done with it (they may want the reload).
  useEffect(() => {
    if (!online || recoveredAt === null || blocked.length > 0) return;
    const id = window.setTimeout(dismiss, RECOVERY_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [online, recoveredAt, blocked.length, dismiss]);

  // Nothing to say: connected, and no outage left to report.
  if (online && recoveredAt === null) return null;

  const locale = getLocaleConfig(i18n.language);

  return (
    <ConnectionPanel
      online={online}
      checking={checking}
      outage={offlineSince === null ? null : formatOutage(tick - offlineSince)}
      lastChecked={
        lastCheckedAt === null
          ? null
          : new Intl.DateTimeFormat(locale.formatLocale, locale.timeFormat).format(new Date(lastCheckedAt))
      }
      blocked={blocked}
      collapsed={collapsed}
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
      onCheck={check}
      onDismiss={dismiss}
      onReload={() => window.location.reload()}
    />
  );
};

export default ConnectionStatus;

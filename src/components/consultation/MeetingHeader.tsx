import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import type { MeetingConnectionState } from '@/services/consultationCore';

interface MeetingHeaderProps {
  reference: string;
  connection: MeetingConnectionState;
  /** Epoch ms the live meeting started, or null before it does. */
  startedAt: number | null;
  /** Shown when Buddy has finalized the submission. */
  finalizedLabel?: string | null;
}

const DOT_TONE: Record<MeetingConnectionState, string> = {
  idle: 'bg-white/40',
  connecting: 'bg-amber-400',
  live: 'bg-emerald-400',
  reconnecting: 'bg-amber-400',
  ended: 'bg-white/40',
  error: 'bg-rose-400',
};

const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Compact single-row meeting header: identity on the left, live status on the right. */
const MeetingHeader: React.FC<MeetingHeaderProps> = ({ reference, connection, startedAt, finalizedLabel }) => {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0);
      return;
    }
    setElapsed(Date.now() - startedAt);
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const pulse = connection === 'live' || connection === 'connecting' || connection === 'reconnecting';

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-[11px] font-bold text-white sm:grid"
        >
          SCS
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight text-white sm:text-[0.95rem]">
            {t('meeting.title')}
          </h1>
          <p className="truncate font-mono text-[11px] leading-tight text-white/55">{reference}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
        <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-emerald-300 md:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('meeting.header.secure')}
        </span>

        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-white/85"
          aria-label={t('meeting.header.duration')}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden="true" />
          {formatDuration(elapsed)}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/85">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${DOT_TONE[connection]} ${pulse ? 'animate-pulse' : ''}`}
          />
          <span className="max-w-[7rem] truncate">{t(`meeting.connection.${connection}`)}</span>
        </span>

        {finalizedLabel && (
          <span className="hidden items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-300 lg:inline-flex">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {finalizedLabel}
          </span>
        )}
      </div>
    </header>
  );
};

export default MeetingHeader;

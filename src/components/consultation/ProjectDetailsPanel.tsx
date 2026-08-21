import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileWarning, Info } from 'lucide-react';
import type { BuddyProgressView } from '@/services/voiceSessionCore';

interface ProjectDetailsPanelProps {
  hasAnalysis: boolean;
  analysisMode: string | null;
  reference: string;
  progress: BuddyProgressView | null;
  language: string | null;
}

const humanize = (key: string): string => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Read-only view of what the meeting knows: attached analysis, requirement
 * progress and the collected/missing field lists published by the agent. */
const ProjectDetailsPanel: React.FC<ProjectDetailsPanelProps> = ({
  hasAnalysis,
  analysisMode,
  reference,
  progress,
  language,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-y-auto p-4">
      <h3 className="text-base font-semibold text-gray-900">{t('meeting.details.title')}</h3>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">{t('meeting.details.reference')}</dt>
          <dd className="font-mono text-gray-900">{reference}</dd>
        </div>
        {language && (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">{t('meeting.details.language')}</dt>
            <dd className="text-gray-900">{t(`meeting.languages.${language}`, { defaultValue: language })}</dd>
          </div>
        )}
      </dl>

      {hasAnalysis ? (
        <p className="mt-4 flex gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('meeting.details.analysisAttached', {
            mode: analysisMode === 'existing' ? t('meeting.details.existing') : t('meeting.details.new'),
          })}
        </p>
      ) : (
        <p className="mt-4 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('meeting.details.noAnalysis')}
        </p>
      )}

      {progress && (
        <section className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('meeting.details.progress')}
          </h4>
          <div className="mt-2">
            <div
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('meeting.details.progress')}
              className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">{progress.percent}%</p>
          </div>

          {progress.collected.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-700">{t('meeting.details.collected')}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {progress.collected.map((f) => (
                  <li key={f} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                    {humanize(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {progress.missingRequired.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-700">{t('meeting.details.missing')}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {progress.missingRequired.map((f) => (
                  <li key={f} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                    {humanize(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ProjectDetailsPanel;

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, SkipForward, RotateCcw, Repeat, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getQuestions } from '@/data/analysisQuestions';
import { valueKey } from '@/i18n/languageConfig';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';

// Requirement-collection UI rendered above the composer while a flow runs:
// option chips for the current question plus Back / Skip / Restart / Switch
// controls. Answer VALUES stay canonical English (so saved answers survive
// language switches); only their labels are translated.

interface RequirementFlowProps {
  guide: VirtualGuideApi;
}

const ctrlBtn =
  'inline-flex min-h-9 items-center gap-1 rounded text-[11px] text-gray-500 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:opacity-30';

const RequirementFlow = ({ guide }: RequirementFlowProps) => {
  const { t } = useTranslation();
  const { flow, currentQuestion } = guide;
  const [multiDraft, setMultiDraft] = useState<string[]>([]);

  useEffect(() => {
    setMultiDraft([]);
  }, [currentQuestion?.id]);

  if (!flow || flow.status === 'analyzing' || flow.status === 'done') return null;

  const questions = getQuestions(flow.mode);
  const answered = questions.filter((q) => flow.answers[q.id] !== undefined).length;
  const percent = Math.round((answered / questions.length) * 100);

  return (
    <div className="border-t border-gray-200 bg-gray-50/80 px-3.5 py-2.5">
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>
          {flow.mode === 'new' ? t('guide.flow.newProject') : t('guide.flow.existingProject')} ·{' '}
          {Math.min(answered + 1, questions.length)}/{questions.length}
        </span>
        <span>{t('guide.flow.percentComplete', { percent })}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
          animate={{ width: `${percent}%` }}
          transition={{ duration: guide.reduceMotion ? 0 : 0.3 }}
        />
      </div>

      {currentQuestion && (currentQuestion.type === 'single' || currentQuestion.type === 'multi') && currentQuestion.options && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('guide.flow.answerOptions')}>
          {currentQuestion.options.map((opt) => {
            const selected = multiDraft.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={currentQuestion.type === 'multi' ? selected : undefined}
                onClick={() => {
                  if (currentQuestion.type === 'single') {
                    guide.answerQuestion(opt);
                  } else {
                    setMultiDraft(selected ? multiDraft.filter((o) => o !== opt) : [...multiDraft, opt]);
                  }
                }}
                className={`min-h-9 rounded-full border px-2.5 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  selected
                    ? 'border-pink-500 bg-pink-100 text-gray-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400 hover:text-gray-900'
                }`}
              >
                {t(`options.${valueKey(opt)}`, { defaultValue: opt })}
              </button>
            );
          })}
          {currentQuestion.type === 'multi' && (
            <button
              type="button"
              disabled={multiDraft.length === 0}
              onClick={() => guide.answerQuestion(multiDraft)}
              className="min-h-9 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              {t('guide.flow.confirmSelection')}
            </button>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" className={ctrlBtn} onClick={guide.flowBack} disabled={flow.index === 0}>
          <ArrowLeft className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" /> {t('guide.flow.backEdit')}
        </button>
        {currentQuestion?.optional && (
          <button type="button" className={ctrlBtn} onClick={guide.flowSkip}>
            {t('guide.flow.skip')} <SkipForward className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        )}
        <button type="button" className={ctrlBtn} onClick={guide.flowRestart}>
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> {t('guide.flow.restart')}
        </button>
        <button type="button" className={ctrlBtn} onClick={guide.flowSwitch}>
          <Repeat className="h-3 w-3" aria-hidden="true" />{' '}
          {flow.mode === 'new' ? t('guide.flow.switchToExisting') : t('guide.flow.switchToNew')}
        </button>
        <button type="button" className={ctrlBtn} onClick={guide.flowCancel}>
          <X className="h-3 w-3" aria-hidden="true" /> {t('guide.flow.exitFlow')}
        </button>
      </div>
    </div>
  );
};

export default RequirementFlow;

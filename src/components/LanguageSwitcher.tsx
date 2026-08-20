import React from 'react';
import { Check, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setAppLanguage } from '@/i18n/config';
import { LOCALES, SUPPORTED_LANGUAGES } from '@/i18n/languageConfig';

// Visible website language switcher (navbar). Fully keyboard accessible via
// the Radix dropdown; every language is shown with its native label plus its
// English name for screen readers — never flags alone.

const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { t, i18n } = useTranslation();
  const current = LOCALES[SUPPORTED_LANGUAGES.find((c) => c === i18n.language) ?? 'en'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('a11y.languageSwitcher')}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-pink-400 hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>{compact ? current.code.toUpperCase() : current.nativeLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] min-w-[10rem]">
        {SUPPORTED_LANGUAGES.map((code) => {
          const cfg = LOCALES[code];
          const active = i18n.language === code;
          return (
            <DropdownMenuItem
              key={code}
              lang={code}
              dir={cfg.dir}
              aria-label={`${cfg.nativeLabel} (${cfg.englishLabel})`}
              onSelect={() => setAppLanguage(code, true)}
              className="min-h-11 cursor-pointer justify-between gap-3 text-sm"
            >
              <span>
                {cfg.nativeLabel}
                {code !== 'en' && <span className="ms-2 text-xs text-gray-400">{cfg.englishLabel}</span>}
              </span>
              {active && <Check className="h-4 w-4 text-pink-600" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;

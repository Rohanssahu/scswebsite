// =============================================================================
// PermissionHelp — how to un-block microphone access, per browser.
//
// This is guidance only. The page cannot change a permission the client has
// denied and never claims to have done so; every step is an action the client
// performs in their own browser. Rendered as a native <details> so it is
// keyboard-operable and screen-reader friendly with no custom JS.
// =============================================================================

import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';

interface PermissionHelpProps {
  /** Renders expanded (used by the in-meeting recovery banner). */
  defaultOpen?: boolean;
  /** 'light' on the lobby's white cards, 'dark' inside the meeting shell. */
  tone?: 'light' | 'dark';
}

const BROWSER_KEYS = ['chrome', 'safari', 'firefox', 'android'] as const;
const GENERAL_KEYS = ['general1', 'general2', 'general3', 'general4'] as const;

const PermissionHelp: React.FC<PermissionHelpProps> = ({ defaultOpen = false, tone = 'light' }) => {
  const { t } = useTranslation();
  const dark = tone === 'dark';

  return (
    <details
      open={defaultOpen}
      className={`mt-3 rounded-xl border text-sm ${
        dark ? 'border-white/20 bg-white/5 text-white/90' : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
    >
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
          dark ? 'text-white' : 'text-gray-900'
        }`}
      >
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('meeting.setup.help.title')}
      </summary>
      <div className="space-y-3 px-3 pb-3">
        <p>{t('meeting.setup.help.intro')}</p>
        <ol className="list-decimal space-y-1 ps-5">
          {GENERAL_KEYS.map((key) => (
            <li key={key}>{t(`meeting.setup.help.${key}`)}</li>
          ))}
        </ol>
        <dl className="space-y-2">
          {BROWSER_KEYS.map((key) => (
            <div key={key}>
              <dt className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                {t(`meeting.setup.help.${key}Title`)}
              </dt>
              <dd>{t(`meeting.setup.help.${key}`)}</dd>
            </div>
          ))}
        </dl>
        <p className={dark ? 'text-white/70' : 'text-gray-500'}>{t('meeting.setup.help.noBypass')}</p>
      </div>
    </details>
  );
};

export default PermissionHelp;

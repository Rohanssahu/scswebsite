import { useTranslation } from 'react-i18next';

/**
 * Keyboard/screen-reader shortcut past the sticky header and hero decoration
 * straight to the page's `<main id="main-content">` landmark. Visually hidden
 * until focused, so it costs sighted visitors nothing. Uses logical `start`
 * positioning so it lands on the correct side in Arabic/Urdu RTL.
 */
const SkipToContent = () => {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-pink-700 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
    >
      {t('a11y.skipToContent')}
    </a>
  );
};

export default SkipToContent;

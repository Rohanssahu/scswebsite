import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocaleConfig } from '@/i18n/languageConfig';

// Invisible ARIA live region announcing language changes to screen readers.

const LanguageAnnouncer = () => {
  const { t, i18n } = useTranslation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const onChange = (lng: string) => {
      const cfg = getLocaleConfig(lng);
      setAnnouncement(t('a11y.languageChangedTo', { language: `${cfg.nativeLabel} (${cfg.englishLabel})` }));
    };
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, [i18n, t]);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {announcement}
    </div>
  );
};

export default LanguageAnnouncer;

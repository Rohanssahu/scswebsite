import { useEffect, useState } from 'react';
import { getAnalyticsConsent, initializeAnalytics, setAnalyticsConsent } from '@/utils/analytics';

/** Consent control for aggregate, non-identifying visitor analytics. */
const AnalyticsConsent = () => {
  const [choice, setChoice] = useState(getAnalyticsConsent);
  const [open, setOpen] = useState(choice === null);

  useEffect(() => {
    if (choice === 'granted') initializeAnalytics();
  }, [choice]);

  const choose = (granted: boolean) => {
    setAnalyticsConsent(granted);
    setChoice(granted ? 'granted' : 'denied');
    setOpen(false);
  };

  if (!open && choice !== null) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[90] rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-lg hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        Privacy settings
      </button>
    );
  }

  return (
    <section aria-label="Privacy settings" className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:bottom-5">
      <h2 className="text-base font-semibold text-gray-900">Analytics privacy</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        With your permission, we use Google Analytics for aggregate visits, country/city, device type and page performance. We do not collect a unique device ID, exact location, form details or conversation content in analytics.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(true)} className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500">
          Accept analytics
        </button>
        <button type="button" onClick={() => choose(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500">
          Decline
        </button>
      </div>
    </section>
  );
};

export default AnalyticsConsent;

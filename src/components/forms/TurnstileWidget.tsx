// Cloudflare Turnstile widget (explicit render). Loads the script once,
// reports token changes to the parent and exposes reset() via ref — parents
// reset after every submission because tokens are single-use.
//
// The token is held in memory only (never persisted) and the server verifies
// it again — this widget is UX, the Edge Function is the enforcement point.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TURNSTILE_SITE_KEY } from '@/services/supabaseClient';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      'refresh-expired'?: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Called with the fresh token, or null when it expires / errors / resets. */
  onToken: (token: string | null) => void;
  className?: string;
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  ({ onToken, className = '' }, ref) => {
    const { t, i18n } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;
    const [failed, setFailed] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          onTokenRef.current(null);
        }
      },
    }));

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) return;
      let cancelled = false;
      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            language: i18n.language,
            'refresh-expired': 'auto',
            callback: (token) => {
              setFailed(false);
              onTokenRef.current(token);
            },
            'expired-callback': () => onTokenRef.current(null),
            'error-callback': () => {
              setFailed(true);
              onTokenRef.current(null);
            },
          });
        })
        .catch(() => setFailed(true));
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
      // Language changes re-render the whole widget via key= on the parent.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!TURNSTILE_SITE_KEY) {
      // Config missing: parents fall back / block submission separately.
      return null;
    }

    return (
      <div className={className}>
        <div ref={containerRef} />
        {failed && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t('leadForm.turnstileError')}
          </p>
        )}
      </div>
    );
  },
);

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;

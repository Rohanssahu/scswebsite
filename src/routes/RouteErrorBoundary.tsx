// =============================================================================
// RouteErrorBoundary — keeps a failed page from taking the whole site down.
//
// Every content page is a code-split chunk, so a visitor who goes offline and
// then clicks a link they have not visited yet asks for a download that cannot
// happen. Before this boundary existed that threw straight past React and left
// a blank document: the outage cost the visitor the entire site, not just the
// page they clicked.
//
// Now the failure is caught here and answered with a page that explains it and
// offers a retry (`resetFailedRoutes()` re-arms the chunk, so the same route
// can load once the connection is back). Navigating away clears it too, so the
// rest of the site stays exactly as usable as it was.
//
// It is mounted in `App.tsx` around the browser's route tree — deliberately not
// inside `SiteRoutes`, which the build-time prerender also renders: a chunk
// that fails during the build must keep failing the build, not be caught and
// turned into a rendered error page.
// =============================================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, RotateCw, Undo2, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { resetFailedRoutes } from './loadable';

/** The visible half: offline gets connection copy, anything else a plain retry. */
const RouteErrorNotice = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation();
  const { online, checking, check } = useNetworkStatus();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            online ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {online ? <RotateCw className="h-6 w-6" aria-hidden="true" /> : <WifiOff className="h-6 w-6" aria-hidden="true" />}
        </span>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          {t(online ? 'connection.pageErrorTitle' : 'connection.pageTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {t(online ? 'connection.pageErrorBody' : 'connection.pageBody')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              // Confirm the connection as well: the drawer should agree with
              // whatever the visitor is about to see happen here.
              check();
              onRetry();
            }}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <RefreshCw
              className={`h-4 w-4 ${checking ? 'animate-spin motion-reduce:animate-none' : ''}`}
              aria-hidden="true"
            />
            {t('connection.pageRetry')}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            {t('connection.pageBack')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BoundaryProps {
  children: ReactNode;
  /** Changes on every navigation, which clears a displayed error. */
  locationKey: string;
}

class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept visible in the console: a chunk that fails while online is a real
    // deployment problem and must not be silently swallowed.
    console.error('Route failed to render:', error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps): void {
    if (this.state.error && prev.locationKey !== this.props.locationKey) {
      resetFailedRoutes();
      this.setState({ error: null });
    }
  }

  private retry = (): void => {
    resetFailedRoutes();
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) return <RouteErrorNotice onRetry={this.retry} />;
    return this.props.children;
  }
}

const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return <Boundary locationKey={location.key ?? location.pathname}>{children}</Boundary>;
};

export default RouteErrorBoundary;

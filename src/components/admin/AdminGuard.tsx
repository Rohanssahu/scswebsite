// Protected-route wrapper. Children mount only in the `authorized` state, so
// dashboard markup can never flash before the membership check resolves.

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { buildLoginRedirect, shouldRedirectToLogin } from '@/services/admin/adminAuthCore';

const AdminChecking = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300"
    role="status"
    aria-live="polite"
  >
    <span className="inline-flex items-center gap-3 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Checking your session…
    </span>
  </div>
);

const AdminUnavailable = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6">
    <div className="max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
      <ShieldAlert className="mx-auto h-8 w-8 text-orange-400" aria-hidden="true" />
      <h1 className="mt-4 text-lg font-semibold text-white">Dashboard unavailable</h1>
      <p className="mt-2 text-sm text-gray-400">
        The dashboard could not verify your session. Reload the page, or try again in a moment.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-700 px-5 text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        Back to website
      </a>
    </div>
  </div>
);

const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { status } = useAdminAuth();
  const location = useLocation();

  if (status === 'checking') return <AdminChecking />;
  if (shouldRedirectToLogin(status)) {
    return <Navigate to={buildLoginRedirect(`${location.pathname}${location.search}`)} replace />;
  }
  if (status !== 'authorized') return <AdminUnavailable />;
  return <>{children}</>;
};

export default AdminGuard;

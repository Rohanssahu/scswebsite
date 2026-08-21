// Layout route for every /admin path.
//
// Mounting the auth provider here (rather than per screen) keeps one session
// check alive across dashboard navigation, and keeps the public Header, Footer,
// language switcher and Buddy widget out of the admin tree entirely.

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider';

const AdminFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400" role="status">
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading dashboard…</span>
  </div>
);

const AdminBoundary = () => (
  <AdminAuthProvider>
    <Suspense fallback={<AdminFallback />}>
      <Outlet />
    </Suspense>
  </AdminAuthProvider>
);

export default AdminBoundary;

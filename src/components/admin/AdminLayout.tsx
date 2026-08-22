// Dashboard chrome: a fixed sidebar on desktop, a drawer on mobile.
//
// Deliberately minimal navigation — Overview/Leads, one "View website" link and
// Logout. None of the public site's Header, Footer, language switcher, scroll
// controls or Buddy widget appears on an /admin route.

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExternalLink, LayoutList, LogOut, Menu, X } from 'lucide-react';
import { icon } from '@/asset/images';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { applyAdminHead } from '@/components/admin/adminSeo';
import { ADMIN_HOME_PATH } from '@/services/admin/adminAuthCore';

const BRAND_GRADIENT = 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600';

/** Installs the noindex meta tag for as long as an admin screen is mounted. */
export function useAdminHead(title: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    return applyAdminHead(document as unknown as Parameters<typeof applyAdminHead>[0], title);
  }, [title]);
}

const NavContent = ({
  onNavigate,
  currentPath,
  onSignOut,
  email,
  role,
}: {
  onNavigate?: () => void;
  currentPath: string;
  onSignOut: () => void;
  email: string | null;
  role: string | null;
}) => {
  const overviewActive = currentPath === ADMIN_HOME_PATH;
  return (
    <div className="flex h-full flex-col">
      <Link
        to={ADMIN_HOME_PATH}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-2 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        <img src={icon.logos} alt="SCS Softwares" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
        <span className="text-sm font-semibold leading-tight text-white">
          Owner Dashboard
          <span className="block text-xs font-normal text-gray-400">SCS Softwares</span>
        </span>
      </Link>

      <nav aria-label="Dashboard" className="mt-6 flex-1 space-y-1">
        <Link
          to={ADMIN_HOME_PATH}
          onClick={onNavigate}
          aria-current={overviewActive ? 'page' : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
            overviewActive ? `${BRAND_GRADIENT} text-white` : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <LayoutList className="h-4 w-4" aria-hidden="true" />
          Overview &amp; leads
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          View website
        </a>
      </nav>

      <div className="border-t border-gray-800 pt-4">
        {email ? (
          <p className="px-3 pb-3 text-xs text-gray-500">
            <span className="block truncate text-gray-300">{email}</span>
            {role ? <span className="capitalize">{role}</span> : null}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
};

const AdminLayout = ({ title, children }: { title: string; children: ReactNode }) => {
  const { email, role, signOut } = useAdminAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useAdminHead(`${title} · SCS Owner Dashboard`);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-800 bg-gray-900 p-4 lg:flex">
        <NavContent
          currentPath={pathname}
          onSignOut={() => void signOut()}
          email={email}
          role={role}
        />
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="admin-drawer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Open dashboard menu</span>
        </button>
        <span className="text-sm font-semibold text-white">{title}</span>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            id="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-gray-800 bg-gray-900 p-4"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close menu</span>
            </button>
            <NavContent
              currentPath={pathname}
              onNavigate={() => setDrawerOpen(false)}
              onSignOut={() => void signOut()}
              email={email}
              role={role}
            />
          </div>
        </div>
      ) : null}

      <main id="main-content" className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">{children}</main>
    </div>
  );
};

export default AdminLayout;

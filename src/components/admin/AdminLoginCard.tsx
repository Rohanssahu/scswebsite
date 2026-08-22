// Presentational sign-in card. Fully prop-driven so its markup can be asserted
// in tests without a browser, a router or a Supabase project.

import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { icon } from '@/asset/images';

export interface AdminLoginCardProps {
  email: string;
  password: string;
  showPassword: boolean;
  submitting: boolean;
  /** Already-safe copy — never a provider or Postgres message. */
  errorMessage: string | null;
  /** Contextual notice, e.g. an expired session. */
  notice: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
}

const AdminLoginCard = ({
  email,
  password,
  showPassword,
  submitting,
  errorMessage,
  notice,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: AdminLoginCardProps) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10">
    {/* Brand wash: the same orange → pink → purple ramp as the public site. */}
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-600/20 blur-3xl"
      aria-hidden="true"
    />
    <div className="relative w-full max-w-sm rounded-3xl border border-gray-800 bg-gray-900 p-7 shadow-2xl shadow-black/40">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 p-[2px]">
          <span className="flex h-full w-full items-center justify-center rounded-2xl bg-gray-900">
            <img src={icon.logos} alt="SCS Softwares" width={32} height={32} className="h-8 w-8 object-contain" />
          </span>
        </span>
        <h1 className="mt-4 text-lg font-semibold text-white">Owner Dashboard</h1>
        <p className="mt-1 text-xs text-gray-400">Sign in with your staff account.</p>
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs text-gray-300"
        >
          {notice}
        </p>
      ) : null}

      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <label htmlFor="admin-email" className="block text-xs font-medium text-gray-300">
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-sm text-white placeholder:text-gray-600 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-xs font-medium text-gray-300">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="block min-h-11 w-full rounded-xl border border-gray-700 bg-gray-950 pl-3 pr-12 text-sm text-white focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-gray-400 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-200"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <a
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to website
      </a>
    </div>
  </div>
);

export default AdminLoginCard;

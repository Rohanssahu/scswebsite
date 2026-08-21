import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Link2, Loader2, ShieldAlert, Upload } from 'lucide-react';
import { validateLink, type LinkKind } from '@/services/consultationCore';
import type { LinkSubmission } from '@/services/consultationService';

/** Secure private document upload is intentionally behind this flag until a
 * signed private-bucket flow ships. Never ship an insecure upload path. */
export const DOCUMENT_UPLOAD_ENABLED = false;

const LINK_KINDS: LinkKind[] = ['repository', 'figma', 'api_docs', 'website', 'other_link'];

interface FilesLinksPanelProps {
  submitted: LinkSubmission[];
  saving: boolean;
  error: string | null;
  onSubmit: (links: LinkSubmission[]) => void;
}

/** Sanitize a URL/label for display — the stored value is untrusted data.
 * Rendering happens as text (never as HTML), and only https URLs that already
 * passed validation become clickable. */
const safeHref = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const FilesLinksPanel: React.FC<FilesLinksPanelProps> = ({ submitted, saving, error, onSubmit }) => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<LinkKind>('repository');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const check = validateLink(kind, url);
    if (check.ok !== true) {
      setLocalError(t(`meeting.links.errors.${check.reason}`));
      return;
    }
    onSubmit([{ kind, url: check.url, ...(label.trim() ? { label: label.trim().slice(0, 200) } : {}) }]);
    setUrl('');
    setLabel('');
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    onSubmit([{ kind: 'note', note: text.slice(0, 2000) }]);
    setNote('');
  };

  const inputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none';

  return (
    <div className="overflow-y-auto p-4">
      <h3 className="text-base font-semibold text-gray-900">{t('meeting.links.title')}</h3>

      {/* security warning — never ask for credentials */}
      <p className="mt-2 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t('meeting.links.securityWarning')}
      </p>

      <form onSubmit={addLink} className="mt-4 space-y-2">
        <div>
          <label htmlFor="link-kind" className="mb-1 block text-xs font-medium text-gray-700">
            {t('meeting.links.kind')}
          </label>
          <select id="link-kind" value={kind} onChange={(e) => setKind(e.target.value as LinkKind)} className={inputCls}>
            {LINK_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`meeting.links.kinds.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="link-url" className="mb-1 block text-xs font-medium text-gray-700">
            {t('meeting.links.url')}
          </label>
          <input
            id="link-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value.slice(0, 2048))}
            placeholder="https://github.com/your-org/your-repo"
            className={inputCls}
          />
          {kind === 'repository' && <p className="mt-1 text-[11px] text-gray-500">{t('meeting.links.repoHosts')}</p>}
        </div>
        <div>
          <label htmlFor="link-label" className="mb-1 block text-xs font-medium text-gray-700">
            {t('meeting.links.label')}
          </label>
          <input
            id="link-label"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 200))}
            className={inputCls}
          />
        </div>
        {(localError || error) && (
          <p role="alert" className="text-xs text-rose-600">
            {localError ?? error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          {t('meeting.links.add')}
        </button>
      </form>

      <form onSubmit={addNote} className="mt-5 space-y-2">
        <label htmlFor="link-note" className="mb-1 block text-xs font-medium text-gray-700">
          {t('meeting.links.note')}
        </label>
        <textarea
          id="link-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 2000))}
          placeholder={t('meeting.links.notePlaceholder')}
          className={`${inputCls} resize-y`}
        />
        <button
          type="submit"
          disabled={saving || !note.trim()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {t('meeting.links.addNote')}
        </button>
      </form>

      {/* document upload: feature-flagged off until the signed private flow ships */}
      <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Upload className="h-4 w-4" aria-hidden="true" /> {t('meeting.links.uploadTitle')}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {DOCUMENT_UPLOAD_ENABLED ? t('meeting.links.uploadReady') : t('meeting.links.uploadDisabled')}
        </p>
      </div>

      {submitted.length > 0 && (
        <section className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('meeting.links.submitted')}</h4>
          <ul className="mt-2 space-y-2">
            {submitted.map((item, i) => {
              const href = item.url ? safeHref(item.url) : null;
              return (
                <li key={`${item.kind}-${i}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {t(`meeting.links.kinds.${item.kind}`)}
                  </span>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="mt-0.5 block break-all text-pink-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      {item.label || item.url}
                    </a>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-gray-700">{item.note ?? item.url}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};

export default FilesLinksPanel;

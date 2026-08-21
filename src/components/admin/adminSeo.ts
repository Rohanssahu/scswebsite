// Admin routes must never be indexed. The public site has no SEO component
// (meta tags live in index.html), so this is the mechanism for per-route meta:
// a tiny imperative head patch that installs `noindex,nofollow` on mount and
// restores the document on unmount.
//
// The DOM surface is narrowed to an interface so the behaviour is unit-testable
// in the project's node test environment, with no jsdom dependency.

export const ROBOTS_NOINDEX = 'noindex,nofollow';
export const ADMIN_ROBOTS_SELECTOR = 'meta[name="robots"]';

export interface MetaElementLike {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  remove(): void;
}

export interface DocumentLike {
  title: string;
  head: { appendChild(node: MetaElementLike): void };
  querySelector(selector: string): MetaElementLike | null;
  createElement(tag: string): MetaElementLike;
}

/**
 * Install `<meta name="robots" content="noindex,nofollow">` and an admin title.
 * Returns the cleanup that puts the document back exactly as it was, so
 * navigating from /admin to a public page does not leave the site noindexed.
 */
export function applyAdminHead(doc: DocumentLike, title: string): () => void {
  const previousTitle = doc.title;
  doc.title = title;

  const existing = doc.querySelector(ADMIN_ROBOTS_SELECTOR);
  if (existing) {
    const previousContent = existing.getAttribute('content');
    existing.setAttribute('content', ROBOTS_NOINDEX);
    return () => {
      doc.title = previousTitle;
      if (previousContent === null) existing.remove();
      else existing.setAttribute('content', previousContent);
    };
  }

  const meta = doc.createElement('meta');
  meta.setAttribute('name', 'robots');
  meta.setAttribute('content', ROBOTS_NOINDEX);
  doc.head.appendChild(meta);
  return () => {
    doc.title = previousTitle;
    meta.remove();
  };
}

/** True for every route that must be hidden from crawlers and from the public chrome. */
export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

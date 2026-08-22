import React from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Visible breadcrumb trail. The same `items` array is passed to
 * `breadcrumbJsonLd()` in the SEO registry, so the structured data and the
 * trail a visitor sees can never describe different paths.
 *
 * The separator is a plain slash rather than a chevron so the trail reads
 * correctly in both LTR and RTL without needing to be mirrored.
 */
const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb" className="text-sm">
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.path} className="flex items-center gap-x-2">
            {isLast ? (
              <span aria-current="page" className="font-medium text-gray-900">
                {item.name}
              </span>
            ) : (
              <Link
                to={item.path}
                className="rounded text-gray-600 underline-offset-4 transition-colors hover:text-pink-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                {item.name}
              </Link>
            )}
            {!isLast && (
              <span aria-hidden="true" className="text-gray-400">
                /
              </span>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;

import React from 'react';

/**
 * Brand-gradient tile with a category icon, used wherever a card used to
 * hotlink an unrelated third-party stock photo (Unsplash, other companies'
 * blogs and CDNs). Those images misrepresented the work, could break or change
 * without notice, and cost a cross-origin request each — a locally rendered
 * tile is honest, instant and needs no network at all.
 *
 * `aria-hidden` because the surrounding card already carries the real title and
 * description; the tile is decoration.
 */
const VisualPlaceholder = ({
  icon: Icon,
  gradient = 'from-orange-500 via-pink-500 to-purple-600',
  className = 'h-48',
}: {
  icon: React.ElementType;
  gradient?: string;
  className?: string;
}) => (
  <div
    className={`flex w-full items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
    aria-hidden="true"
  >
    <Icon className="h-14 w-14 text-white/90" />
  </div>
);

export default VisualPlaceholder;

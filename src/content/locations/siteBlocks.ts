/**
 * The two short remote-delivery blocks that live outside `/locations`: the
 * homepage international-delivery section and the About page's remote-delivery
 * section.
 *
 * They sit in their own module because the homepage and About are eagerly
 * loaded routes. Keeping them apart from `./hub.ts` means those two pages get
 * the six sentences they render without dragging the whole `/locations` hub
 * copy into the main bundle.
 *
 * All three surfaces still describe the same arrangement, because this is the
 * only place the wording exists.
 */

/**
 * The short international-delivery block the homepage renders above its link
 * list of active markets.
 */
export const homeInternationalSection = {
  eyebrow: 'International delivery',
  title: 'Working with us from another country',
  sub: 'We build from one office in Indore, India, and deliver remotely. These are the markets with a page of their own — each one explains how a project is actually run from here.',
  linkLabel: 'See all locations',
  note:
    'Every international engagement is remote. We hold no office, entity or telephone number in any of these countries.',
};

/** The remote-delivery block on the About page. */
export const aboutRemoteDeliverySection = {
  eyebrow: 'Remote delivery',
  title: 'How we work with clients outside India',
  paragraphs: [
    'The team, the office and the company are in Indore, India. Clients in other countries are served remotely: we shift part of our working day to overlap theirs, run demonstrations and approvals online, and settle contract, invoicing and data-location questions before development starts.',
    'We keep a page per active market explaining what that looks like in practice. None of those pages claims a local office, a local entity or local staff, because there are none.',
  ],
  linkLabel: 'Locations we serve',
};

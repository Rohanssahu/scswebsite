// Guided website tour configuration for Buddy — Your SCS Guide.
// Steps target stable data-guide-id attributes; missing targets are skipped
// gracefully. Titles/texts are i18n keys under guide.tour.steps.

import { TourStep } from '@/types/virtualGuide';

function step(id: string, route: string, targetId: string): TourStep {
  return {
    id,
    route,
    targetId,
    titleKey: `guide.tour.steps.${id}.title`,
    textKey: `guide.tour.steps.${id}.text`,
  };
}

export const TOUR_STEPS: TourStep[] = [
  step('home-hero', '/', 'home-hero'),
  step('home-services', '/', 'home-services'),
  step('home-process', '/', 'home-process'),
  step('home-benefits', '/', 'home-benefits'),
  step('home-portfolio', '/', 'home-portfolio'),
  step('products', '/products', 'products-grid'),
  step('about', '/about', 'about-hero'),
  step('contact', '/contact', 'contact-form'),
  step('schedule', '/schedule-call', 'schedule-form'),
];

/** How long (ms) to wait for a step target to render before skipping it. */
export const TOUR_TARGET_TIMEOUT_MS = 3000;

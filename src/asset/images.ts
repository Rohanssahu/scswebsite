/**
 * The logo is referenced by its public URL rather than imported as a module
 * asset. Two reasons:
 *
 *  - Build-time prerendering renders these components through Vite's SSR
 *    pipeline, where a `import logo from './logo2.png'` resolves to the dev URL
 *    `/src/asset/logo2.png`. That path does not exist in `dist`, so every
 *    prerendered page shipped a broken logo until JavaScript booted.
 *  - `public/images/logo.png` was already a byte-for-byte duplicate of the
 *    imported file, so this also removes the copy.
 */
export const LOGO_URL = '/images/logo.png';

export const icon = {
  logos: LOGO_URL,
};

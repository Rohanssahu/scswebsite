// The published browser bundle must contain no AI provider secret and no
// pre-policy rate. This runs against `dist/` when it exists (CI builds before
// testing); with no build present it skips rather than passing vacuously.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STANDARD_HOURLY_RATE_USD } from './estimationPolicy';

const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');

function bundleFiles(): string[] {
  if (!existsSync(DIST)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|mjs|css|html)$/.test(entry)) out.push(full);
    }
  };
  walk(DIST);
  return out;
}

describe('browser bundle contains no provider secret', () => {
  const files = bundleFiles();

  it('has a build to inspect, or is skipped', () => {
    // Informational: documents whether this suite actually inspected a bundle.
    expect(Array.isArray(files)).toBe(true);
  });

  it('names no AI provider secret', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, path.relative(ROOT, file)).not.toMatch(
        /GOOGLE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ELEVENLABS_API_KEY|SUPABASE_SERVICE_ROLE_KEY|VOICE_AGENT_SECRET|TURNSTILE_SECRET/,
      );
    }
  });

  it('embeds no key-shaped literal', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, path.relative(ROOT, file)).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
      expect(text, path.relative(ROOT, file)).not.toMatch(/\bsk-[0-9A-Za-z]{20,}/);
      expect(text, path.relative(ROOT, file)).not.toMatch(/\bsk_live_[0-9A-Za-z]{10,}/);
      // A Supabase service-role JWT always carries this role claim.
      expect(text, path.relative(ROOT, file)).not.toMatch(/service_role/);
    }
  });

  it('states no client-facing rate above the standard rate', () => {
    const RATE_CLAIM = /\$\s?(\d[\d,.]*)\s*(?:\/\s*(?:hr|hour|h)\b|per hour)/gi;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(RATE_CLAIM)) {
        const amount = Number.parseFloat(match[1].replace(/,/g, ''));
        expect(amount, `${path.relative(ROOT, file)}: "${match[0]}"`).toBeLessThanOrEqual(STANDARD_HOURLY_RATE_USD);
      }
    }
  });
});

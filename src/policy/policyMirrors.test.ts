// The estimation policy exists once and is mirrored into the three runtimes
// that cannot share a package (Vite frontend, Deno Edge Functions, Node agent
// worker). This test is what makes the mirroring safe: change a rate in one
// tree and the suite fails until every tree matches.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

const CANONICAL = 'src/policy/estimationPolicy.ts';
const MIRRORS = ['supabase/functions/_shared/estimationPolicy.ts', 'agent/src/estimationPolicy.ts'];

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('estimation policy mirrors', () => {
  const canonical = read(CANONICAL);

  it.each(MIRRORS)('%s is byte-identical to the canonical policy', (mirror) => {
    expect(read(mirror)).toBe(canonical);
  });

  it('has no imports, so it stays runtime-portable', () => {
    for (const file of [CANONICAL, ...MIRRORS]) {
      expect(read(file)).not.toMatch(/^\s*import\s/m);
      expect(read(file)).not.toMatch(/\brequire\s*\(/);
    }
  });
});

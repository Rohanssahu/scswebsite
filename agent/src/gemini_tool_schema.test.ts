// =============================================================================
// Regression guard — every tool schema must stay Gemini-safe.
//
// The active LLM provider is Gemini (src/providers/llm.ts), and its function
// declarations are converted from these zod schemas on EVERY request. Gemini's
// Schema proto accepts `enum` values as STRINGS only, so a single
// `z.literal(true)` in any tool made the whole request 400 INVALID_ARGUMENT —
// and @livekit/agents swallows that: it retries, emits `llm_error` and closes
// the stream with no chunks, so Buddy simply never answered the client while
// the scripted (TTS-only) lines kept playing. See src/tool_params.ts.
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { llm } from '@livekit/agents';
import { describe, expect, it } from 'vitest';
import { CONSENT_REQUIRED_REPLY, submissionToolParameters } from './tool_params.js';

const here = dirname(fileURLToPath(import.meta.url));

/** File contents with comments stripped, so prose about a rule never satisfies it. */
const source = (file: string) =>
  readFileSync(join(here, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');

/** Every JSON-Schema node in the tree, root included. */
function nodes(schema: unknown): Record<string, unknown>[] {
  if (schema === null || typeof schema !== 'object') return [];
  const self = schema as Record<string, unknown>;
  const children = Object.values(self).flatMap((value) =>
    Array.isArray(value) ? value.flatMap(nodes) : nodes(value),
  );
  return [self, ...children];
}

const jsonSchemaOf = (parameters: unknown) =>
  (llm as unknown as { toJsonSchema: (p: unknown, strict: boolean) => unknown }).toJsonSchema(
    parameters,
    false,
  );

describe('submission tool parameters', () => {
  it('accepts a consenting call and defaults the optional flags', () => {
    expect(submissionToolParameters.parse({ contact_consent: true })).toEqual({
      contact_consent: true,
      human_review: false,
    });
  });

  it('accepts contact_consent: false rather than rejecting the call', () => {
    // The refusal belongs in the tool body: a schema that can only express
    // `true` is exactly what broke every Gemini request.
    expect(submissionToolParameters.parse({ contact_consent: false }).contact_consent).toBe(false);
    expect(CONSENT_REQUIRED_REPLY).toMatch(/consent/i);
  });

  it('rejects unknown fields', () => {
    expect(() => submissionToolParameters.parse({ contact_consent: true, admin: true })).toThrow();
  });

  it('emits no `const` and no non-string `enum` — the two Gemini rejects', () => {
    for (const node of nodes(jsonSchemaOf(submissionToolParameters))) {
      expect(node).not.toHaveProperty('const');
      if (Array.isArray(node.enum)) {
        for (const value of node.enum) expect(typeof value).toBe('string');
      }
    }
  });
});

describe('tool definitions', () => {
  it('use no z.literal() anywhere — it compiles to the `const` Gemini rejects', () => {
    for (const file of ['agent.ts', 'meeting.ts', 'tool_params.ts', 'estimate.ts', 'state.ts']) {
      expect(source(file), file).not.toMatch(/z\.literal\(/);
    }
  });

  it('enforce contact consent in the tool body instead of in the schema', () => {
    for (const file of ['agent.ts', 'meeting.ts']) {
      expect(source(file), file).toMatch(/if \(!contact_consent\) \{/);
      expect(source(file), file).toMatch(/CONSENT_REQUIRED_REPLY/);
    }
  });
});

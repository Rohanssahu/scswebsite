// =============================================================================
// Buddy agent — SCS knowledge loader.
//
// Buddy is only allowed to state facts present in knowledge/scs-knowledge.json
// (version-controlled). This module loads, validates and renders that file
// for the system prompt. If the file is missing or malformed the worker
// refuses to start — an ungrounded Buddy must never run.
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
});

export const knowledgeSchema = z.object({
  version: z.string().min(1),
  company: z.object({ name: z.string().min(1), positioning: z.string().min(1) }),
  services: z.array(serviceSchema).min(1),
  engagementProcess: z.array(z.string().min(1)).min(1),
  supportedTechnologies: z.array(z.string().min(1)).min(1),
  benefits: z.array(z.string().min(1)).min(1),
  hourlyEngagementModel: z.object({
    description: z.string().min(1),
    minimumEngagementHours: z.number().int().positive().nullable(),
    minimumEngagementNote: z.string(),
  }),
  weeklyCapacity: z.object({
    hoursPerWeek: z.number().int().min(1).max(168),
    explanation: z.string().min(1),
  }),
  humanReviewProcess: z.string().min(1),
  contactOptions: z.array(
    z.object({ id: z.string().min(1), label: z.string().min(1), path: z.string().nullable() }),
  ),
  prohibitedClaims: z.array(z.string().min(1)).min(1),
});

export type ScsKnowledge = z.infer<typeof knowledgeSchema>;

/** Parse + validate raw JSON text. Exported separately for unit tests. */
export function parseKnowledge(rawJson: string): ScsKnowledge {
  return knowledgeSchema.parse(JSON.parse(rawJson));
}

let cached: ScsKnowledge | null = null;

export function loadKnowledge(): ScsKnowledge {
  if (cached) return cached;
  const here = dirname(fileURLToPath(import.meta.url));
  // Works from src/ (tsx dev) and dist/ (compiled) alike.
  const path = join(here, '..', 'knowledge', 'scs-knowledge.json');
  cached = parseKnowledge(readFileSync(path, 'utf8'));
  return cached;
}

/** Render the knowledge base as a compact grounding block for the prompt. */
export function renderKnowledge(k: ScsKnowledge): string {
  const lines: string[] = [
    `COMPANY: ${k.company.name} — ${k.company.positioning}`,
    '',
    'SERVICES (the ONLY services you may offer):',
    ...k.services.map((s) => `- ${s.name}: ${s.summary}`),
    '',
    'ENGAGEMENT PROCESS:',
    ...k.engagementProcess.map((step, i) => `${i + 1}. ${step}`),
    '',
    `SUPPORTED TECHNOLOGIES: ${k.supportedTechnologies.join(', ')}`,
    '',
    'BENEFITS YOU MAY MENTION:',
    ...k.benefits.map((b) => `- ${b}`),
    '',
    `PRICING MODEL: ${k.hourlyEngagementModel.description}`,
    k.hourlyEngagementModel.minimumEngagementHours === null
      ? `NOTE: ${k.hourlyEngagementModel.minimumEngagementNote}`
      : `Minimum engagement: ${k.hourlyEngagementModel.minimumEngagementHours} hours.`,
    '',
    `CAPACITY: ${k.weeklyCapacity.hoursPerWeek} hours/week. ${k.weeklyCapacity.explanation}`,
    '',
    `HUMAN REVIEW: ${k.humanReviewProcess}`,
    '',
    'CONTACT OPTIONS:',
    ...k.contactOptions.map((c) => `- ${c.label}${c.path ? ` (${c.path})` : ''}`),
    '',
    'YOU MUST NEVER CLAIM:',
    ...k.prohibitedClaims.map((p) => `- ${p}`),
  ];
  return lines.join('\n');
}

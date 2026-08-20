// =============================================================================
// Buddy agent — input guards and contact-detail helpers.
//
// Visitor speech and text are untrusted. Real protection comes from
// architecture (strict tool schemas, whitelisted state, server-side
// arithmetic, fixed email recipients, no database or URL access for the
// model). The heuristics here are an additional tripwire that flags likely
// prompt-injection attempts so they can be audited as guard_triggered events
// — they never need to be perfect to keep the system safe.
// =============================================================================

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\b.{0,30}\b(instructions|prompts|rules)/i,
  /disregard\b.{0,30}\b(system|previous|prior|instructions)/i,
  /you are (now|no longer)\s/i,
  /(reveal|show|print|repeat|tell me) (your|the) (system|hidden|initial) (prompt|instructions|message)/i,
  /\b(api|secret|private|service.?role)\s*key\b/i,
  /system\s*prompt/i,
  /\bjailbreak\b/i,
  /developer mode/i,
  /pretend (to be|you are)/i,
  /act as (an?|the) (admin|administrator|developer|root|system)/i,
  /(set|mark|change) (the )?(price|estimate|quote|status|discount) (to|as)\b/i,
  /\bapprove(d)? (the )?(quote|quotation|project|payment)\b/i,
  /send (an? )?(email|mail|copy) to\b/i,
  /\b(select|insert|update|delete|drop)\b.{0,40}\b(from|into|table)\b/i,
  /<\s*script\b/i,
];

export interface GuardResult {
  flagged: boolean;
  /** Short machine label for the audit event; never echoes visitor text. */
  reason: string | null;
}

/** Screen one visitor utterance for likely injection/abuse patterns. */
export function screenUserInput(text: string): GuardResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { flagged: true, reason: pattern.source.slice(0, 60) };
    }
  }
  return { flagged: false, reason: null };
}

/** Cap and clean one utterance before it enters the transcript buffer. */
export function sanitizeUtterance(text: string, maxLen = 2000): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

// --- contact details ------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned;
}

/** "a s h a at example dot com" style spoken read-back for confirmation. */
export function spellEmailForReadback(email: string): string {
  return email
    .toLowerCase()
    .split('')
    .map((ch) => (ch === '@' ? 'at' : ch === '.' ? 'dot' : ch))
    .join(' ');
}

/** Digit-by-digit phone read-back. */
export function spellPhoneForReadback(phone: string): string {
  const plus = phone.startsWith('+') ? 'plus ' : '';
  return plus + phone.replace(/\D/g, '').split('').join(' ');
}

// --- transcript buffer -------------------------------------------------------------

export interface TranscriptEntry {
  role: 'user' | 'buddy';
  text: string;
  at: number;
}

/** Size-capped rolling transcript. Oldest entries drop first. */
export class TranscriptBuffer {
  private entries: TranscriptEntry[] = [];
  private chars = 0;

  constructor(private maxChars: number) {}

  add(role: 'user' | 'buddy', rawText: string, at: number): void {
    const text = sanitizeUtterance(rawText);
    if (!text) return;
    this.entries.push({ role, text, at });
    this.chars += text.length;
    while (this.chars > this.maxChars && this.entries.length > 1) {
      const dropped = this.entries.shift();
      if (dropped) this.chars -= dropped.text.length;
    }
  }

  /** Longer excerpt — stored ONLY with explicit visitor consent. */
  excerpt(maxLen = 8000): string {
    return this.entries
      .map((e) => `${e.role === 'user' ? 'Visitor' : 'Buddy'}: ${e.text}`)
      .join('\n')
      .slice(-maxLen);
  }

  get turnCount(): number {
    return this.entries.filter((e) => e.role === 'user').length;
  }
}

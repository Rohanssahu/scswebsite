// Client-side validation for lead forms. Mirrors the Edge Function limits
// (supabase/functions/submit-lead/validation.ts) so visitors get instant,
// accessible feedback — but the server always re-validates; this layer is
// UX only, never the security boundary.
//
// Validators return i18n KEYS (translated by the component) or null when valid.

export const LEAD_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 30 },
  company: { max: 150 },
  summary: { min: 20, max: 5000 },
  reviewMessage: { max: 2000 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateName(value: string): string | null {
  const v = value.trim();
  if (v.length < LEAD_LIMITS.name.min || v.length > LEAD_LIMITS.name.max) {
    return 'leadForm.errors.name';
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v || v.length > LEAD_LIMITS.email.max || !EMAIL_RE.test(v)) {
    return 'leadForm.errors.email';
  }
  return null;
}

/** Keep a leading +, drop separators; null when it can't be a phone number. */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned.slice(0, LEAD_LIMITS.phone.max);
}

export function validatePhone(value: string, required: boolean): string | null {
  const v = value.trim();
  if (!v) return required ? 'leadForm.errors.phoneRequired' : null;
  return normalizePhone(v) ? null : 'leadForm.errors.phone';
}

export function validateCompany(value: string): string | null {
  return value.trim().length > LEAD_LIMITS.company.max ? 'leadForm.errors.company' : null;
}

export function validateSummary(value: string): string | null {
  const v = value.trim();
  if (v.length < LEAD_LIMITS.summary.min) return 'leadForm.errors.summaryShort';
  if (v.length > LEAD_LIMITS.summary.max) return 'leadForm.errors.summaryLong';
  return null;
}

export function validateReviewMessage(value: string): string | null {
  return value.trim().length > LEAD_LIMITS.reviewMessage.max
    ? 'leadForm.errors.messageLong'
    : null;
}

export function validateRequired(value: string, errorKey: string): string | null {
  return value.trim() ? null : errorKey;
}

export type FieldErrors = Record<string, string>;

export interface ContactFields {
  name: string;
  email: string;
  message: string;
  company?: string;
}

export function validateContactForm(fields: ContactFields): FieldErrors {
  const errors: FieldErrors = {};
  const name = validateName(fields.name);
  if (name) errors.name = name;
  const email = validateEmail(fields.email);
  if (email) errors.email = email;
  const message = validateSummary(fields.message);
  if (message) errors.message = message;
  const company = validateCompany(fields.company ?? '');
  if (company) errors.company = company;
  return errors;
}

export interface ConsultationFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  projectMode: string;
  service: string;
  requirement: string;
  budgetRange: string;
  timeline: string;
  contactMethod: string;
  consent: boolean;
}

export function validateConsultationForm(fields: ConsultationFields): FieldErrors {
  const errors: FieldErrors = {};
  const name = validateName(fields.name);
  if (name) errors.name = name;
  const email = validateEmail(fields.email);
  if (email) errors.email = email;
  const phone = validatePhone(fields.phone, true);
  if (phone) errors.phone = phone;
  const company = validateCompany(fields.company);
  if (company) errors.company = company;
  if (fields.projectMode !== 'new' && fields.projectMode !== 'existing') {
    errors.projectMode = 'leadForm.errors.projectMode';
  }
  if (!fields.service.trim()) errors.service = 'leadForm.errors.service';
  const requirement = validateSummary(fields.requirement);
  if (requirement) errors.requirement = requirement;
  if (!fields.budgetRange.trim()) errors.budgetRange = 'leadForm.errors.budgetRange';
  if (!fields.timeline.trim()) errors.timeline = 'leadForm.errors.timeline';
  if (!['email', 'phone', 'whatsapp'].includes(fields.contactMethod)) {
    errors.contactMethod = 'leadForm.errors.contactMethod';
  }
  if (!fields.consent) errors.consent = 'leadForm.errors.consent';
  return errors;
}

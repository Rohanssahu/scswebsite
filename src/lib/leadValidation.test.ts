import { describe, expect, it } from 'vitest';
import {
  normalizePhone,
  validateConsultationForm,
  validateContactForm,
  validateEmail,
  validateName,
  validatePhone,
  validateReviewMessage,
  validateSummary,
} from '@/lib/leadValidation';

describe('validateName', () => {
  it('accepts a normal name', () => {
    expect(validateName('Rohan Sahu')).toBeNull();
  });
  it('rejects too-short and too-long names', () => {
    expect(validateName('A')).toBe('leadForm.errors.name');
    expect(validateName('x'.repeat(101))).toBe('leadForm.errors.name');
  });
  it('trims whitespace before checking', () => {
    expect(validateName('   A   ')).toBe('leadForm.errors.name');
  });
});

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });
  it('rejects invalid formats', () => {
    for (const bad of ['', 'plain', 'a@b', 'a b@c.com', '@x.com', 'a@.com']) {
      expect(validateEmail(bad)).toBe('leadForm.errors.email');
    }
  });
  it('rejects emails over 254 characters', () => {
    expect(validateEmail(`${'x'.repeat(250)}@example.com`)).toBe('leadForm.errors.email');
  });
});

describe('normalizePhone / validatePhone', () => {
  it('normalizes separators and keeps a leading +', () => {
    expect(normalizePhone('+91 78286-90192')).toBe('+917828690192');
    expect(normalizePhone('(0731) 123 4567')).toBe('07311234567');
  });
  it('rejects non-phone input', () => {
    expect(normalizePhone('call me')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });
  it('is optional unless required', () => {
    expect(validatePhone('', false)).toBeNull();
    expect(validatePhone('', true)).toBe('leadForm.errors.phoneRequired');
    expect(validatePhone('abc', false)).toBe('leadForm.errors.phone');
  });
});

describe('validateSummary', () => {
  it('enforces 20–5000 characters', () => {
    expect(validateSummary('too short')).toBe('leadForm.errors.summaryShort');
    expect(validateSummary('x'.repeat(5001))).toBe('leadForm.errors.summaryLong');
    expect(validateSummary('I need a web shop for my bakery business.')).toBeNull();
  });
});

describe('validateReviewMessage', () => {
  it('allows empty and enforces the 2000-char cap', () => {
    expect(validateReviewMessage('')).toBeNull();
    expect(validateReviewMessage('x'.repeat(2001))).toBe('leadForm.errors.messageLong');
  });
});

describe('validateContactForm', () => {
  it('returns no errors for a valid submission', () => {
    expect(
      validateContactForm({
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'I would like a quote for a mobile app project.',
      }),
    ).toEqual({});
  });
  it('collects every failing field', () => {
    const errors = validateContactForm({ name: '', email: 'nope', message: 'hi' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name']);
  });
});

describe('validateConsultationForm', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+917828690192',
    company: '',
    projectMode: 'new',
    service: 'web-development',
    requirement: 'A storefront with online payments and delivery tracking.',
    budgetRange: '$1,000 – $5,000',
    timeline: '1–3 months',
    contactMethod: 'whatsapp',
    consent: true,
  };

  it('accepts a fully valid form', () => {
    expect(validateConsultationForm(valid)).toEqual({});
  });
  it('requires phone, mode, service, budget, timeline, method and consent', () => {
    const errors = validateConsultationForm({
      ...valid,
      phone: '',
      projectMode: '',
      service: '',
      budgetRange: '',
      timeline: '',
      contactMethod: '',
      consent: false,
    });
    expect(Object.keys(errors).sort()).toEqual([
      'budgetRange',
      'consent',
      'contactMethod',
      'phone',
      'projectMode',
      'service',
      'timeline',
    ]);
  });
});

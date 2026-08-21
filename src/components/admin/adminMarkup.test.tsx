// Markup contracts for the dashboard screens.
//
// The project's test environment is node (no jsdom, no testing-library), so —
// exactly like HoneypotField.test.tsx — these render to static markup and assert
// on the HTML. That is enough for the things that matter here: the consent gate
// on transcripts, safe anchors, the preliminary-estimate label, the absence of a
// delete action, and the absence of any public-site chrome under /admin.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AdminLoginCard, { type AdminLoginCardProps } from './AdminLoginCard';
import LeadsTable from './LeadsTable';
import LeadDetailView from './LeadDetailView';
import AdminStatCards from './AdminStatCards';
import UnsubmittedConsultations from './UnsubmittedConsultations';
import { ROBOTS_NOINDEX, applyAdminHead, isAdminPath } from './adminSeo';
import type {
  AdminConsultationRow,
  AdminLeadDetail,
  AdminLeadRow,
  AdminMessageRow,
} from '@/services/admin/adminTypes';

const routed = (node: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

// --- fixtures -----------------------------------------------------------------

const lead: AdminLeadRow = {
  id: '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60',
  reference_code: 'SCS-4F7K2P9Q',
  lead_type: 'consultation',
  source: '/schedule-call',
  name: 'Asha Rao',
  email: 'asha@example.test',
  phone: '+91 98765 43210',
  company: 'Rao Labs',
  country: 'India',
  preferred_contact_method: 'whatsapp',
  preferred_language: 'en',
  service: 'Web development',
  project_mode: 'new',
  status: 'new',
  human_review_requested: false,
  created_at: '2026-08-21T14:05:00.000Z',
  updated_at: '2026-08-21T14:05:00.000Z',
  requirement_mode: 'new',
  meeting_reference: 'SCSM-ABCDEFGHJK',
  meeting_status: 'completed',
  review_status: null,
  estimate_kind: 'consultation_proposal',
  estimate_currency: 'USD',
  estimate_hours_min: 320,
  estimate_hours_max: 420,
  estimate_cost_min: 12000,
  estimate_cost_max: 18000,
};

const meeting = (overrides: Partial<AdminConsultationRow> = {}): AdminConsultationRow =>
  ({
    id: 'meeting-1',
    lead_id: lead.id,
    public_reference: 'SCSM-ABCDEFGHJK',
    meeting_kind: 'scheduled',
    status: 'completed',
    review_status: 'none',
    name: 'Asha Rao',
    email: 'asha@example.test',
    phone: null,
    company: null,
    client_timezone: 'Asia/Kolkata',
    scheduled_at: '2026-08-21T13:00:00.000Z',
    selected_language: 'en',
    consent_at: '2026-08-21T12:55:00.000Z',
    transcript_consent: false,
    transcript_consent_at: null,
    analysis_snapshot: {},
    requirements: {},
    requirement_summary: 'Marketplace for local tutors.',
    join_count: 1,
    finalized_at: '2026-08-21T14:05:00.000Z',
    started_at: '2026-08-21T13:02:00.000Z',
    ended_at: '2026-08-21T14:00:00.000Z',
    created_at: '2026-08-21T12:55:00.000Z',
    ...overrides,
  }) as AdminConsultationRow;

const transcriptLine = (content: string): AdminMessageRow => ({
  id: 'msg-1',
  meeting_id: 'meeting-1',
  lead_id: lead.id,
  sender: 'client',
  content,
  created_at: '2026-08-21T13:05:00.000Z',
});

const detail = (overrides: Partial<AdminLeadDetail> = {}): AdminLeadDetail => ({
  lead,
  requirements: [],
  estimates: [],
  reviews: [],
  consultations: [],
  proposals: [],
  artifacts: [],
  transcript: [],
  notes: [],
  ...overrides,
});

const detailProps = (data: AdminLeadDetail) => ({
  detail: data,
  currentUserId: 'user-1',
  statusSaving: false,
  statusError: null,
  noteSaving: false,
  noteError: null,
  onStatusChange: () => {},
  onAddNote: () => {},
  onUpdateNote: () => {},
});

const loginProps = (overrides: Partial<AdminLoginCardProps> = {}): AdminLoginCardProps => ({
  email: '',
  password: '',
  showPassword: false,
  submitting: false,
  errorMessage: null,
  notice: null,
  onEmailChange: () => {},
  onPasswordChange: () => {},
  onTogglePassword: () => {},
  onSubmit: () => {},
  ...overrides,
});

// --- login screen -------------------------------------------------------------

describe('login screen', () => {
  it('shows the SCS branding, both fields and a way back to the website', () => {
    const html = renderToStaticMarkup(<AdminLoginCard {...loginProps()} />);
    expect(html).toContain('Owner Dashboard');
    expect(html).toContain('alt="SCS Softwares"');
    expect(html).toContain('id="admin-email"');
    expect(html).toContain('id="admin-password"');
    expect(html).toContain('Back to website');
    // brand gradient, same ramp as the public site
    expect(html).toContain('from-orange-500 via-pink-500 to-purple-600');
  });

  it('masks the password until the show control is toggled', () => {
    expect(renderToStaticMarkup(<AdminLoginCard {...loginProps()} />)).toContain('type="password"');
    const shown = renderToStaticMarkup(
      <AdminLoginCard {...loginProps({ showPassword: true, password: 'secret' })} />,
    );
    expect(shown).toContain('Hide password');
    expect(shown).not.toContain('type="password"');
  });

  it('labels both inputs and keeps focus styles', () => {
    const html = renderToStaticMarkup(<AdminLoginCard {...loginProps()} />);
    expect(html).toContain('for="admin-email"');
    expect(html).toContain('for="admin-password"');
    expect(html).toContain('focus-visible:ring-pink-500');
  });

  it('disables the button while a submit is in flight', () => {
    const html = renderToStaticMarkup(<AdminLoginCard {...loginProps({ submitting: true })} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('Signing in');
  });

  it('renders an error as an alert without revealing whether the account exists', () => {
    const html = renderToStaticMarkup(
      <AdminLoginCard {...loginProps({ errorMessage: 'Email or password is incorrect.' })} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Email or password is incorrect.');
    expect(html).not.toContain('not found');
    expect(html).not.toContain('no such user');
  });

  it('renders the unauthorized message when the account is not staff', () => {
    const html = renderToStaticMarkup(
      <AdminLoginCard
        {...loginProps({ errorMessage: 'This account does not have dashboard access.' })}
      />,
    );
    expect(html).toContain('This account does not have dashboard access.');
  });

  it('offers no signup or password-reset path', () => {
    const html = renderToStaticMarkup(<AdminLoginCard {...loginProps()} />).toLowerCase();
    expect(html).not.toContain('sign up');
    expect(html).not.toContain('create account');
    expect(html).not.toContain('forgot');
  });
});

// --- leads list ---------------------------------------------------------------

describe('leads list states', () => {
  const props = {
    rows: [],
    loading: false,
    errorMessage: null,
    searching: false,
    onRetry: () => {},
  };

  it('renders a skeleton with a live region while loading', () => {
    const html = routed(<LeadsTable {...props} loading />);
    expect(html).toContain('animate-pulse');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Loading leads');
  });

  it('renders the first-run empty state', () => {
    const html = routed(<LeadsTable {...props} />);
    expect(html).toContain('No leads yet');
    expect(html).not.toContain('No leads match');
  });

  it('renders a distinct no-result state while filters are active', () => {
    const html = routed(<LeadsTable {...props} searching />);
    expect(html).toContain('No leads match this search');
    expect(html).toContain('clear the filters');
  });

  it('renders an error with a retry affordance', () => {
    const html = routed(<LeadsTable {...props} errorMessage="Could not load data." />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Could not load data.');
    expect(html).toContain('Try again');
  });

  it('renders every required column and links each row to its detail route', () => {
    const html = routed(<LeadsTable {...props} rows={[lead]} />);
    for (const column of [
      'Reference',
      'Client',
      'Project type',
      'Source',
      'Status',
      'Preliminary estimate',
      'Created',
    ]) {
      expect(html, column).toContain(column);
    }
    expect(html).toContain('SCS-4F7K2P9Q');
    expect(html).toContain('Asha Rao');
    expect(html).toContain('New project');
    expect(html).toContain('AI consultation');
    expect(html).toContain('$12,000 – $18,000');
    expect(html).toContain('21 Aug 2026');
    expect(html).toContain(`href="/admin/leads/${lead.id}"`);
  });

  it('labels the money as preliminary and says so when there is none', () => {
    expect(routed(<LeadsTable {...props} rows={[lead]} />)).toContain('Preliminary');
    const noEstimate = routed(
      <LeadsTable
        {...props}
        rows={[{ ...lead, estimate_cost_min: null, estimate_cost_max: null }]}
      />,
    );
    expect(noEstimate).toContain('Not estimated');
    expect(noEstimate).not.toContain('$0');
  });

  it('shows the loading and empty states of the summary tiles', () => {
    expect(renderToStaticMarkup(<AdminStatCards stats={null} loading />)).toContain('animate-pulse');
    const filled = renderToStaticMarkup(
      <AdminStatCards
        stats={{ new_leads: 7, consultations: 3, reviews_requested: 1, qualified_leads: 2 }}
        loading={false}
      />,
    );
    expect(filled).toContain('New leads');
    expect(filled).toContain('Qualified / converted');
    expect(filled).toContain('>7<');
  });

  it('shows unsubmitted consultations truthfully instead of inventing leads', () => {
    const html = renderToStaticMarkup(
      <UnsubmittedConsultations
        loading={false}
        rows={[
          {
            id: 'm1',
            public_reference: 'SCSM-ZZZZZZZZZZ',
            meeting_kind: 'scheduled',
            status: 'expired',
            review_status: 'none',
            name: 'Abandoned Client',
            email: 'gone@example.test',
            phone: null,
            company: null,
            scheduled_at: '2026-08-20T09:00:00.000Z',
            started_at: null,
            ended_at: null,
            selected_language: 'en',
            transcript_consent: false,
            join_count: 0,
            requirement_summary: null,
            created_at: '2026-08-19T09:00:00.000Z',
          },
        ]}
      />,
    );
    expect(html).toContain('Unsubmitted consultations');
    expect(html).toContain('SCSM-ZZZZZZZZZZ');
    expect(html).toContain('Expired');
    expect(renderToStaticMarkup(<UnsubmittedConsultations loading={false} rows={[]} />)).toContain(
      'Every consultation so far has been submitted.',
    );
  });
});

// --- lead detail --------------------------------------------------------------

describe('lead detail', () => {
  it('shows the client block with copy and WhatsApp actions', () => {
    const html = routed(<LeadDetailView {...detailProps(detail())} />);
    expect(html).toContain('SCS-4F7K2P9Q');
    expect(html).toContain('asha@example.test');
    expect(html).toContain('Copy email');
    expect(html).toContain('Copy reference');
    expect(html).toContain('href="https://wa.me/919876543210"');
    expect(html).toContain('href="tel:+919876543210"');
    expect(html).toContain('Back to leads');
  });

  it('offers status and notes but never a delete action', () => {
    const html = routed(<LeadDetailView {...detailProps(detail())} />);
    for (const status of ['New', 'Contacted', 'Qualified', 'Proposal sent', 'Hired', 'Closed']) {
      expect(html, status).toContain(`>${status}</option>`);
    }
    expect(html).toContain('Internal notes');
    expect(html.toLowerCase()).not.toContain('delete');
    expect(html.toLowerCase()).not.toContain('remove lead');
  });

  it('states honestly when nothing was captured', () => {
    const html = routed(<LeadDetailView {...detailProps(detail())} />);
    expect(html).toContain('No analysis or estimate exists for this lead.');
    expect(html).toContain('This lead did not come from an AI consultation meeting.');
    expect(html).toContain('No human review was requested.');
    expect(html).toContain('No internal notes yet.');
    expect(html).toContain('The client did not share any links or documents.');
  });

  it('labels every generated figure as preliminary', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(
          detail({
            consultations: [meeting()],
            proposals: [
              {
                id: 'p1',
                meeting_id: 'meeting-1',
                lead_id: lead.id,
                version: 2,
                status: 'preliminary',
                requires_human_review: true,
                currency: 'USD',
                config_version: 'consultation-v1',
                proposal: { human_roles: ['Backend engineer'], risks: ['Payment gateway approval'] },
                total_hours_min: 320,
                total_hours_max: 420,
                total_cost_min: 12000,
                total_cost_max: 18000,
                duration_weeks_min: 10,
                duration_weeks_max: 14,
                weekly_capacity_hours: 40,
                confidence: 'medium',
                created_at: '2026-08-21T14:00:00.000Z',
              },
            ],
          }),
        )}
      />,
    );
    expect(html).toContain('Preliminary estimate');
    expect(html).toContain('Not a final quotation');
    expect(html).toContain('$12,000 – $18,000');
    expect(html).toContain('320 – 420 hours');
    expect(html).toContain('10 – 14 weeks');
    expect(html).toContain('40 hours / week');
    expect(html).toContain('Backend engineer');
    expect(html).toContain('Payment gateway approval');
    expect(html).toContain('AI consultation (proposal v2)');
  });

  it('hides the transcript entirely when consent was not given', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(
          detail({
            consultations: [meeting({ transcript_consent: false })],
            // even if rows somehow arrived, the consent gate wins
            transcript: [transcriptLine('SECRET CLIENT SENTENCE')],
          }),
        )}
      />,
    );
    expect(html).toContain('did not consent to transcript storage');
    expect(html).not.toContain('SECRET CLIENT SENTENCE');
  });

  it('shows the transcript when consent was given, and says so when it is empty', () => {
    const withLines = routed(
      <LeadDetailView
        {...detailProps(
          detail({
            consultations: [meeting({ transcript_consent: true })],
            transcript: [transcriptLine('We need multi-currency support')],
          }),
        )}
      />,
    );
    expect(withLines).toContain('We need multi-currency support');
    expect(withLines).toContain('Transcript consent');

    const empty = routed(
      <LeadDetailView
        {...detailProps(detail({ consultations: [meeting({ transcript_consent: true })] }))}
      />,
    );
    expect(empty).toContain('no transcript lines were recorded');
  });

  it('never offers raw audio', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(detail({ consultations: [meeting({ transcript_consent: true })] }))}
      />,
    );
    expect(html).not.toContain('<audio');
    expect(html).toContain('Audio is never stored');
  });

  it('renders client links only as safe https anchors', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(
          detail({
            consultations: [meeting()],
            artifacts: [
              {
                id: 'a1',
                meeting_id: 'meeting-1',
                lead_id: lead.id,
                kind: 'repository',
                url: 'https://github.com/acme/repo',
                host: 'github.com',
                label: 'Main repo',
                note: null,
                created_at: '2026-08-21T13:10:00.000Z',
              },
              {
                id: 'a2',
                meeting_id: 'meeting-1',
                lead_id: lead.id,
                kind: 'other_link',
                url: 'javascript:alert(document.cookie)',
                host: null,
                label: null,
                note: null,
                created_at: '2026-08-21T13:11:00.000Z',
              },
              {
                id: 'a3',
                meeting_id: 'meeting-1',
                lead_id: lead.id,
                kind: 'note',
                url: null,
                host: null,
                label: null,
                note: '<img src=x onerror=alert(1)>',
                created_at: '2026-08-21T13:12:00.000Z',
              },
            ],
          }),
        )}
      />,
    );
    expect(html).toContain('href="https://github.com/acme/repo"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    // the hostile URL never becomes an href
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('not a valid https link');
    // uploaded/typed content is escaped, never injected as markup
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('renders client-submitted answers as labelled text', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(
          detail({
            requirements: [
              {
                id: 'r1',
                lead_id: lead.id,
                mode: 'new',
                answers: { platform: 'Web + Mobile', features: ['Chat', 'Payments'] },
                requirement_summary: 'A tutoring marketplace.',
                demo_estimate: { health_score: 72 },
                estimate_version: 'demo-v1',
                status: 'preliminary',
                created_at: '2026-08-21T14:00:00.000Z',
              },
            ],
          }),
        )}
      />,
    );
    expect(html).toContain('A tutoring marketplace.');
    expect(html).toContain('Platform');
    expect(html).toContain('Web + Mobile');
    expect(html).toContain('Chat, Payments');
    expect(html).toContain('72 / 100');
  });

  it('shows the human-review block when one exists', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(
          detail({
            lead: { ...lead, human_review_requested: true },
            reviews: [
              {
                id: 'h1',
                lead_id: lead.id,
                requirement_id: null,
                reason: 'visitor_requested_review',
                visitor_message: 'Please call me before quoting.',
                status: 'requested',
                assigned_to: null,
                reviewed_at: null,
                created_at: '2026-08-21T14:06:00.000Z',
                updated_at: '2026-08-21T14:06:00.000Z',
              },
            ],
          }),
        )}
      />,
    );
    expect(html).toContain('Human review');
    expect(html).toContain('Please call me before quoting.');
    expect(html).toContain('requested');
  });

  it('lets the author edit their own note only', () => {
    const note = {
      id: 'n1',
      lead_id: lead.id,
      author_id: 'user-1',
      note: 'Called, sending a proposal.',
      created_at: '2026-08-21T15:00:00.000Z',
      updated_at: '2026-08-21T15:00:00.000Z',
    };
    const mine = routed(<LeadDetailView {...detailProps(detail({ notes: [note] }))} />);
    expect(mine).toContain('Called, sending a proposal.');
    expect(mine).toContain('>Edit</button>');

    const someoneElses = routed(
      <LeadDetailView
        {...detailProps(detail({ notes: [{ ...note, author_id: 'user-2' }] }))}
      />,
    );
    expect(someoneElses).toContain('Called, sending a proposal.');
    expect(someoneElses).not.toContain('>Edit</button>');
  });

  it('surfaces save failures as accessible alerts', () => {
    const html = routed(
      <LeadDetailView
        {...detailProps(detail())}
        statusError="Could not save. Please try again."
        noteError="Write something before saving the note."
      />,
    );
    expect(html).toContain('Could not save. Please try again.');
    expect(html).toContain('Write something before saving the note.');
    expect(html.match(/role="alert"/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

// --- noindex + public-chrome exclusion ---------------------------------------

describe('admin routes are hidden and chrome-free', () => {
  it('recognises every admin path', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/login')).toBe(true);
    expect(isAdminPath('/admin/leads/abc')).toBe(true);
    expect(isAdminPath('/administration')).toBe(false);
    expect(isAdminPath('/')).toBe(false);
    expect(isAdminPath('/contact')).toBe(false);
  });

  it('installs noindex,nofollow and restores the document afterwards', () => {
    const created: Array<{ attrs: Record<string, string>; removed: boolean }> = [];
    const doc = {
      title: 'Scs Softwares - Leading Software Development Company',
      head: { appendChild: () => {} },
      querySelector: () => null,
      createElement: () => {
        const element = { attrs: {} as Record<string, string>, removed: false };
        created.push(element);
        return {
          setAttribute: (name: string, value: string) => {
            element.attrs[name] = value;
          },
          getAttribute: (name: string) => element.attrs[name] ?? null,
          remove: () => {
            element.removed = true;
          },
        };
      },
    };

    const cleanup = applyAdminHead(doc, 'Owner Dashboard · SCS');
    expect(doc.title).toBe('Owner Dashboard · SCS');
    expect(created[0].attrs).toEqual({ name: 'robots', content: ROBOTS_NOINDEX });
    expect(ROBOTS_NOINDEX).toBe('noindex,nofollow');

    cleanup();
    expect(created[0].removed).toBe(true);
    expect(doc.title).toBe('Scs Softwares - Leading Software Development Company');
  });

  it('reuses and restores an existing robots tag rather than duplicating it', () => {
    const attrs: Record<string, string> = { name: 'robots', content: 'index,follow' };
    let removed = false;
    let appended = 0;
    const existing = {
      setAttribute: (name: string, value: string) => {
        attrs[name] = value;
      },
      getAttribute: (name: string) => attrs[name] ?? null,
      remove: () => {
        removed = true;
      },
    };
    const doc = {
      title: 'public',
      head: { appendChild: () => { appended += 1; } },
      querySelector: () => existing,
      createElement: () => existing,
    };

    const cleanup = applyAdminHead(doc, 'Owner Dashboard');
    expect(attrs.content).toBe(ROBOTS_NOINDEX);
    expect(appended).toBe(0);
    cleanup();
    expect(attrs.content).toBe('index,follow');
    expect(removed).toBe(false);
  });

  it('disallows /admin in robots.txt for every crawler group', () => {
    const robots = readFileSync(join(process.cwd(), 'public', 'robots.txt'), 'utf8');
    const groups = robots.split(/\n(?=User-agent:)/);
    expect(groups.length).toBeGreaterThan(1);
    for (const group of groups) {
      expect(group, group.split('\n')[0]).toContain('Disallow: /admin');
    }
  });

  it('imports no public Header, Footer, Buddy widget or scroll controls', () => {
    const roots = [join('src', 'components', 'admin'), join('src', 'pages', 'admin')];
    const files: string[] = [];
    for (const root of roots) {
      for (const name of readdirSync(join(process.cwd(), root))) {
        if (/\.tsx?$/.test(name) && !name.includes('.test.')) files.push(join(root, name));
      }
    }
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      for (const forbidden of [
        'components/Header',
        'components/Footer',
        'VirtualGuide',
        'ScrollButtons',
        'LanguageSwitcher',
        'assistantBus',
      ]) {
        expect(source.includes(forbidden), `${file} must not import ${forbidden}`).toBe(false);
      }
    }
  });

  it('unmounts the public floating widgets on admin routes in App.tsx', () => {
    const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
    // both floating widgets are gated on isAdminPath
    const guide = app.match(/const GlobalVirtualGuide[\s\S]*?\n};/)?.[0] ?? '';
    const scroll = app.match(/const GlobalScrollButtons[\s\S]*?\n};/)?.[0] ?? '';
    expect(guide).toContain('isAdminPath(pathname)) return null');
    expect(scroll).toContain('isAdminPath(pathname)) return null');
    // and the dashboard routes are guarded
    expect(app).toContain('<AdminGuard>');
    expect(app).toContain('path="leads/:id"');
    expect(app).toContain('path="login"');
  });
});

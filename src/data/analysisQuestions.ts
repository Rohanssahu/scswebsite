import { AnalysisQuestion, ProjectMode } from '@/types/projectAnalysis';

// One shared question set powers both the AI chat flow and the manual form,
// so switching between the two never loses data.

export const NEW_PROJECT_QUESTIONS: AnalysisQuestion[] = [
  {
    id: 'idea',
    chatPrompt: 'What do you want to build? Describe your idea in a sentence or two.',
    label: 'Your idea',
    type: 'textarea',
    placeholder: 'e.g. A marketplace where local tutors can list classes and students can book them…',
  },
  {
    id: 'audience',
    chatPrompt: 'Who will use it? Tell me about your target users.',
    label: 'Target users',
    type: 'text',
    placeholder: 'e.g. Students and independent tutors in India',
  },
  {
    id: 'features',
    chatPrompt: 'What are the main features you have in mind? Pick everything that applies.',
    label: 'Main features',
    type: 'multi',
    options: [
      'User profiles',
      'Search & filters',
      'Chat / messaging',
      'Notifications',
      'Booking / scheduling',
      'E-commerce / catalog',
      'Analytics dashboard',
      'File uploads',
      'Maps / location',
    ],
  },
  {
    id: 'platform',
    chatPrompt: 'Do you need a web app, a mobile app, or both?',
    label: 'Platform',
    type: 'single',
    options: ['Web only', 'Mobile only', 'Web + Mobile'],
  },
  {
    id: 'modules',
    chatPrompt: 'Do you need login, payments or an admin panel?',
    label: 'Core modules',
    type: 'multi',
    options: ['User login / accounts', 'Online payments', 'Admin panel', 'None of these'],
  },
  {
    id: 'timeline',
    chatPrompt: 'What is your preferred timeline?',
    label: 'Timeline',
    type: 'single',
    options: ['ASAP (under 1 month)', '1–3 months', '3–6 months', 'Flexible'],
  },
  {
    id: 'budget',
    chatPrompt: 'And roughly, what budget do you have in mind? (You can skip this.)',
    label: 'Approximate budget',
    type: 'single',
    optional: true,
    options: ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', '$15,000+', 'Not sure yet'],
  },
];

export const EXISTING_PROJECT_QUESTIONS: AnalysisQuestion[] = [
  {
    id: 'projectType',
    chatPrompt: 'What type of project is it?',
    label: 'Project type',
    type: 'single',
    options: ['Web application', 'Mobile application', 'Web + Mobile', 'Website / CMS', 'Other'],
  },
  {
    id: 'technologies',
    chatPrompt: 'Which technologies are used? Select all that apply.',
    label: 'Technologies used',
    type: 'multi',
    options: [
      'React',
      'Vue',
      'Angular',
      'Node.js',
      'PHP / Laravel',
      'Python / Django',
      'WordPress',
      'Flutter',
      'React Native',
      'Not sure',
    ],
  },
  {
    id: 'working',
    chatPrompt: 'What is currently working well in the project?',
    label: 'What currently works',
    type: 'textarea',
    placeholder: 'e.g. Login and product listing work, the UI is mostly done…',
  },
  {
    id: 'broken',
    chatPrompt: 'What is broken or incomplete right now?',
    label: 'Broken / incomplete parts',
    type: 'textarea',
    placeholder: 'e.g. Checkout crashes, admin panel was never finished, site is slow on mobile…',
  },
  {
    id: 'newFeatures',
    chatPrompt: 'Which new features do you need added?',
    label: 'New features required',
    type: 'multi',
    options: [
      'Payments',
      'Admin panel',
      'Notifications',
      'Reports / analytics',
      'Mobile app version',
      'Performance improvements',
      'Redesign / new UI',
      'No new features — just fixes',
    ],
  },
  {
    id: 'projectLink',
    chatPrompt: 'Do you have a live URL or a code repository link? (Optional — you can skip.)',
    label: 'Live URL / repository',
    type: 'text',
    optional: true,
    placeholder: 'e.g. https://myapp.com or github.com/me/myapp',
  },
  {
    id: 'urgency',
    chatPrompt: 'How urgent is this for you?',
    label: 'Urgency',
    type: 'single',
    options: ['Critical — need help this week', 'High — within 2–4 weeks', 'Normal — 1–2 months', 'Flexible'],
  },
  {
    id: 'budget',
    chatPrompt: 'And what budget are you working with? (You can skip this.)',
    label: 'Approximate budget',
    type: 'single',
    optional: true,
    options: ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', '$15,000+', 'Not sure yet'],
  },
];

export function getQuestions(mode: ProjectMode): AnalysisQuestion[] {
  return mode === 'new' ? NEW_PROJECT_QUESTIONS : EXISTING_PROJECT_QUESTIONS;
}

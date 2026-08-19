import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Wrench, Sparkles, ClipboardList, ArrowLeft } from 'lucide-react';
import { EntryMethod, ProjectMode } from '@/types/projectAnalysis';

interface ModeSelectionProps {
  mode: ProjectMode | null;
  onSelectMode: (mode: ProjectMode) => void;
  onSelectMethod: (method: EntryMethod) => void;
  onBack: () => void;
}

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}

const OptionCard = ({ icon, title, description, badge, onClick }: OptionCardProps) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.98 }}
    className="glow-card group relative w-full rounded-2xl border border-gray-200 bg-white p-6 text-left transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 sm:p-8"
  >
    {badge && (
      <span className="absolute right-4 top-4 rounded-full border border-pink-300 bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-600">
        {badge}
      </span>
    )}
    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    <span className="mt-4 inline-block text-sm font-medium text-pink-600 transition-transform group-hover:translate-x-1">
      Continue →
    </span>
  </motion.button>
);

const ModeSelection = ({ mode, onSelectMode, onSelectMethod, onBack }: ModeSelectionProps) => {
  if (!mode) {
    return (
      <div>
        <h1 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">What would you like to do?</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
          Choose a starting point — you'll get a demo estimate of team, hours, cost and timeline either way.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <OptionCard
            icon={<Rocket className="h-6 w-6" aria-hidden="true" />}
            title="Build a new project"
            description="Start from an idea. Describe what you want to build and get a recommended team and delivery plan."
            onClick={() => onSelectMode('new')}
          />
          <OptionCard
            icon={<Wrench className="h-6 w-6" aria-hidden="true" />}
            title="Analyze / fix an existing project"
            description="Have a broken, slow or unfinished project? Get a demo health check and a rescue plan."
            onClick={() => onSelectMode('existing')}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Change project type
      </button>
      <h1 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">How would you like to continue?</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
        Both paths collect the same details — you can switch at any time without losing your answers.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <OptionCard
          icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
          title="Continue with AI Assistant"
          description="Answer one question at a time in a guided chat. Fastest way to a demo estimate."
          badge="Demo assistant"
          onClick={() => onSelectMethod('ai')}
        />
        <OptionCard
          icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
          title="Fill requirements manually"
          description="Prefer a classic form? Step through the same questions with full control and draft saving."
          onClick={() => onSelectMethod('manual')}
        />
      </div>
    </div>
  );
};

export default ModeSelection;

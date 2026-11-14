import { Code as Code2, GraduationCap, Globe, Image, PenLine, type LucideIcon } from 'lucide-react';

export interface PresetPrompt {
  title: string;
  prompt: string;
  tool?: 'web-search' | 'image-generation';
}

export interface PresetCategory {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  prompts: PresetPrompt[];
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'write',
    label: 'Write',
    description: 'Drafts, emails, and polished rewrites in your voice.',
    icon: PenLine,
    prompts: [
      { title: 'Draft a friendly email', prompt: 'Draft a short, friendly email asking a client to confirm a meeting time next week.' },
      { title: 'Polish my paragraph', prompt: 'Rewrite this paragraph so it is clearer and more concise, keeping my meaning: ' },
      { title: 'Write a product blurb', prompt: 'Write a 50-word product description for a reusable water bottle with a focus on sustainability.' },
    ],
  },
  {
    id: 'code',
    label: 'Code',
    description: 'Functions, debugging help, and explanations of tricky code.',
    icon: Code2,
    prompts: [
      { title: 'Debounce a function', prompt: 'Write a TypeScript function that debounces an async function call.' },
      { title: 'Explain a regex', prompt: 'Explain what this regular expression matches, step by step, in plain language: ^[\\w.+-]+@\\w+\\.\\w{2,}$' },
      { title: 'Review my SQL query', prompt: 'Review this SQL query for performance problems and suggest an index if one would help: ' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Current facts from the web, with sources you can check.',
    icon: Globe,
    prompts: [
      { title: 'Latest quantum news', prompt: 'What are the latest developments in quantum computing?', tool: 'web-search' },
      { title: 'Compare two options', prompt: 'Compare the latest pricing and key features of the leading project management tools.', tool: 'web-search' },
      { title: 'Check a claim', prompt: 'Is it true that the Great Wall of China is visible from space with the naked eye? Check current sources.', tool: 'web-search' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    description: 'Clear explanations of ideas, built up from the basics.',
    icon: GraduationCap,
    prompts: [
      { title: 'Explain transformers', prompt: 'Explain how transformers work in machine learning, in simple terms.' },
      { title: 'Study plan', prompt: 'Build a 4-week study plan to learn basic statistics, with about 30 minutes a day.' },
      { title: 'Quiz me', prompt: 'Quiz me with five questions on the water cycle, one at a time, and grade my answers.' },
    ],
  },
  {
    id: 'create',
    label: 'Create',
    description: 'Generate images from a description.',
    icon: Image,
    prompts: [
      { title: 'Mountain lake at dusk', prompt: 'A serene mountain lake at golden hour, photorealistic', tool: 'image-generation' },
      { title: 'Minimal logo idea', prompt: 'A minimal logo of a paper plane made from a single continuous line, on a dark background', tool: 'image-generation' },
      { title: 'Cozy reading nook', prompt: 'A cozy reading nook with a window, warm lamp light, and plants, illustration style', tool: 'image-generation' },
    ],
  },
];

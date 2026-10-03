// Built-in mock chat provider — produces contextual streaming responses with
// a knowledge base of real explanations for common topics. Real providers
// implement the same `ChatProvider` interface (see openaiProvider.ts) and
// slot in via the registry.

import type { ChatProvider, ChatRequest, ChatStreamChunk } from '@/ai/types';
import type { ToolKind } from '@/types';
import { sleep } from '@/utils';

function splitChunks(text: string): string[] {
  return text.match(/(\S+\s*|\s+)/g) ?? [text];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Knowledge base ────────────────────────────────────────────────────────
// Each entry has keywords for matching and one or more real explanations.

interface KnowledgeEntry {
  keywords: string[];
  answers: string[];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ['transformer', 'transformers', 'attention mechanism', 'self-attention'],
    answers: [
      `Transformers are a type of neural network architecture that revolutionized machine learning starting around 2017. Here's how they work in simple terms:

**The core idea: attention**

Instead of reading text word-by-word (like older models did), a transformer looks at all the words in a sentence at the same time and figures out which words are most relevant to each other. This is called "self-attention."

Think of it like reading a sentence and instinctively knowing which words connect to which — when you read "The bank of the river," you know "bank" refers to land, not a financial institution, because of the word "river" nearby. The transformer learns to do this same kind of connection-making automatically.

**How it works step by step:**

1. **Embedding**: Each word gets converted into a list of numbers (a vector) that captures its meaning.
2. **Positional encoding**: Since the transformer reads everything at once, it needs a way to know word order — so it adds a "position signal" to each word's vector.
3. **Attention layers**: Each layer computes attention scores between every pair of words. High scores mean "these words are strongly related." The model uses these scores to blend information across the sentence.
4. **Stacked layers**: This repeats across many layers (often 12, 24, or more), each capturing more abstract relationships.
5. **Output**: The final representations can be used for translation, text generation, classification, or any other task.

**Why they matter:**

Transformers can be trained in parallel (unlike older sequential models), which means you can train them on massive amounts of data using GPUs. This is what made models like GPT, BERT, and eventually ChatGPT possible. The attention mechanism lets them capture long-range dependencies — understanding that a word at the start of a paragraph relates to one at the end — far better than previous architectures.

Want me to go deeper into multi-head attention, or explain how training works?`,
    ],
  },
  {
    keywords: ['machine learning', 'ml', 'neural network', 'neural networks', 'deep learning'],
    answers: [
      `Machine learning is a way of building computer programs that learn from data instead of being explicitly programmed. Here's the intuition:

**Traditional programming vs. machine learning**

In traditional programming, you write rules: "if the email contains 'free money,' mark it as spam." In machine learning, you show the computer thousands of spam and non-spam emails, and it figures out the patterns on its own. You never explicitly tell it the rules — it discovers them.

**How it learns:**

1. **Training data**: You start with labeled examples (e.g., photos labeled "cat" or "dog").
2. **A model**: This is a mathematical function with adjustable parameters (think of them as knobs). Initially, the knobs are set randomly, so the model's predictions are terrible.
3. **Loss function**: A way to measure how wrong the model's predictions are.
4. **Optimization**: The system tweaks the knobs slightly to reduce the error. It repeats this thousands or millions of times, each time getting a little bit better.

**Key types:**

- **Supervised learning**: You give labeled data (cat/dog photos). The model learns to predict labels for new data.
- **Unsupervised learning**: You give unlabeled data. The model finds structure on its own (e.g., clustering similar customers together).
- **Reinforcement learning**: The model learns by trial and error, getting rewards for good actions (how game-playing AI works).

**Neural networks** are one type of model inspired loosely by the brain — layers of simple math units (neurons) that pass signals forward. Deep learning just means neural networks with many layers.

Want me to explain a specific type, or go deeper into how training actually works?`,
    ],
  },
  {
    keywords: ['gravity', 'cosmic scale gravity', 'general relativity', 'spacetime', 'gravitation'],
    answers: [
      `Gravity is the force that pulls objects with mass toward each other. Here's how it works from everyday intuition up to cosmic scale:

**Everyday gravity**

You experience gravity constantly — it's what keeps you on the ground and makes dropped objects fall. Newton described it simply: every two objects with mass attract each other, and the force is stronger when objects are heavier and closer together. The Earth is massive enough that its gravitational pull keeps you firmly on the surface, and it's what keeps the Moon in orbit.

**Einstein's revolution: general relativity**

In 1915, Einstein completely reframed gravity. He said gravity isn't really a "force" at all — it's the bending of spacetime. The idea is:

- Space and time are woven together into a four-dimensional fabric called spacetime.
- Anything with mass (a star, a planet, you) warps this fabric, like a bowling ball sitting on a trampoline.
- Objects moving through this warped fabric follow curved paths. What we experience as "falling" is actually just following the natural curve of bent spacetime.

**Cosmic-scale gravity**

At the scale of galaxies and the universe, gravity becomes the dominant sculptor of structure:

- **Galaxies**: Gravity pulls billions of stars together into rotating systems. Supermassive black holes at galactic centers add enormous gravitational pull.
- **Galaxy clusters**: Thousands of galaxies are bound together by their collective gravity.
- **Dark matter**: Observations show galaxies rotate faster than their visible mass should allow. This led to the hypothesis of dark matter — invisible mass that adds gravitational pull. We can't see it, but we can measure its gravitational effects.
- **Dark energy**: At the very largest scales, the universe's expansion is accelerating, working against gravity. This mysterious force is called dark energy.
- **Gravitational waves**: When massive objects (like merging black holes) accelerate, they create ripples in spacetime itself — detected for the first time in 2015 by LIGO.

Want me to go deeper into any of these — black holes, dark matter, or gravitational waves?`,
    ],
  },
  {
    keywords: ['world cup', 'fifa', 'world cup soccer', 'world cup football'],
    answers: [
      `The FIFA World Cup is the biggest single-sport event in the world, held every four years since 1930 (except 1942 and 1946 due to World War II). Here's an overview:

**Format**

32 national teams (expanding to 48 starting in 2026) qualify through regional tournaments over the preceding years. The tournament itself runs about a month: a group stage where teams play round-robin in groups of four, followed by a single-elimination knockout bracket (Round of 16, quarterfinals, semifinals, and the final).

**Historic highlights**

- Brazil has won the most titles (5), followed by Germany and Italy (4 each).
- The 2022 World Cup in Qatar was the first held in November/December (due to summer heat) and the first in the Middle East. Argentina won, with Lionel Messi finally claiming the trophy.
- The 2026 World Cup will be co-hosted by the USA, Canada, and Mexico — the first to feature 48 teams across three countries.
- Memorable moments include Maradona's "Hand of God" goal (1986), Zidane's headbutt in the 2006 final, and Germany's 7-1 demolition of Brazil on home soil in 2014.

**Why it matters**

The World Cup final is one of the most-watched broadcasts in human history — over 1.5 billion people watched the 2022 final. It's a moment of global unity where entire countries grind to a halt to watch their team.

Want me to cover a specific tournament, player, or aspect of the game?`,
    ],
  },
  {
    keywords: ['google maps', 'maps', 'google map', 'navigation', 'gps directions'],
    answers: [
      `Google Maps is the world's most widely used mapping and navigation service, launched in 2005. Here's what makes it work:

**How it works under the hood**

- **Satellite imagery and Street View**: Google combines satellite photos, aerial photography, and ground-level Street View images (captured by cars and trekker backpacks) to build a visual map of the world.
- **Map data**: Roads, businesses, and points of interest come from a mix of Google's own data, government sources, and user contributions (Local Guides).
- **Routing**: When you ask for directions, Google calculates the best route using real-time traffic data gathered from millions of Android phones on the road. It factors in current speeds, accidents, and road closures to estimate arrival time.
- **Live traffic**: The red/yellow/green traffic overlay is built from anonymized speed data from phones using Google Maps — you're contributing to it just by having it open.

**Key features**

- Turn-by-turn navigation for driving, walking, cycling, and public transit
- Offline maps for areas with poor connectivity
- Indoor maps for major airports, malls, and museums
- Street View for virtually walking down almost any street
- Reviews and photos from other users for businesses and locations

**Scale**: Google Maps covers over 220 countries and territories, with information on hundreds of millions of businesses and places. It's used by over a billion people monthly.

Want me to explain how the routing algorithm works, or cover a specific feature?`,
    ],
  },
  {
    keywords: ['artificial intelligence', 'ai', 'what is ai', 'how does ai work', 'popular ai'],
    answers: [
      `Artificial Intelligence (AI) refers to computer systems designed to perform tasks that typically require human intelligence — understanding language, recognizing images, making decisions, and generating content.

**The main categories:**

- **Narrow AI** (what exists today): Systems that are good at one specific task. Siri recognizes your voice. Spam filters catch junk email. Chess engines beat grandmasters. But they can't transfer their skill to unrelated tasks.
- **General AI** (theoretical): A system that could learn and reason across any domain, like a human. We're not there yet — it may be decades away or more.
- **Superintelligence** (speculative): AI that surpasses human intelligence across all domains. This is the subject of much debate and research into AI safety.

**How modern AI works:**

Most modern AI is built on machine learning — specifically, training large models on massive datasets. The breakthrough of the last decade has been:

1. **Deep learning**: Neural networks with many layers, trained on huge amounts of data.
2. **Transformers** (2017+): An architecture that excels at understanding and generating text. This is the foundation of ChatGPT, Claude, Gemini, and others.
3. **Large language models (LLMs)**: Trained on essentially the entire internet's text, these models can write essays, answer questions, write code, and hold conversations.

**Most popular AI tools today (2025-2026):**

- **ChatGPT** (OpenAI) — the consumer AI that started the current wave
- **Claude** (Anthropic) — known for nuanced reasoning and writing
- **Gemini** (Google) — integrated across Google's ecosystem
- **Midjourney** and **DALL-E** — image generation
- **Copilot** (GitHub/Microsoft) — AI coding assistant

Want me to go deeper into any specific area — how LLMs are trained, AI safety concerns, or practical uses?`,
    ],
  },
  {
    keywords: ['bird', 'birds', 'about birds', 'how birds fly'],
    answers: [
      `Birds are warm-blooded vertebrates characterized by feathers, beaked jaws, and the ability to lay hard-shelled eggs. There are over 10,000 known species, making them one of the most diverse groups of land vertebrates.

**How birds fly:**

Flight is the signature ability of most birds, and it's a marvel of biomechanical engineering:

1. **Wings shaped for lift**: A bird's wing has a curved upper surface and flatter lower surface. As air flows over it, the air on top moves faster, creating lower pressure above the wing than below. This pressure difference generates lift — the same principle that keeps airplanes in the air.
2. **Lightweight skeleton**: Bird bones are hollow and reinforced with internal struts, making them strong but extremely light. A frigatebird with a 7-foot wingspan has a skeleton lighter than its feathers.
3. **Powerful flight muscles**: The pectoral muscles that power the downstroke can make up 25% of a bird's body weight.
4. **Feathers**: Not just for warmth — flight feathers are stiff and asymmetric, acting like individual airfoils. Birds can adjust each feather's angle for precise control.
5. **Efficient lungs**: Birds have a unique respiratory system with air sacs that maintain a one-way flow of fresh air through the lungs, giving them the oxygen needed for sustained flight — far more efficient than mammalian lungs.

**Other remarkable things about birds:**

- Some birds migrate thousands of miles annually — Arctic terns fly from the Arctic to the Antarctic and back each year (about 44,000 miles).
- Crows and parrots demonstrate problem-solving and tool use rivaling primates.
- Hummingbirds can hover and fly backward, beating their wings up to 80 times per second.
- Pigeons can recognize individual human faces in photographs.

Want me to cover a specific species, bird behavior, or aspect of bird biology?`,
    ],
  },
  {
    keywords: ['riddle', 'riddles', '1st grade riddle', 'kids riddle'],
    answers: [
      `Here are a few fun riddles:

**Riddle 1:** I have hands but cannot clap. I have a face but cannot smile. What am I?
→ A clock!

**Riddle 2:** I'm tall when I'm young, and I'm short when I'm old. What am I?
→ A candle!

**Riddle 3:** What has to be broken before you can use it?
→ An egg!

**Riddle 4:** I have four legs but I can't walk. What am I?
→ A table!

**Riddle 5:** What gets wetter the more it dries?
→ A towel!

Want more riddles, or should I make them harder?`,
    ],
  },
  {
    keywords: ['quantum computing', 'quantum computer', 'qubit', 'quantum'],
    answers: [
      `Quantum computing is a fundamentally different approach to computation that leverages quantum mechanics. Here's the simple version:

**Classical vs. quantum**

A classical computer uses bits — each bit is either 0 or 1. A quantum computer uses qubits, which can be 0, 1, or both at the same time (a state called superposition). This lets a quantum computer explore many possibilities in parallel.

**Key concepts:**

- **Superposition**: A qubit can exist in a blend of 0 and 1 simultaneously. Think of a coin spinning in the air — it's not heads or tails until it lands. When you "measure" a qubit, it collapses to a definite value.
- **Entanglement**: Two qubits can be linked so that measuring one instantly tells you about the other, no matter the distance. Einstein called this "spooky action at a distance."
- **Interference**: Quantum algorithms cleverly arrange it so that wrong answers cancel out and right answers amplify — like noise-canceling headphones for computation.

**What they're good at:**

Quantum computers aren't faster at everything. They excel at specific problems like factoring large numbers (which could break current encryption), simulating molecules (drug discovery, materials science), and certain optimization problems. For browsing the web or running spreadsheets, your laptop is better.

**Current state (2025-2026):**

We're in the "NISQ era" — Noisy Intermediate-Scale Quantum. Current quantum computers have a few hundred qubits but are error-prone. Building fault-tolerant quantum computers (with error correction) is the grand challenge. IBM, Google, IonQ, and others are racing toward this, but practical large-scale quantum computing is likely still years away.

Want me to explain a specific algorithm (like Shor's or Grover's), or go deeper into any concept?`,
    ],
  },
  {
    keywords: ['climate change', 'global warming', 'greenhouse effect', 'carbon emissions'],
    answers: [
      `Climate change refers to long-term shifts in global temperatures and weather patterns. Here's what's happening and why:

**The greenhouse effect (the core mechanism)**

The Earth absorbs sunlight and radiates heat back toward space. Certain gases in the atmosphere — primarily carbon dioxide (CO2), methane, and water vapor — trap some of this heat, like a blanket. This is natural and keeps Earth livable (without it, Earth would be about 60°F colder).

The problem: since the Industrial Revolution, human activity (burning fossil fuels, deforestation, agriculture) has dramatically increased greenhouse gas concentrations. More greenhouse gases = thicker blanket = more heat trapped = rising global temperatures.

**What's happening:**

- Global average temperature has risen about 1.1°C (2°F) since the late 1800s.
- The last decade was the hottest on record. 2023 and 2024 set new records.
- Effects include: more frequent and intense heatwaves, stronger hurricanes, rising sea levels (from melting ice and thermal expansion), shifting rainfall patterns, ocean acidification (CO2 dissolving into seawater), and ecosystem disruption.

**What's being done:**

- **Paris Agreement (2015)**: Nearly every country agreed to limit warming to well below 2°C, ideally 1.5°C. Current pledges aren't sufficient to meet this target.
- **Renewable energy**: Solar and wind are now cheaper than fossil fuels in most of the world. Deployment is accelerating rapidly.
- **Electric vehicles**: EV adoption is growing fast, especially in China and Europe.
- **Carbon removal**: Technologies to capture CO2 from the air are being developed but are still small-scale and expensive.

**The challenge**: We need to reduce emissions by roughly half by 2030 and reach net zero by around 2050 to limit warming to 1.5°C. This requires unprecedented global coordination and transformation of energy, transport, agriculture, and industry.

Want me to go deeper into any aspect — the science, solutions, or policy?`,
    ],
  },
  {
    keywords: ['blockchain', 'bitcoin', 'cryptocurrency', 'crypto', 'ethereum'],
    answers: [
      `Blockchain is a way of storing data that makes it very difficult to change or fake. Here's the simple explanation:

**The core idea**

Imagine a shared notebook that everyone in a group has a copy of. Whenever someone writes a new entry (a "block"), everyone checks it and adds it to their copy. Once an entry is written and verified, it can't be erased or altered — it's permanently linked to all previous entries in a chain.

Technically, each block contains a cryptographic hash (a unique fingerprint) of the previous block. If anyone tries to change an old block, its hash changes, which breaks the chain and everyone can see the tampering.

**How it applies to cryptocurrency:**

Bitcoin uses a blockchain as a public ledger of all transactions. Instead of a bank verifying transfers, a decentralized network of computers (miners) validates transactions by solving computationally hard puzzles — a process called proof-of-work. The first to solve it gets to add the next block and earns new Bitcoin as a reward.

Ethereum extended this concept with "smart contracts" — programs that live on the blockchain and execute automatically when conditions are met, enabling decentralized apps, NFTs, and decentralized finance (DeFi).

**Beyond crypto:**

Blockchains are being explored for supply chain tracking, voting systems, identity verification, and more. The appeal is trustlessness — you don't need to trust a central authority because the math guarantees integrity.

**Limitations:**

- Energy consumption: proof-of-work blockchains (like Bitcoin) use enormous electricity. Ethereum moved to proof-of-stake, which uses ~99% less.
- Scalability: blockchains process far fewer transactions per second than traditional systems like Visa.
- Irreversibility: if you send crypto to the wrong address, it's gone forever.

Want me to go deeper into any aspect — how mining works, smart contracts, or specific cryptocurrencies?`,
    ],
  },
  {
    keywords: ['photosynthesis', 'how do plants make food', 'plant energy'],
    answers: [
      `Photosynthesis is the process by which plants, algae, and some bacteria convert sunlight into chemical energy. It's one of the most important biological processes on Earth — nearly all life depends on it either directly or indirectly.

**The simple version:**

Plants take in three things — sunlight, water (from roots), and carbon dioxide (from the air through tiny leaf pores called stomata). They use the energy from sunlight to combine water and CO2 into glucose (sugar) and oxygen. The sugar feeds the plant. The oxygen is released as a byproduct — which is what we breathe.

**The chemical equation:**

6CO2 + 6H2O + light energy → C6H12O6 (glucose) + 6O2 (oxygen)

**Two stages:**

1. **Light-dependent reactions** (happens in the thylakoid membranes): Chlorophyll absorbs sunlight and splits water molecules, releasing oxygen and storing energy in ATP and NADPH (energy-carrying molecules).
2. **Calvin cycle** (happens in the stroma): The plant uses that stored energy to fix CO2 into glucose through a series of enzyme-driven reactions.

**Why it matters:**

- Photosynthesis produces essentially all the oxygen in Earth's atmosphere.
- It's the foundation of nearly every food chain — plants convert solar energy into chemical energy that flows through entire ecosystems.
- The glucose plants make can be stored as starch, used for growth, or passed on to animals that eat the plants.
- Fossil fuels are ultimately ancient photosynthetic energy — coal and oil come from prehistoric plants that captured sunlight millions of years ago.

Want me to go deeper into the biochemistry, or explain how photosynthesis relates to climate change?`,
    ],
  },
];

function findKnowledgeEntry(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const entry of KNOWLEDGE_BASE) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return pick(entry.answers);
      }
    }
  }
  return null;
}

// ─── Response builders ──────────────────────────────────────────────────────

function buildContextualResponse(prompt: string, tools: ToolKind[]): string {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // If web search results were injected into the prompt, respond to them.
  if (tools.includes('web-search') && lower.includes('--- web search results ---')) {
    return buildSearchResponse(trimmed);
  }

  if (tools.includes('image-generation')) {
    return `I've generated an image based on your prompt: "${trimmed.slice(0, 80)}". You'll see it inline in the conversation — use the actions on the card to download or regenerate with a variation of the prompt.\n\nIf you'd like a different aspect ratio or style, just say the word and I'll run it again.`;
  }

  if (tools.includes('file-analysis')) {
    return `I've read through the file you attached. Here's what I found:\n\n- The file is well-formed and parses cleanly.\n- It contains content related to "${trimmed.slice(0, 80)}".\n- There are no obvious encoding issues or truncated sections.\n\nWant me to summarize it in a particular format, or extract specific data from it?`;
  }

  // Greetings
  if (/^(hi|hello|hey|yo|sup|good morning|good evening|good afternoon)\b/.test(lower)) {
    return pick([
      `Hello! I'm Nova, your AI assistant. I can help you with a wide range of tasks — writing, analysis, brainstorming, coding, and more.\n\nWhat can I help you with today?`,
      `Hey there! Great to see you. I'm Nova and I'm ready to help with whatever you're working on — whether that's writing, research, code, or just thinking something through.\n\nWhat's on your mind?`,
      `Hi! I'm Nova. I can help you write, brainstorm, analyze documents, search the web, and much more. What would you like to dive into?`,
    ]);
  }

  // Riddles
  if (/riddle/i.test(trimmed)) {
    const entry = findKnowledgeEntry('riddle');
    return entry ?? `Here's a riddle for you:\n\n**I have hands but cannot clap. I have a face but cannot smile. What am I?**\n\n...A clock!\n\nWant another one?`;
  }

  // Knowledge base lookup — check before keyword branches so topic-specific
  // answers take priority over generic code/writing/list detection.
  const knowledgeAnswer = findKnowledgeEntry(trimmed);
  if (knowledgeAnswer) {
    return knowledgeAnswer;
  }

  // Code-related
  if (/code|function|implement|bug|typescript|react|javascript|python|api|component|hook|state|css|html|sql|regex/i.test(trimmed)) {
    return `Here's how I'd approach that:\n\n\`\`\`typescript\n${buildCodeSnippet(trimmed)}\n\`\`\`\n\nA few notes:\n\n- The implementation keeps things simple and readable.\n- Edge cases are handled at the boundaries.\n- You can extend this pattern as your needs grow.\n\nWant me to add tests, or adapt it to a specific framework?`;
  }

  // Writing tasks
  if (/write|essay|email|letter|article|blog|story|poem|summary|summarize|paraphrase|rewrite|edit|proofread/i.test(trimmed)) {
    return `Here's a draft based on your request:\n\n${buildWriting(trimmed)}\n\nI can adjust the tone, length, or focus — just let me know what you'd like changed.`;
  }

  // Lists / brainstorming
  if (/list|ideas|brainstorm|suggest|recommend|options|ways to|tips/i.test(trimmed)) {
    return `Here are some ideas:\n\n${buildList(trimmed)}\n\nWould you like me to expand on any of these, or explore a different direction?`;
  }

  // Questions (who/what/where/when/why/how/explain/describe/tell me)
  if (/^(what|who|where|when|why|how|which|can you|could you|do you|are you|is it|will you|explain|describe|tell me about|tell me|define|teach me|what is|what are|what does|how do|how does|why do|why does|why is|why are)\b/.test(lower)) {
    return buildAnswer(trimmed);
  }

  // Default: acknowledge and respond to the actual content
  return buildDefaultResponse(trimmed);
}

function buildSearchResponse(prompt: string): string {
  const userQuestion = prompt.split('--- Web search results ---')[0].trim();

  const resultsSection = prompt.split('--- Web search results ---')[1]?.split('--- End search results ---')[0] ?? '';
  const resultBlocks = resultsSection.split(/\n\n/).filter((b) => b.trim());

  const topics = resultBlocks.map((block) => {
    const titleMatch = block.match(/\[?\d+\]?\s*(.+)/);
    return titleMatch ? titleMatch[1].trim() : block.trim().slice(0, 80);
  });

  const topicList = topics.slice(0, 4).map((t, i) => `${i + 1}. ${t}`).join('\n');

  return `Based on my web search for "${userQuestion.slice(0, 100)}", here's what I found:\n\nThe top sources cover this topic from several angles:\n\n${topicList}\n\n${pick([
    'The most recent sources suggest this is an evolving area with new developments emerging regularly.',
    'There appears to be general consensus on the core facts, though different sources emphasize different aspects.',
    'The results span from introductory overviews to more detailed technical analyses, so you can go as deep as you need.',
    'Several sources provide concrete data and examples that help illustrate the key points.',
  ])}\n\nI've attached the sources below so you can read the originals directly. Want me to dig deeper into any specific angle?`;
}

function buildAnswer(prompt: string): string {
  const topic = prompt
    .replace(/^(what|how|why|when|where|who|is|are|can|do|does|will|should|would|could|explain|describe|tell me about|tell me|define|teach me)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .replace(/^(how|in simple terms|for beginners|in layman'?s terms|step by step)\s+/gi, '')
    .trim();

  // Check knowledge base for the cleaned-up topic
  const knowledgeAnswer = findKnowledgeEntry(topic);
  if (knowledgeAnswer) return knowledgeAnswer;

  return `That's a great question. Here's what I can tell you about ${topic}:

**Overview**

${topic.charAt(0).toUpperCase() + topic.slice(1)} is a subject that touches on several interconnected ideas. The best way to understand it is to start with the fundamentals and build from there.

**Key points to consider**

1. **Context matters**: The answer often depends on what you're trying to achieve and what constraints you're working with.
2. **Start simple**: Begin with the core concept, then add complexity as needed.
3. **Practical application**: The theory only becomes useful when you can connect it to real situations.

**Next steps**

If you can share more about what you're trying to accomplish, I can give you a more targeted and specific answer. Alternatively, I can break this down into smaller pieces or provide concrete examples.

Want me to go deeper on any part, or approach this from a different angle?`;
}

function buildDefaultResponse(prompt: string): string {
  const topic = prompt.replace(/[?.!]+$/, '').trim().slice(0, 100);

  // Check knowledge base one more time with the raw prompt
  const knowledgeAnswer = findKnowledgeEntry(topic);
  if (knowledgeAnswer) return knowledgeAnswer;

  return pick([
    `I hear you — you're asking about "${topic}". Here's my take:\n\nThis is a topic worth exploring carefully. Rather than give you a surface-level answer, let me share what I think is most important:\n\n**The core idea**: understanding the fundamentals first will make everything else click into place.\n\n**Practical advice**: start with what you already know and build outward. The details become clearer once the foundation is solid.\n\nWant me to expand on this, provide examples, or approach it from a specific angle?`,
    `Thanks for bringing up "${topic}" — here's how I'd think about it:\n\nThere are a few layers to this. The surface-level answer is one thing, but the more interesting insight is usually in the details. Here's what stands out to me:\n\n- The fundamentals are always the right place to start.\n- Real-world examples make abstract concepts click.\n- Iterating based on feedback is how you refine your understanding.\n\nI can go deeper if you'd like, or I can provide concrete examples. What would be most useful?`,
    `Good question about "${topic}". Let me share what I think:\n\nThe most useful thing I can tell you is that this topic has both a simple core and rich detail. Start with the simple version — understand what it fundamentally is and why it matters. Then, depending on how deep you want to go, you can explore the nuances.\n\nIf you tell me more about what you're trying to do with this, I can tailor my answer. Want me to break it down step by step, or give you the high-level overview first?`,
  ]);
}

function buildCodeSnippet(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('component') || lower.includes('react')) {
    return `import { useState } from 'react';\n\nexport function MyComponent({ title }: { title: string }) {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className="rounded-lg border p-4">\n      <h2 className="text-lg font-semibold">{title}</h2>\n      <button onClick={() => setCount(c => c + 1)}>\n        Clicked {count} times\n      </button>\n    </div>\n  );\n}`;
  }
  if (lower.includes('fetch') || lower.includes('api') || lower.includes('request')) {
    return `async function fetchData<T>(url: string): Promise<T> {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);\n  return res.json() as Promise<T>;\n}\n\n// Usage:\n// const data = await fetchData<User[]>('/api/users');`;
  }
  if (lower.includes('hook') || lower.includes('state')) {
    return `import { useState, useEffect, useCallback } from 'react';\n\nfunction useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}`;
  }
  return `function solve(input: string): string {\n  // Process the input\n  const result = input\n    .split('\\n')\n    .map(line => line.trim())\n    .filter(Boolean)\n    .join(' ');\n  return result;\n}`;
}

function buildWriting(prompt: string): string {
  const topic = prompt
    .replace(/^(write|create|draft|compose)\s+(an?\s+)?(essay|email|letter|article|blog|story|poem|summary)\s*(about|on|for|to)?\s*/i, '')
    .trim() || 'your topic';
  return `Thank you for reaching out about ${topic.slice(0, 60)}.\n\nI wanted to share some thoughts on this subject. It's a topic that deserves careful consideration, and I appreciate the opportunity to weigh in.\n\nThe key points to keep in mind are clarity, purpose, and audience. When all three align, the message resonates.\n\nI'd be happy to refine this further based on your feedback.`;
}

function buildList(prompt: string): string {
  const allItems = [
    'Start with the simplest version that could possibly work, then iterate.',
    'Gather feedback from real users early and often — assumptions are expensive.',
    'Document your decisions so future-you understands why, not just what.',
    'Automate the repetitive parts so you can focus on the creative work.',
    'Keep an eye on performance, but do not optimize prematurely.',
    'Break large tasks into smaller, shippable pieces.',
    'Share work-in-progress with someone who can give honest feedback.',
    'Set a time limit for research — you can always learn more later.',
    'Write down what "done" looks like before you start building.',
    'Talk to at least three people who have faced the same problem.',
  ];
  const shuffled = [...allItems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map((item, i) => `${i + 1}. ${item}`).join('\n');
}

export const mockChatProvider: ChatProvider = {
  id: 'mock-chat',
  async streamChat(req: ChatRequest, onChunk: (c: ChatStreamChunk) => void): Promise<void> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const prompt = lastUser?.content ?? '';
    const responseText = buildContextualResponse(prompt, req.tools);
    const chunks = splitChunks(responseText);

    for (const chunk of chunks) {
      if (req.signal?.aborted) return;
      await sleep(12 + Math.random() * 20);
      onChunk({ delta: chunk });
    }
    onChunk({ done: true });
  },
};

// Built-in mock chat provider — produces contextual streaming responses so
// the full UX is exercisable without an API key. Real providers implement
// the same `ChatProvider` interface (see openaiProvider.ts) and slot in via
// the registry.

import type { ChatProvider, ChatRequest, ChatStreamChunk } from '@/ai/types';
import type { ToolKind } from '@/types';
import { sleep } from '@/utils';

function splitChunks(text: string): string[] {
  return text.match(/(\S+\s*|\s+)/g) ?? [text];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildContextualResponse(prompt: string, tools: ToolKind[]): string {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // If web search results were injected into the prompt, extract and
  // respond to them instead of the generic web-search template.
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

  // Questions (who/what/where/when/why/how)
  if (/^(what|who|where|when|why|how|which|can you|could you|do you|are you|is it|will you)\b/.test(lower)) {
    return buildAnswer(trimmed);
  }

  // Riddles
  if (/riddle/i.test(trimmed)) {
    return pick([
      `Here's a riddle for you:\n\n**I have hands but cannot clap. I have a face but cannot smile. What am I?**\n\n...A clock!\n\nWant another one?`,
      `Here's a fun one:\n\n**I'm tall when I'm young, and I'm short when I'm old. What am I?**\n\n...A candle!\n\nWant me to make a harder one?`,
      `Try this:\n\n**What has to be broken before you can use it?**\n\n...An egg!\n\nWant another riddle?`,
      `Here's a 1st-grade level riddle:\n\n**I have four legs but I can't walk. What am I?**\n\n...A table!\n\nWant another one?`,
    ]);
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

  // Default: acknowledge and respond to the actual content
  return buildDefaultResponse(trimmed);
}

function buildSearchResponse(prompt: string): string {
  // Extract the user's original question (before the search results marker)
  const userQuestion = prompt.split('--- Web search results ---')[0].trim();

  // Extract search result titles and snippets
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
    .replace(/^(what|how|why|when|where|who|is|are|can|do|does|will|should|would|could)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();

  const intros = [
    `Great question about ${topic}.`,
    `Here's what I can tell you about ${topic}:`,
    `Let me break this down for you.`,
    `That's a really interesting question.`,
    `I can definitely help with that.`,
  ];

  const bodies = [
    `The key thing to understand is that ${topic} involves several moving parts. First, there's the core concept itself — what it fundamentally is and how it works. Then there are the practical implications: how it affects you, what you can do with it, and where the common pitfalls are.\n\nThe most important factors to consider are the context in which you're asking, your specific goals, and the constraints you're working within.`,
    `${topic.charAt(0).toUpperCase() + topic.slice(1)} is a topic that spans several areas. At its core, it comes down to understanding the fundamentals and then applying them to your specific situation.\n\nA good starting point is to break it into smaller pieces: what you already know, what you need to find out, and what actions you can take based on that information.`,
    `There are a few ways to think about ${topic}. The simplest way is to start with what you already know and build from there. The more nuanced answer depends on your specific context — what you're trying to achieve, what resources you have, and what constraints you're working with.\n\nIf you can share more details about your situation, I can give you a more targeted answer.`,
  ];

  const closers = [
    `Want me to go deeper on any part of this, or would a different angle be more useful?`,
    `Let me know if you'd like examples, or if there's a specific aspect you'd like me to focus on.`,
    `I can provide more detail or concrete examples — just say the word.`,
    `Would you like me to explore any particular aspect in more depth?`,
  ];

  return `${pick(intros)}\n\n${pick(bodies)}\n\n${pick(closers)}`;
}

function buildDefaultResponse(prompt: string): string {
  const topic = prompt.replace(/[?.!]+$/, '').trim().slice(0, 100);

  const intros = [
    `I understand you're asking about "${topic}". Here's my take:`,
    `Interesting — let me share what I think about "${topic}":`,
    `Here's what I'd say about "${topic}":`,
    `Let me respond to that.`,
  ];

  const bodies = [
    `There's more to this than meets the eye. The surface-level answer is straightforward, but once you dig in, you find layers of nuance that matter depending on your context.\n\nThe practical approach is to start with what you know, identify what you don't, and fill in the gaps systematically.`,
    `This is the kind of thing where the right answer depends heavily on context. What are you trying to achieve? What constraints are you working with? Once those are clear, the path forward usually becomes obvious.\n\nIn general, though, starting simple and iterating is rarely the wrong call.`,
    `I'd approach this in three steps: first, clarify what you're really asking. Second, gather the key facts. Third, make a decision and act on it. Most of the difficulty is in step one — getting clear on the actual question.`,
  ];

  const closers = [
    `Let me know if you'd like me to go deeper, provide examples, or approach this from a different angle.`,
    `Want me to expand on any part of this?`,
    `I can dig into specifics if you point me in the right direction.`,
  ];

  return `${pick(intros)}\n\n${pick(bodies)}\n\n${pick(closers)}`;
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

// Built-in mock chat provider — produces contextual streaming responses with
// a knowledge base of real explanations for common topics. Real providers
// implement the same `ChatProvider` interface (see openaiProvider.ts) and
// slot in via the registry.

import type { ChatProvider, ChatRequest, ChatStreamChunk, ChatTurn } from '@/ai/types';
import type { ToolKind } from '@/types';
import { sleep } from '@/utils';

function splitChunks(text: string): string[] {
  return text.match(/(\S+\s*|\s+)/g) ?? [text];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Knowledge base ────────────────────────────────────────────────────────

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
    keywords: ['machine learning', 'ml model', 'neural network', 'neural networks', 'deep learning'],
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
    keywords: ['google maps', 'google map', 'gps directions', 'how does google maps'],
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
    keywords: ['artificial intelligence', 'what is ai', 'how does ai work', 'popular ai', 'most popular ai', 'ai tools'],
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
    keywords: ['bird', 'birds', 'how birds fly', 'about birds'],
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

1. **Light-dependent reactions** (in the thylakoid membranes): Chlorophyll absorbs sunlight and splits water molecules, releasing oxygen and storing energy in ATP and NADPH (energy-carrying molecules).
2. **Calvin cycle** (in the stroma): The plant uses that stored energy to fix CO2 into glucose through a series of enzyme-driven reactions.

**Why it matters:**

- Photosynthesis produces essentially all the oxygen in Earth's atmosphere.
- It's the foundation of nearly every food chain — plants convert solar energy into chemical energy that flows through entire ecosystems.
- The glucose plants make can be stored as starch, used for growth, or passed on to animals that eat the plants.
- Fossil fuels are ultimately ancient photosynthetic energy — coal and oil come from prehistoric plants that captured sunlight millions of years ago.

Want me to go deeper into the biochemistry, or explain how photosynthesis relates to climate change?`,
    ],
  },
  {
    keywords: ['formula 1', 'f1', 'formula one', 'grand prix', 'race prediction', 'f1 race', 'upcoming formula 1', 'formula 1 race'],
    answers: [
      `Here's my take on the current Formula 1 landscape and what to watch for in the remaining races:

**The 2026 season so far**

This has been one of the most compelling seasons in years. The new regulations brought in for 2026 shook up the grid significantly:

- **Mercedes** has been the benchmark team, with Kimi Antonelli emerging as the breakout star of the season. His consistency has been remarkable — he's led the championship for most of the year.
- **Red Bull** started slowly but has been closing the gap, particularly in the second half of the season. Verstappen has been increasingly competitive despite not yet securing a win.
- **Ferrari** has been strong on certain circuit types, particularly high-downforce tracks.
- **McLaren** has shown flashes of brilliance but has struggled with consistency.

**Key storylines to watch:**

1. **Antonelli vs. Russell**: The intra-Mercedes battle is the defining rivalry of the season. Antonelli's consistency versus Russell's raw pace makes every weekend unpredictable.
2. **Verstappen's first win**: He's been knocking on the door with several podiums. Red Bull's recent development trajectory suggests it's only a matter of time.
3. **The midfield battle**: Teams like Aston Martin and Williams have been much closer to the front than expected with the new regulations.

**What makes the remaining races interesting:**

- Street circuits (Singapore, Las Vegas) tend to favor cars with strong mechanical grip and low-speed performance
- Traditional circuits (Austin, Suzuka) reward a more complete package
- Sprint weekends add an extra layer of unpredictability — one bad qualifying session can derail an entire weekend
- Weather is always a factor, especially at Interlagos and Spa

**My overall prediction:**

Mercedes has the most complete package and should clinch the constructors' title. The drivers' championship will likely go down to the wire between Antonelli and Russell, with Verstappen as the wildcard if Red Bull's development continues to improve.

Want me to break down a specific race in detail, or analyze a particular team's strategy?`,
    ],
  },
  {
    keywords: ['space exploration', 'spacex', 'rocket', 'rockets', 'nasa', 'mars mission', 'moon mission', 'artemis', 'starship'],
    answers: [
      `Space exploration is entering a new golden age. Here's where things stand:

**The current landscape**

We're in the most active period of space exploration since the Apollo era, but with far more participants:

- **SpaceX** has transformed access to space with reusable rockets. The Falcon 9 has launched over 300 times, landing and reusing first-stage boosters routinely — something that was considered impossible 15 years ago. Their Starship vehicle, currently in testing, is designed to be fully reusable and could dramatically lower the cost of reaching orbit and beyond.
- **NASA's Artemis program** aims to return humans to the Moon and establish a sustainable presence. Artemis I (uncrewed) flew in 2022, and crewed landings are planned for the coming years. The Moon is seen as a stepping stone to Mars.
- **Mars exploration** continues with rovers (Perseverance, Curiosity) and orbiters. Perseverance is collecting samples for a future return mission, and searching for signs of ancient microbial life in Jezero Crater.
- **James Webb Space Telescope** (launched 2021) is revolutionizing astronomy — imaging galaxies from the early universe, analyzing exoplanet atmospheres, and revealing cosmic structures never seen before.

**Why it matters:**

- **Scientific discovery**: Every mission expands our understanding of the universe — from the formation of galaxies to the potential for life elsewhere.
- **Technology spin-offs**: Space tech drives innovation in materials, communications, GPS, medical imaging, and more.
- **Economic potential**: The space economy is projected to reach $1 trillion+ in the coming decades, spanning satellite services, space tourism, asteroid mining concepts, and orbital manufacturing.
- **Inspiration**: Space exploration pushes the boundaries of what humans can achieve and inspires the next generation of scientists and engineers.

**What's next:**

- Crewed Moon return via Artemis
- Starship's first operational orbital flights
- Mars sample return mission
- Europa Clipper mission to study Jupiter's icy moon (potential subsurface ocean)
- Growing private space stations replacing the ISS

Want me to go deeper into any specific mission, company, or technology?`,
    ],
  },
  {
    keywords: ['cooking', 'how to cook', 'recipe', 'baking', 'how to bake', 'food preparation'],
    answers: [
      `Great question about cooking! Here are the fundamentals that will make you a better cook:

**The five mother sauces**

Most sauces in Western cooking come from five foundational recipes:
1. **Béchamel** — milk thickened with a white roux (butter + flour). Base for mac and cheese, gratins.
2. **Velouté** — stock thickened with a roux. Base for gravies and cream sauces.
3. **Espagnole** — brown stock, roasted bones, tomato, and roux. Base for demi-glace and rich meat sauces.
4. **Tomato** — tomatoes, aromatics, sometimes thickened with roux. Base for pasta sauces, soups.
5. **Hollandaise** — egg yolks, butter, lemon juice emulsified. Base for béarnaise and other warm emulsified sauces.

**Techniques that matter more than recipes**

- **Sear meat properly**: Get your pan ripping hot. Dry the surface of the meat thoroughly (moisture is the enemy of a good crust). Don't crowd the pan. Don't move the meat until it releases naturally.
- **Salt in layers**: Salt your meat 24 hours ahead (dry brine). Salt your pasta water until it tastes like the sea. Taste and adjust seasoning at every stage.
- **Use acid**: A squeeze of lemon or splash of vinegar at the end brightens almost any dish. Fat and salt make food taste good; acid makes it taste *alive*.
- **Rest your meat**: A steak needs 5-10 minutes of rest after cooking. This lets juices redistribute. Cutting into hot meat = losing all the juice on the board.
- **Mise en place**: Everything in its place. Prep and measure all ingredients before you start cooking. This is the single biggest difference between a calm cook and a chaotic one.

**Temperature is everything**

- Low and slow for tough cuts (braise, stew, confit)
- High and fast for tender cuts (sear, grill, roast)
- 325°F-350°F for most baking
- 140°F internal = medium rare steak. 165°F = safe poultry.

Want me to share a specific recipe, or go deeper into any technique?`,
    ],
  },
  {
    keywords: ['world war', 'history', 'ancient rome', 'ancient greece', 'egyptian', 'medieval', 'renaissance', 'historical event'],
    answers: [
      `Here's a broad overview of how historians think about this period:

**Understanding historical events**

The most important thing to understand about history is that it's not just a list of dates and battles — it's about cause and effect, human motivations, and the interconnected web of economics, technology, culture, and geography that shapes events.

**Key patterns historians look for:**

1. **Geographic determinism**: Why did Europe colonize the Americas and not the other way around? Partly geography — Europe had more domesticable animals and crops, an east-west axis that allowed crops to spread, and a fractured geography that encouraged competition rather than unified empire (like China).
2. **Technological catalysts**: The printing press didn't just make books cheaper — it shattered the Catholic Church's monopoly on information, enabled the Reformation, and accelerated the Scientific Revolution. Each major technology (agriculture, writing, metallurgy, gunpowder, steam, electricity, computing) reshaped society in ways nobody predicted.
3. **Economic forces**: The transatlantic slave trade wasn't driven primarily by racism — it was driven by economics (cheap labor for cash crops) and then *produced* racism as a justification. Understanding economic incentives often explains "why" better than ideology.
4. **Unintended consequences**: World War I was triggered by an assassination, but the real causes were a web of alliances, arms races, and imperial rivalries that made a general war almost inevitable. The Treaty of Versailles, meant to prevent future wars, practically guaranteed WWII by devastating Germany economically.

**Why studying history matters:**

- It teaches pattern recognition — similar dynamics recur across centuries
- It reveals that "obvious" outcomes are rarely obvious to people living through them
- It humbles us — the people of the past were not stupider than us; they operated with different information and constraints
- As Mark Twain (supposedly) said: "History doesn't repeat itself, but it often rhymes"

Want me to dive into a specific period, event, or historical question?`,
    ],
  },
  {
    keywords: ['economics', 'inflation', 'gdp', 'recession', 'stock market', 'supply and demand', 'economic', 'interest rate', 'monetary policy'],
    answers: [
      `Here's how to think about this in economic terms:

**The core framework: supply and demand**

Almost all of economics rests on this simple idea: when supply goes up or demand goes down, prices fall. When supply goes down or demand goes up, prices rise. Everything else — inflation, unemployment, trade policy, interest rates — is a variation on this theme applied at different scales.

**Key concepts that explain the news:**

- **Inflation**: When prices rise across the economy. Mild inflation (2-3%) is considered healthy — it encourages spending and investment rather than hoarding cash. High inflation destroys savings and destabilizes economies. Central banks fight it by raising interest rates (making borrowing more expensive, cooling demand).
- **Interest rates**: The "price of money." When the Fed raises rates, mortgages get more expensive, businesses borrow less, hiring slows, and the economy cools. Lower rates do the opposite — stimulate borrowing, spending, and growth, but risk inflation.
- **Recession**: Two consecutive quarters of negative GDP growth. Recessions are a normal part of the economic cycle — the economy can't grow forever without periodic corrections. The question is how deep and how long.
- **GDP**: Total value of everything a country produces. It's a flawed but useful measure — it counts activity but not well-being. Rebuilding after a hurricane boosts GDP, but nobody's better off.

**Why economics is harder than physics:**

Unlike atoms, humans learn, adapt, and change their behavior based on policy. If the Fed announces a rate cut, markets move *before* the cut happens (anticipation). If everyone expects a recession and cuts spending, they *create* the recession (self-fulfilling prophecy). This makes economic prediction fundamentally harder than physical science.

Want me to explain a specific concept, or apply this to a current economic situation?`,
    ],
  },
  {
    keywords: ['psychology', 'cognitive bias', 'memory', 'how the brain works', 'human behavior', 'mental health', 'psychological'],
    answers: [
      `Here's what psychology tells us about this:

**How the brain actually works (vs. how we think it works)**

Your brain is not a computer. It's more like a prediction machine that constantly guesses what's coming next based on patterns, and only updates when reality surprises it. Most of what you "see" is actually your brain hallucinating based on expectations, with your eyes just providing correction signals.

**Cognitive biases that affect everyone:**

1. **Confirmation bias**: We seek and remember information that confirms our beliefs, and ignore or rationalize away contradictory evidence. This is why political debates rarely change anyone's mind.
2. **Availability heuristic**: We judge how likely something is by how easily examples come to mind. Shark attacks feel common because they're dramatic and well-covered; car accidents (far more likely) feel less threatening because they're routine.
3. **Dunning-Kruger effect**: The less competent you are at something, the less able you are to recognize your own incompetence. Expertise brings awareness of how much you *don't* know.
4. **Anchoring**: The first number or piece of information heavily influences all subsequent judgments. This is why negotiations start with extreme offers.
5. **Loss aversion**: Losing $100 feels about twice as bad as gaining $100 feels good. This asymmetry drives much of human decision-making, from investing to relationships.

**Memory is not a recording**

Your memory doesn't work like a hard drive. Every time you recall a memory, you reconstruct it — and in doing so, you subtly alter it. Eyewitness testimony is notoriously unreliable because of this. Flashbulb memories (where you were during 9/11, etc.) feel vivid and certain but are frequently wrong when checked against facts.

**Why this matters:**

Understanding these biases doesn't eliminate them — but it lets you build systems that account for them. Checklists in medicine, blind reviews in science, and structured decision-making frameworks all exist because smart people realized they couldn't trust their own intuition alone.

Want me to go deeper into any specific bias, phenomenon, or area of psychology?`,
    ],
  },
  {
    keywords: ['javascript', 'js programming', 'learn javascript', 'javascript basics'],
    answers: [
      `JavaScript is the programming language of the web. Here's what you need to know:

**What JavaScript does**

Every website you visit runs JavaScript in your browser. It handles everything interactive — buttons that respond to clicks, forms that validate input, animations, data fetching, and dynamic content updates. Without JavaScript, the web would be static pages of text and images.

**Core concepts:**

1. **Variables**: \`let x = 5\` creates a variable you can change. \`const y = 10\` creates one you can't. \`var\` is the old way — avoid it.
2. **Functions**: Reusable blocks of code. \`function greet(name) { return 'Hello ' + name; }\` or the modern arrow form: \`const greet = (name) => \`Hello \${name}\`\`.
3. **Objects and arrays**: The two main data structures. Objects hold key-value pairs: \`{ name: 'Alice', age: 30 }\`. Arrays hold ordered lists: \`[1, 2, 3]\`.
4. **Async/await**: How JS handles operations that take time (fetching data, waiting). \`await fetch(url)\` pauses until the data arrives, then continues. This replaced the older callback and promise chains.

**Why JavaScript is unusual:**

- **Single-threaded**: It runs one operation at a time, but uses an event loop to handle async work without blocking. This is why a slow database query doesn't freeze your entire browser.
- **Prototype-based (not class-based)**: ES6 added \`class\` syntax, but under the hood, JS uses prototypes. This means objects inherit directly from other objects, unlike Java or C++.
- **Everything is dynamic**: Types are checked at runtime, not compile time. A variable can hold a number, then a string, then an object.

**The ecosystem:**

- **React, Vue, Angular**: Frameworks for building UIs
- **Node.js**: Lets JS run on servers, not just browsers
- **TypeScript**: JavaScript + static types, catching errors before runtime
- **npm**: The package manager with over 2 million packages

Want me to explain a specific concept, or show a practical example?`,
    ],
  },
  {
    keywords: ['python', 'python programming', 'learn python', 'python basics'],
    answers: [
      `Python is one of the most popular programming languages in the world. Here's why and how it works:

**What makes Python special**

Python's design philosophy is "readability counts." The syntax is close to plain English — no curly braces, no semicolons, just clean indentation. This makes it the most recommended language for beginners, but it's also powerful enough to run YouTube, Instagram, and most AI/ML research.

**Core concepts:**

1. **Variables**: \`x = 5\` — no need to declare types. Python figures it out.
2. **Lists and dictionaries**: \`[1, 2, 3]\` for ordered lists, \`{'name': 'Alice', 'age': 30}\` for key-value pairs.
3. **Functions**: \`def greet(name): return f'Hello {name}'\`
4. **Indentation matters**: Python uses indentation (not braces) to define code blocks. 4 spaces is the convention.

**Where Python shines:**

- **Data science and ML**: Pandas, NumPy, scikit-learn, PyTorch — the entire AI/ML ecosystem is Python-first.
- **Web development**: Django and Flask are mature, widely used web frameworks.
- **Automation and scripting**: Python is the go-to for automating repetitive tasks — file processing, web scraping, data pipelines.
- **Scientific computing**: Used in physics, biology, finance, and research labs worldwide.

**Python vs. other languages:**

- **vs. JavaScript**: Python is better for data/AI; JavaScript is better for web frontends. Python is simpler; JS is more ubiquitous.
- **vs. Java/C++**: Python is slower but far easier to write. You can prototype in Python 5x faster.
- **vs. Go/Rust**: Go and Rust are faster and better for systems programming, but Python has the biggest ML ecosystem.

**Getting started:**

Install Python from python.org, then start with a simple script:
\`\`\`python
name = input("What's your name? ")
print(f"Hello, {name}!")
\`\`\`

Want me to show a specific example, or explain a particular Python concept?`,
    ],
  },
  {
    keywords: ['renewable energy', 'solar power', 'wind energy', 'clean energy', 'solar panel', 'green energy'],
    answers: [
      `Renewable energy is reshaping how the world powers itself. Here's the current state:

**The main types:**

- **Solar**: Photovoltaic panels convert sunlight directly into electricity. Costs have dropped ~90% in the last decade, making solar the cheapest source of electricity in many regions. The challenge is intermittency — solar only works when the sun shines.
- **Wind**: Turbines convert wind kinetic energy into electricity. Onshore wind is mature and cheap; offshore wind is growing fast and has higher, more consistent output.
- **Hydroelectric**: Dams and rivers. The oldest and largest renewable source, but mostly tapped out in developed countries and has ecological impacts.
- **Geothermal**: Heat from the Earth's core. Consistent baseline power, but geographically limited.
- **Battery storage**: The key enabler. Lithium-ion battery costs have dropped ~90% since 2010. Grid-scale battery installations are growing exponentially, solving the intermittency problem for solar and wind.

**Why the transition is accelerating:**

1. **Cost**: Solar and wind are now cheaper than coal and gas in most of the world. Economics, not policy, is driving the transition.
2. **Scale**: China installs more solar in a month than most countries do in a year. The scale of manufacturing has driven costs through the floor.
3. **Policy**: The US Inflation Reduction Act, EU Green Deal, and China's net-zero commitments are channeling hundreds of billions into clean energy.
4. **Corporate adoption**: Major companies (Google, Amazon, Microsoft) are buying renewable energy at record rates, both for sustainability goals and because it's cheaper.

**The challenges:**

- **Intermittency**: The sun doesn't always shine; wind doesn't always blow. Storage, grid interconnection, and demand response are the solutions.
- **Grid infrastructure**: Old grids weren't built for decentralized power generation. Upgrading transmission lines is a bottleneck.
- **Mining**: Batteries and panels require lithium, cobalt, rare earths. Mining these has environmental and geopolitical implications.
- **Developing nations**: Many countries still need cheap, reliable power and can't afford the upfront cost of renewables, even if they're cheaper long-term.

Want me to go deeper into any specific technology, policy, or challenge?`,
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

// ─── Conversation context awareness ────────────────────────────────────────

function extractUserText(content: string): string {
  // If web search results were injected, strip them to get the real question.
  return content.split('--- Web search results ---')[0].trim();
}

function detectFollowUp(prompt: string, history: ChatTurn[]): boolean {
  const lower = prompt.toLowerCase().trim();
  const followUpPatterns = [
    /^(yes|yeah|yep|sure|ok|okay|please do|go ahead|do it|that sounds great|perfect)\b/i,
    /^(no|nope|not really|nah)\b/i,
    /^(can you|could you|would you|will you)\b/i,
    /^(what about|how about|tell me about|what about|and the)\b/i,
    /^(more|another|next|continue|go on|keep going)\b/i,
    /^(explain|describe|tell me)\s+(that|this|it|more)\b/i,
    /^(why|how come)\b/i,
    /^(give me an example|show me an example)\b/i,
  ];
  if (followUpPatterns.some((p) => p.test(lower))) {
    // Check that there's prior conversation
    const priorUserMessages = history.filter((m) => m.role === 'user');
    return priorUserMessages.length > 1;
  }
  return false;
}

function findPriorTopic(history: ChatTurn[]): string | null {
  // Look at prior user messages for a knowledge-base match
  const priorUserMessages = history.filter((m) => m.role === 'user');
  for (let i = priorUserMessages.length - 2; i >= 0; i--) {
    const text = extractUserText(priorUserMessages[i].content);
    const entry = findKnowledgeEntry(text);
    if (entry) {
      return text;
    }
  }
  return null;
}

// ─── Response builders ──────────────────────────────────────────────────────

function buildContextualResponse(prompt: string, tools: ToolKind[], history: ChatTurn[]): string {
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

  // Thanks
  if (/^(thanks|thank you|thx|appreciate it|ty)\b/i.test(lower)) {
    return pick([
      `You're welcome! Happy to help. Is there anything else you'd like to know?`,
      `Anytime! Feel free to ask if you have more questions.`,
      `Glad I could help! What else can I do for you?`,
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

  // Follow-up detection — if user is responding to a prior topic
  if (detectFollowUp(trimmed, history)) {
    const priorTopic = findPriorTopic(history);
    if (priorTopic) {
      return buildFollowUpResponse(trimmed, priorTopic);
    }
  }

  // Code-related
  if (/code|function|implement|bug|typescript|react|javascript|python|api|component|hook|state|css|html|sql|regex/i.test(trimmed)) {
    return `Here's how I'd approach that:\n\n\`\`\`typescript\n${buildCodeSnippet(trimmed)}\n\`\`\`\n\nA few notes:\n\n- The implementation keeps things simple and readable.\n- Edge cases are handled at the boundaries.\n- You can extend this pattern as your needs grow.\n\nWant me to add tests, or adapt it to a specific framework?`;
  }

  // Writing tasks
  if (/^(write|create|draft|compose)\s/i.test(trimmed) || /essay|email|letter|article|blog|story|poem|summary|summarize|paraphrase|rewrite|edit|proofread/i.test(trimmed)) {
    return `Here's a draft based on your request:\n\n${buildWriting(trimmed)}\n\nI can adjust the tone, length, or focus — just let me know what you'd like changed.`;
  }

  // Lists / brainstorming
  if (/list|ideas|brainstorm|suggest|recommend|options|ways to|tips/i.test(trimmed)) {
    return `Here are some ideas:\n\n${buildList()}\n\nWould you like me to expand on any of these, or explore a different direction?`;
  }

  // Questions — broad detection including "explain", "describe", "tell me", "what are your", etc.
  if (/^(what|who|where|when|why|how|which|can you|could you|do you|are you|is it|will you|explain|describe|tell me about|tell me|define|teach me|what is|what are|what does|how do|how does|why do|why does|why is|why are|what are your|what's|whats)\b/.test(lower)) {
    return buildAnswer(trimmed);
  }

  // Default: acknowledge and respond to the actual content
  return buildDefaultResponse(trimmed);
}

function buildFollowUpResponse(prompt: string, priorTopic: string): string {
  const lower = prompt.toLowerCase();

  if (/^(yes|yeah|yep|sure|ok|okay|please do|go ahead|do it|that sounds great|perfect)\b/i.test(lower)) {
    return `Great — building on what we discussed about ${priorTopic.slice(0, 60)}, let me go deeper:

**Expanding the picture**

There are several layers we haven't explored yet:

1. **Practical implications**: How this plays out in real-world scenarios depends on context, but the underlying principles remain consistent.
2. **Common misconceptions**: People often oversimplify this topic. The reality is more nuanced than it first appears.
3. **Recent developments**: This is an active area, and new findings continue to refine our understanding.

**A concrete example:**

Consider how this applies in a specific case — the details become much clearer when you see them in action rather than in the abstract.

Want me to keep going, or shift to a different aspect?`;
  }

  if (/^(no|nope|not really|nah)\b/i.test(lower)) {
    return `No problem! Is there a different topic you'd like to explore, or a different way I can help?`;
  }

  if (/^(why|how come)\b/i.test(lower)) {
    return `That's a natural follow-up question. Here's the reasoning:

The key insight is that cause and effect in complex topics are rarely simple or linear. Multiple factors interact, and the relative importance of each can shift depending on circumstances. That's why experts often give "it depends" answers — not as a cop-out, but because the honest answer genuinely depends on which factors dominate in a given situation.

Want me to break this down with a specific example?`;
  }

  if (/example|show me|give me/i.test(lower)) {
    return `Here's a concrete example:

**Scenario:** Imagine applying this in a real-world situation where you have limited resources and competing priorities.

1. **Start with the goal**: What are you actually trying to achieve?
2. **Identify constraints**: What can't you change? What's fixed?
3. **Map the options**: Given the constraints, what paths are available?
4. **Evaluate trade-offs**: Each option has costs and benefits — which trade-offs are acceptable?

This framework works across most situations, from business decisions to personal choices.

Want me to walk through a more specific scenario?`;
  }

  if (/more|another|next|continue|go on|keep going/i.test(lower)) {
    return `Let me continue:

**Going further**

Here are additional dimensions worth considering:

- **Historical context**: How has this evolved over time, and what can past patterns tell us?
- **Future trajectory**: Where is this heading, and what signals should we watch?
- **Critiques and limitations**: No framework is perfect. Understanding the edge cases and known weaknesses makes your thinking more robust.

The most valuable thing is to connect these ideas to your specific situation. Theory is useful, but applied knowledge is what creates results.

What aspect interests you most?`;
  }

  return `Building on our earlier discussion about ${priorTopic.slice(0, 60)}, here's more context:

This topic connects to several related areas that might be useful:

1. **The fundamentals** are always the strongest foundation — revisit them whenever things get confusing.
2. **Real-world application** is where understanding becomes skill. Try to find concrete examples in your own experience.
3. **Edge cases** reveal the limits of any framework and sharpen your thinking.

Want me to explore any of these in detail?`;
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
  // Better topic extraction — strip question words AND filler words
  const topic = prompt
    .replace(/^(what|how|why|when|where|who|which|is|are|can|do|does|will|should|would|could|explain|describe|tell me about|tell me|define|teach me|what's|whats|what are|what are your|what is)\s+/i, '')
    .replace(/\b(your|the|a|an|in simple terms|for beginners|in layman'?s terms|step by step|me|about)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[?.!]+$/, '')
    .trim();

  // Check knowledge base for the cleaned-up topic
  const knowledgeAnswer = findKnowledgeEntry(topic);
  if (knowledgeAnswer) return knowledgeAnswer;

  // Also try with the original prompt — sometimes the stripping removes too much
  const originalKnowledge = findKnowledgeEntry(prompt);
  if (originalKnowledge) return originalKnowledge;

  return pick([
    `That's a great question about ${topic || 'that'}. Here's what I can tell you:

**Overview**

This is a multifaceted topic, so let me break it down into the key areas:

1. **The fundamentals**: At its core, this comes down to understanding the basic principles and how they interact. Once you grasp those, the more complex aspects follow naturally.

2. **Why it matters**: The practical significance depends on your specific context — whether you're approaching this from a professional, academic, or personal perspective shapes which aspects are most relevant.

3. **Common pitfalls**: People often oversimplify this. The reality involves competing priorities, trade-offs, and context-dependent factors that don't lend themselves to one-size-fits-all answers.

4. **Getting started**: If you're new to this, the best approach is to start with a concrete example or use case. Abstract theory is much easier to understand once you've seen it applied.

**If you want to go deeper**, tell me what specific aspect you're most interested in, and I can give you a more targeted explanation. I can also provide examples, compare different approaches, or break it down step by step.`,

    `Let me break this down for you:

**The short answer**

${topic ? `When it comes to ${topic},` : 'For this topic,'} the most important thing is to understand that there isn't a single "right" answer — there are better and worse answers depending on your goals and constraints.

**The detailed picture**

Here are the key dimensions to consider:

- **Context is king**: The same approach that works perfectly in one situation can fail in another. Identifying your specific situation is step one.
- **Trade-offs are unavoidable**: Every choice has costs. Being explicit about which trade-offs you're willing to make clarifies the decision.
- **Start with the simplest viable approach**: Complexity should be added only when needed, not preemptively.

**Practical next step**

If you can share more about what you're trying to accomplish, I can give you specific, actionable advice rather than general principles. What's your situation?`,

    `Good question. Here's how I'd think about it:

**Key points:**

1. **The core concept** is more straightforward than it might seem at first. The complexity comes from the number of interacting factors, not from any single factor being difficult to understand.

2. **Real-world application** is where things get interesting. In theory, the principles are clean and logical. In practice, you're dealing with incomplete information, competing priorities, and moving targets.

3. **The best way to learn** this is by doing — pick a small, concrete scenario and work through it end to end. You'll learn more in 30 minutes of hands-on exploration than in hours of reading abstract descriptions.

Want me to go deeper on any of these points, provide a specific example, or address a particular angle?`,
  ]);
}

function buildDefaultResponse(prompt: string): string {
  const topic = prompt.replace(/[?.!]+$/, '').trim().slice(0, 100);

  // Check knowledge base one more time with the raw prompt
  const knowledgeAnswer = findKnowledgeEntry(topic);
  if (knowledgeAnswer) return knowledgeAnswer;

  return pick([
    `I hear you — you're asking about "${topic}". Let me share what I think is most useful:

**The core idea**

This is worth exploring carefully. Rather than a surface-level answer, here's what matters most:

1. **The fundamentals**: Understanding the basic principles first will make everything else click into place. If the foundation is shaky, the details won't stick.

2. **Practical application**: Theory is useful, but it becomes real when you connect it to a concrete situation. Think about how this applies to something you're actually working on or dealing with.

3. **Common misconceptions**: There are a few traps people fall into here. The biggest one is treating this as simpler than it actually is — the nuance matters.

**Next step**

If you tell me more about your specific situation or what you're trying to accomplish, I can give you a much more targeted answer. What's the context?`,

    `Thanks for bringing up "${topic}" — here's how I'd think about it:

There are a few layers to this:

**Layer 1 — The surface**: The basic answer is usually fairly intuitive once you understand the key terms and concepts.

**Layer 2 — The nuance**: This is where it gets interesting. The details reveal trade-offs, edge cases, and dependencies that aren't obvious at first glance.

**Layer 3 — Application**: How this plays out in practice depends heavily on your specific context. Two people can have the same theoretical knowledge and make very different decisions based on their situation.

I can go deeper on any of these layers, or I can provide concrete examples. What would be most useful for you?`,

    `Good question about "${topic}". Let me share my perspective:

The most valuable thing I can tell you is that this topic has both a simple core and rich detail. Here's the approach I'd recommend:

**Start with the simple version:**
- What is it fundamentally? Strip away the jargon and understand the basic mechanism.
- Why does it matter? What problem does it solve, or what value does it create?

**Then add complexity as needed:**
- What are the edge cases and exceptions?
- What factors change the calculus in different situations?
- What are the common mistakes people make?

The reason this approach works is that most complexity is just layers on top of a simple foundation. If you understand the foundation, the layers make sense. If you don't, the layers feel arbitrary and confusing.

Want me to break this down step by step, or give you the high-level overview first?`,
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
  if (lower.includes('debounce')) {
    return `function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {\n  let timer: ReturnType<typeof setTimeout>;\n  return ((...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  }) as T;\n}`;
  }
  return `function solve(input: string): string {\n  // Process the input\n  const result = input\n    .split('\\n')\n    .map(line => line.trim())\n    .filter(Boolean)\n    .join(' ');\n  return result;\n}`;
}

function buildWriting(prompt: string): string {
  const topic = prompt
    .replace(/^(write|create|draft|compose)\s+(an?\s+)?(essay|email|letter|article|blog|story|poem|summary)\s*(about|on|for|to)?\s*/i, '')
    .trim() || 'your topic';
  return `Thank you for reaching out about ${topic.slice(0, 60)}.

I wanted to share some thoughts on this subject. It's a topic that deserves careful consideration, and I appreciate the opportunity to weigh in.

The key points to keep in mind are clarity, purpose, and audience. When all three align, the message resonates.

I'd be happy to refine this further based on your feedback.`;
}

function buildList(): string {
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
    const responseText = buildContextualResponse(prompt, req.tools, req.messages);
    const chunks = splitChunks(responseText);

    for (const chunk of chunks) {
      if (req.signal?.aborted) return;
      await sleep(12 + Math.random() * 20);
      onChunk({ delta: chunk });
    }
    onChunk({ done: true });
  },
};

// Mock web search — returns plausible, query-relevant results so the
// citation UX is fully exercisable. Real providers implement the same
// `WebSearchProvider` interface and slot in via the registry.

import type { WebSearchProvider, WebSearchResult } from '@/ai/types';
import { sleep } from '@/utils';

function buildResults(query: string): WebSearchResult[] {
  const q = query.toLowerCase().trim();

  // Sports / world cup
  if (/world cup|fifa|soccer|football|sports|nfl|nba|mlb|nhl/.test(q)) {
    return [
      {
        url: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup',
        title: 'FIFA World Cup — Official Site',
        snippet: `The FIFA World Cup is the most prestigious tournament in international football. ${query} — find match schedules, results, standings, and historical data here.`,
      },
      {
        url: 'https://en.wikipedia.org/wiki/FIFA_World_Cup',
        title: 'FIFA World Cup — Wikipedia',
        snippet: `The FIFA World Cup is an international association football competition contested by the senior men's national teams of the members of FIFA. Results and history for "${query}".`,
      },
      {
        url: 'https://www.espn.com/soccer/competitions/fifa-world-cup',
        title: 'FIFA World Cup — ESPN',
        snippet: `Get the latest World Cup news, scores, stats, standings, fixtures, and results. Coverage of "${query}" with live updates and analysis.`,
      },
      {
        url: 'https://www.bbc.com/sport/football/world-cup',
        title: 'World Cup — BBC Sport',
        snippet: `World Cup football news, fixtures, results, and analysis. "${query}" — read the latest reports and match commentary.`,
      },
    ];
  }

  // AI / technology
  if (/ai|artificial intelligence|machine learning|ml|neural|llm|gpt|chatbot|model/.test(q)) {
    return [
      {
        url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
        title: 'Artificial intelligence — Wikipedia',
        snippet: `Artificial intelligence (AI) is the intelligence of machines or software, as opposed to the intelligence of humans. Overview of "${query}".`,
      },
      {
        url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
        title: 'AI News — MIT Technology Review',
        snippet: `The latest developments in artificial intelligence, machine learning, and AI research. Coverage of "${query}" with expert analysis.`,
      },
      {
        url: 'https://openai.com/research',
        title: 'Research — OpenAI',
        snippet: `OpenAI's research papers and publications on AI, large language models, and alignment. Related to "${query}".`,
      },
      {
        url: 'https://www.theverge.com/ai-artificial-intelligence',
        title: 'AI — The Verge',
        snippet: `News, reviews, and analysis on artificial intelligence and the companies building it. "${query}" — latest headlines and deep dives.`,
      },
    ];
  }

  // Maps / geography
  if (/map|maps|directions|location|where|geography|google maps/.test(q)) {
    return [
      {
        url: 'https://maps.google.com',
        title: 'Google Maps',
        snippet: `Find local businesses, view maps, and get driving directions. "${query}" — explore satellite imagery, street views, and route planning.`,
      },
      {
        url: 'https://en.wikipedia.org/wiki/Google_Maps',
        title: 'Google Maps — Wikipedia',
        snippet: `Google Maps is a web mapping platform and consumer application offered by Google. Information about "${query}".`,
      },
      {
        url: 'https://www.openstreetmap.org',
        title: 'OpenStreetMap',
        snippet: `A free, editable map of the whole world, built by volunteers. Alternative to commercial mapping services for "${query}".`,
      },
      {
        url: 'https://www.apple.com/maps/',
        title: 'Apple Maps',
        snippet: `Explore the world with interactive maps, 3D cities, and transit directions. "${query}" — navigation and exploration tools.`,
      },
    ];
  }

  // Science / physics / space
  if (/science|physics|gravity|space|cosmic|universe|quantum|relativity|astronomy/.test(q)) {
    return [
      {
        url: 'https://en.wikipedia.org/wiki/Gravity',
        title: 'Gravity — Wikipedia',
        snippet: `Gravity is the result of curving of spacetime by mass and energy. Scientific overview of "${query}" with references.`,
      },
      {
        url: 'https://www.nasa.gov/',
        title: 'NASA',
        snippet: `NASA's official site with news, missions, and research on space and science. Resources related to "${query}".`,
      },
      {
        url: 'https://www.space.com/',
        title: 'Space.com — Space and Astronomy News',
        snippet: `The latest news, discoveries, and research in space and astronomy. Coverage of "${query}" with expert commentary.`,
      },
      {
        url: 'https://www.scientificamerican.com/physics/',
        title: 'Physics — Scientific American',
        snippet: `Physics news, articles, and research from Scientific American. "${query}" — in-depth reporting on scientific developments.`,
      },
    ];
  }

  // Animals / nature
  if (/bird|birds|animal|animals|nature|wildlife|dog|cat|species/.test(q)) {
    return [
      {
        url: 'https://en.wikipedia.org/wiki/Bird',
        title: 'Bird — Wikipedia',
        snippet: `Birds are a group of warm-blooded vertebrates constituting the class Aves. Information about "${query}" with species data.`,
      },
      {
        url: 'https://www.audubon.org/',
        title: 'Audubon — Bird Conservation',
        snippet: `Audubon protects birds and their habitats. Guide to "${query}" — identification, behavior, and conservation status.`,
      },
      {
        url: 'https://www.nationalgeographic.com/animals',
        title: 'Animals — National Geographic',
        snippet: `Explore the animal kingdom with National Geographic. "${query}" — photos, facts, and stories about wildlife.`,
      },
      {
        url: 'https://www.iucnredlist.org/',
        title: 'IUCN Red List of Threatened Species',
        snippet: `The global standard for species conservation status. Data on "${query}" and biodiversity research.`,
      },
    ];
  }

  // Generic / fallback — build results from the query itself
  return [
    {
      url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
      title: `${query.charAt(0).toUpperCase() + query.slice(1)} — Wikipedia`,
      snippet: `Encyclopedia article about "${query}". Overview, history, and key facts with references to primary sources.`,
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      title: `"${query}" — Google Search`,
      snippet: `Search results for "${query}". Find web pages, images, news, and more related to your query.`,
    },
    {
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
      title: `"${query}" — Reddit Discussions`,
      snippet: `Community discussions about "${query}". Read what real people are saying — questions, answers, and personal experiences.`,
    },
    {
      url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
      title: `"${query}" — Google News`,
      snippet: `Latest news articles about "${query}". Breaking headlines, analysis, and reporting from multiple sources.`,
    },
  ];
}

export const mockWebSearchProvider: WebSearchProvider = {
  id: 'mock-web-search',
  async search(query: string): Promise<WebSearchResult[]> {
    await sleep(500 + Math.random() * 400);
    return buildResults(query);
  },
};

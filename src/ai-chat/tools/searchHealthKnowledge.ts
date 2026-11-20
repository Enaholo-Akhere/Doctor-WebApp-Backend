import { z } from 'zod';
import { winston_logger } from '@utils/logger';
import type { AiChatTool } from './types';
import type { AiChatKnowledgeProvider, AiChatKnowledgeResult } from './knowledge/types';
import { medlinePlusProvider } from './knowledge/medlinePlus';

const argsSchema = z.object({ query: z.string().trim().min(2).max(80) });

const RESULT_LIMIT = 3;
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

let provider: AiChatKnowledgeProvider = medlinePlusProvider;
const cache = new Map<string, { at: number; results: AiChatKnowledgeResult[] }>();

/**
 * The query leaves our servers, so keep it to a generic medical term:
 * drop emails, phone/ID-like digit runs and anything beyond a short phrase.
 */
export const sanitizeKnowledgeQuery = (q: string) =>
    q
        .replace(/\S+@\S+/g, ' ')
        .replace(/\+?\d[\d\s().-]{5,}\d/g, ' ')
        .replace(/[^A-Za-z0-9\u00C0-\u024F\s'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60);

/**
 * MedlinePlus ranks topics that merely mention the term (e.g. "Nausea" for
 * "migraine"). Keep results whose title shares a word stem with the query;
 * if none do, keep just the top-ranked one.
 */
export const relevantResults = (query: string, results: AiChatKnowledgeResult[]) => {
    const stems = query
        .toLowerCase()
        .split(/[\s-]+/)
        .filter((w) => w.length >= 3)
        .map((w) => w.slice(0, 5));
    const matching = results.filter((r) => stems.some((s) => r.title.toLowerCase().includes(s)));
    return matching.length ? matching : results.slice(0, 1);
};

/** RAG over trusted sources (currently MedlinePlus). Results are cached for a day. */
export const searchHealthKnowledgeTool: AiChatTool = {
    definition: {
        name: 'searchHealthKnowledge',
        description:
            'Search trusted medical references (MedlinePlus, U.S. National Library of Medicine) for a health topic and get short summaries to base your answer on. Use for factual questions about conditions, symptoms, medicines, tests, nutrition or wellness. Query with a short, generic medical term (e.g. "migraine", "iron deficiency anemia", "ibuprofen"), never personal details.',
        parameters: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Short generic medical search term, in English.' } },
            required: ['query'],
            additionalProperties: false,
        },
    },

    async run(rawArgs) {
        const parsed = argsSchema.safeParse(rawArgs);
        const query = parsed.success ? sanitizeKnowledgeQuery(parsed.data.query) : '';
        if (query.length < 2) return { content: { results: [], note: 'Invalid query. Answer from general knowledge.' } };

        const key = query.toLowerCase();
        const hit = cache.get(key);
        let results: AiChatKnowledgeResult[];

        if (hit && Date.now() - hit.at < CACHE_MS) {
            results = hit.results;
        } else {
            try {
                results = await provider.search(query, RESULT_LIMIT);
            } catch {
                winston_logger.warn(`ai-chat knowledge search failed (${provider.name})`);
                return { content: { results: [], note: 'Reference search is unavailable. Answer carefully from general knowledge.' } };
            }
            if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
            cache.set(key, { at: Date.now(), results });
        }

        results = relevantResults(query, results);
        if (!results.length) return { content: { results: [], note: 'No reference found. Answer carefully from general knowledge.' } };

        return {
            content: {
                results: results.map((r, i) => ({ ref: i + 1, title: r.title, publisher: r.publisher, summary: r.summary })),
                note: 'Base your answer on these references where relevant. The app lists them as sources; do not write URLs.',
            },
            sources: results.map(({ title, url, publisher }) => ({ title, url, publisher })),
        };
    },
};

/** Test hooks. */
export const setKnowledgeProvider = (p: AiChatKnowledgeProvider) => {
    provider = p;
    cache.clear();
};
export const resetKnowledgeProvider = () => setKnowledgeProvider(medlinePlusProvider);

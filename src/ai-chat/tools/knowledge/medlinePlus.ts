import type { AiChatKnowledgeProvider, AiChatKnowledgeResult } from './types';

/**
 * MedlinePlus health topics (US National Library of Medicine, public domain).
 * Free public web service, no API key: https://medlineplus.gov/about/developers/webservices/
 */
const ENDPOINT = 'https://wsearch.nlm.nih.gov/ws/query';
const MAX_SUMMARY_CHARS = 1200;

const decodeEntities = (s: string) =>
    s
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&amp;/g, '&');

/** HTML summary -> compact plain text (list items become "; " separated). */
const toPlainText = (html: string) =>
    decodeEntities(html)
        .replace(/<\/(li)>/gi, '; ')
        .replace(/<\/(p|ul|ol|h\d)>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/;\s*([.?!])/g, '$1')
        .trim();

const field = (doc: string, name: string) => {
    const m = doc.match(new RegExp(`<content name="${name}">([\\s\\S]*?)</content>`));
    return m ? toPlainText(m[1]) : '';
};

export const parseMedlinePlusXml = (xml: string, limit: number): AiChatKnowledgeResult[] => {
    const docs = Array.from(xml.matchAll(/<document[^>]*\burl="([^"]+)"[^>]*>([\s\S]*?)<\/document>/g));
    return docs.slice(0, limit).map(([, url, body]) => {
        const summary = field(body, 'FullSummary') || field(body, 'snippet');
        return {
            title: field(body, 'title'),
            url: decodeEntities(url),
            publisher: 'MedlinePlus (U.S. National Library of Medicine)',
            summary: summary.length > MAX_SUMMARY_CHARS ? `${summary.slice(0, MAX_SUMMARY_CHARS).trimEnd()}…` : summary,
        };
    });
};

export const medlinePlusProvider: AiChatKnowledgeProvider = {
    name: 'medlineplus',
    async search(query, limit) {
        const url = `${ENDPOINT}?db=healthTopics&retmax=${limit}&term=${encodeURIComponent(query)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`MedlinePlus responded ${res.status}`);
        return parseMedlinePlusXml(await res.text(), limit);
    },
};

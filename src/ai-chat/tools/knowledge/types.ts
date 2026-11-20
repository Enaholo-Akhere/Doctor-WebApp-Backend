export interface AiChatKnowledgeResult {
    title: string;
    url: string;
    publisher: string;
    /** Plain-text excerpt given to the model as grounding. */
    summary: string;
}

/**
 * A trusted health-information source. MedlinePlus is the first one; NHS
 * (website content API, needs a free key) or WHO can be added behind this.
 */
export interface AiChatKnowledgeProvider {
    name: string;
    search(query: string, limit: number): Promise<AiChatKnowledgeResult[]>;
}

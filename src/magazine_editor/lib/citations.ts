import { ArticleBlock } from '../types';

/**
 * Regex to find citation tokens like [^refId]
 */
export const CITATION_REGEX = /\[\^([a-zA-Z0-9_-]+)\]/g;

/**
 * Collects all reference IDs cited in the article blocks, in order of appearance.
 * Returns a list of unique IDs.
 */
export function collectCitedReferenceIds(blocks: ArticleBlock[]): string[] {
    const citedIds = new Set<string>();
    const orderedIds: string[] = [];

    const processText = (text: string) => {
        if (!text) return;
        const matches = [...text.matchAll(CITATION_REGEX)];
        for (const match of matches) {
            const id = match[1];
            if (!citedIds.has(id)) {
                citedIds.add(id);
                orderedIds.push(id);
            }
        }
    };

    for (const block of blocks) {
        if (block.type === 'text') {
            processText(block.content.text || '');
            // Also check list items if we parse them, but usually they are in the text
        } else if (block.type === 'sidebar') {
            block.content.sidebarItems?.forEach(group => {
                processText(group.heading);
                group.items.forEach(item => processText(item));
            });
        } else if (block.type === 'quote') {
            processText(block.content.quote || '');
            processText(block.content.author || '');
        } else if (block.type === 'image') {
            processText(block.content.caption || '');
        } else if (block.type === 'title') {
            processText(block.content.title || '');
            processText(block.content.subtitle || '');
        }
    }

    return orderedIds;
}

/**
 * Builds a map of reference ID to its display number (1-based).
 */
export function buildReferenceNumberMap(orderedIds: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    orderedIds.forEach((id, index) => {
        map[id] = index + 1;
    });
    return map;
}

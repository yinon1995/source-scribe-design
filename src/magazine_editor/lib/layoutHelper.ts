import { ArticleBlock } from '../types';
import { Placement } from '../preview/types';

export type Section =
    | { type: 'columns'; left: ArticleBlock[]; right: ArticleBlock[] }
    | { type: 'full'; block: ArticleBlock };

export const getDerivedPlacement = (block: ArticleBlock): Placement => {
    if (block.type === 'image') {
        const pos = block.content.position || 'center';
        if (pos === 'left') return 'left';
        if (pos === 'right') return 'right';
        return 'full';
    }
    // Text and others
    const layout = block.content.layout || block.content.textLayout || 'two_thirds';
    if (layout === 'left_third' || (layout as string) === 'left') return 'left';
    if (layout === 'right_third' || (layout as string) === 'right') return 'right';
    return 'full';
};

export const buildLayoutSections = (blocks: ArticleBlock[]): Section[] => {
    const result: Section[] = [];
    let currentSection: { left: ArticleBlock[]; right: ArticleBlock[] } | null = null;

    const flushSection = () => {
        if (currentSection && (currentSection.left.length > 0 || currentSection.right.length > 0)) {
            result.push({ type: 'columns', ...currentSection });
            currentSection = null;
        }
    };

    for (const block of blocks) {
        const placement = getDerivedPlacement(block);

        if (placement === 'full') {
            flushSection();
            result.push({ type: 'full', block });
        } else {
            if (!currentSection) {
                currentSection = { left: [], right: [] };
            }
            if (placement === 'left') {
                currentSection.left.push(block);
            } else if (placement === 'right') {
                currentSection.right.push(block);
            }
        }
    }

    flushSection();
    return result;
};

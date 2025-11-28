import React, { useMemo } from 'react';
import { ArticleBlock, ArticleSettings, Reference } from '../types';
import { TEXT_STYLES } from '../lib/fonts';
import { Star, Clock } from 'lucide-react';
import { buildLayoutSections } from '../lib/layoutHelper';

// --- RICH TEXT RENDERER ---
const TOKEN_REGEX = /(\[[^\]]+\]\([^)]+\))|(\[\^[a-zA-Z0-9_-]+\])|(\*\*(?!\s)[\s\S]+?\*\*)|(\*(?!\s)[\s\S]+?\*)|(~~(?!\s)[\s\S]+?~~)/g;

const renderRichText = (text: string) => {
    if (!text) return null;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches = [...text.matchAll(TOKEN_REGEX)];

    matches.forEach((match, i) => {
        const fullMatch = match[0];
        const linkMatch = match[1];
        const citeMatch = match[2];
        const boldMatch = match[3];
        const italicMatch = match[4];
        const strikeMatch = match[5];

        if (match.index! > lastIndex) elements.push(text.substring(lastIndex, match.index));

        if (linkMatch) {
            const linkParts = linkMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkParts) {
                elements.push(<a key={`link-${i}`} href={linkParts[2]} target="_blank" rel="noopener noreferrer" className="text-stone-900 border-b border-stone-300 hover:border-stone-900 transition-colors cursor-pointer">{linkParts[1]}</a>);
            } else { elements.push(fullMatch); }
        } else if (citeMatch) {
            elements.push(
                <sup key={`cite-${i}`} className="inline-block ml-0.5 -top-0.5 leading-none">
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-0.5 rounded-sm">#</span>
                </sup>
            );
        } else if (boldMatch) elements.push(<strong key={`b-${i}`} className="font-bold text-stone-900">{boldMatch.slice(2, -2)}</strong>);
        else if (italicMatch) elements.push(<em key={`i-${i}`} className="italic">{italicMatch.slice(1, -1)}</em>);
        else if (strikeMatch) elements.push(<del key={`s-${i}`} className="line-through decoration-stone-400 decoration-1 opacity-70">{strikeMatch.slice(2, -2)}</del>);

        lastIndex = match.index! + fullMatch.length;
    });
    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return elements;
};

// --- HELPER: Parse Text Blocks (Para vs List) ---
const parseTextBlocks = (text: string) => {
    const lines = text.split('\n');
    const result: { type: 'p' | 'ul', content: string[] }[] = [];

    let currentList: string[] = [];
    let currentPara: string[] = [];

    const flushPara = () => {
        if (currentPara.length) {
            result.push({ type: 'p', content: [...currentPara] });
            currentPara = [];
        }
    };

    const flushList = () => {
        if (currentList.length) {
            result.push({ type: 'ul', content: [...currentList] });
            currentList = [];
        }
    };

    lines.forEach(line => {
        const isList = /^\s*[-*•]\s/.test(line);
        if (isList) {
            flushPara();
            currentList.push(line.replace(/^\s*[-*•]\s/, ''));
        } else {
            flushList();
            currentPara.push(line);
        }
    });

    flushPara();
    flushList();

    return result;
};

// --- BLOCK RENDERER ---
const BlockRenderer: React.FC<{ block: ArticleBlock }> = React.memo(({ block }) => {
    const { content } = block;

    switch (block.type) {
        case 'title':
            return (
                <div className="flex flex-col justify-center py-4">
                    {content.subtitle && <span className={`${TEXT_STYLES.subtitle} mb-4 block`}>{content.subtitle}</span>}
                    <h1 className={TEXT_STYLES.display}>{content.title}</h1>
                </div>
            );
        case 'image':
            return (
                <div className="flex flex-col w-full">
                    <figure className="relative block w-full">
                        <div className="w-full overflow-hidden rounded-sm bg-stone-100">
                            {content.imageUrl && <img src={content.imageUrl} alt={content.caption || ''} className="w-full h-auto block pointer-events-none" />}
                        </div>
                        {content.caption && <figcaption className={`${TEXT_STYLES.caption} w-full`}>{content.caption}</figcaption>}
                    </figure>
                </div>
            );
        case 'text':
            const parsedBlocks = parseTextBlocks(content.text || '');
            return (
                <div>
                    {content.heading && <h2 className={TEXT_STYLES.h2}>{content.heading}</h2>}
                    <div className={`${TEXT_STYLES.body}`}>
                        {parsedBlocks.map((b, i) => {
                            if (b.type === 'ul') {
                                return (
                                    <ul key={i} className="mt-4 mb-4 pl-6 list-disc space-y-2">
                                        {b.content.map((item, k) => (
                                            <li key={k} className="text-stone-700 leading-relaxed marker:text-stone-400">
                                                {renderRichText(item)}
                                            </li>
                                        ))}
                                    </ul>
                                );
                            } else {
                                const textContent = b.content.join('\n');
                                const isFirstBlock = i === 0;
                                return (
                                    <p key={i} className={isFirstBlock && content.dropCap ? 'first-letter:text-6xl first-letter:font-serif first-letter:font-medium first-letter:float-left first-letter:mr-3 first-letter:mt-[-4px] first-letter:text-stone-900' : ''}>
                                        {renderRichText(textContent)}
                                    </p>
                                );
                            }
                        })}
                    </div>
                </div>
            );
        case 'sidebar':
            return (
                <aside className="border-l border-stone-200/50 pl-6 my-2">
                    <div className="space-y-6">
                        {content.sidebarItems?.map((group, idx) => (
                            <div key={idx}>
                                <h3 className={TEXT_STYLES.h3}>{group.heading}</h3>
                                <ul className="space-y-2 mt-2">
                                    {group.items.map((item, i) => (
                                        <li key={i} className="font-sans text-sm text-stone-600 flex items-start">
                                            <span className="mr-2 text-stone-300">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </aside>
            );
        case 'quote':
            return (
                <div className="text-center px-4 py-2">
                    <blockquote className="font-serif text-3xl md:text-4xl italic text-stone-800 leading-tight">
                        "{content.quote}"
                    </blockquote>
                    {content.author && (
                        <cite className="block mt-4 font-sans text-xs font-bold uppercase tracking-widest text-stone-400 not-italic">
                            — {content.author}
                        </cite>
                    )}
                </div>
            );
        case 'divider':
            const style = content.dividerStyle || 'thin';
            let borderClass = 'bg-stone-200 h-px';
            if (style === 'bold') borderClass = 'bg-stone-300 h-[2px]';
            if (style === 'dashed') borderClass = 'bg-transparent border-t border-dashed border-stone-300 h-px';
            return (
                <div className="py-8 flex items-center justify-center">
                    <div className={`w-full ${borderClass}`}></div>
                </div>
            );
        default: return null;
    }
});

// --- MAIN COMPONENT ---
interface MagazineArticleViewProps {
    blocks: ArticleBlock[];
    settings?: ArticleSettings;
    references?: Reference[];
}

export const MagazineArticleView: React.FC<MagazineArticleViewProps> = ({
    blocks,
    settings,
    references
}) => {

    // Build Sections using shared helper
    const sections = useMemo(() => buildLayoutSections(blocks), [blocks]);

    if (process.env.NODE_ENV === 'development') {
        console.log('[MagazineArticleView] Layout Sections:', sections);
    }

    // Grid classes for wrappers
    const getGridClasses = (placement: 'left' | 'right' | 'full') => {
        if (placement === 'left') return 'col-span-1 col-start-1';
        if (placement === 'right') return 'col-span-1 col-start-2';
        return 'col-span-2';
    };

    return (
        <article className="relative w-full max-w-[1000px] mx-auto bg-[#fcfbf9] p-8 md:p-16 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-stone-200 min-h-[90vh]">
            {/* Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Header */}
            {settings?.headerEnabled && settings.headerText && (
                <header className="text-center mb-12 pb-6 border-b border-stone-200/60 relative z-10">
                    <span className="font-calligraphy text-4xl text-stone-900">{settings.headerText}</span>
                </header>
            )}

            {/* Category Label */}
            {settings?.category && (
                <div className="relative z-10 mb-6 text-center">
                    <span className="inline-block px-3 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-widest border border-stone-200 rounded-sm bg-stone-50/50">
                        {settings.category}
                    </span>
                </div>
            )}

            {/* Metadata Section */}
            {(settings?.featured || settings?.date || settings?.readingMinutes) && (
                <div className="relative z-10 mb-8 flex flex-wrap items-center justify-center gap-4 text-xs">
                    {/* Featured Badge */}
                    {settings.featured && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <Star size={14} className="text-amber-600 fill-amber-600" />
                            <span className="font-bold text-amber-900 uppercase tracking-wider">Recommandé</span>
                        </div>
                    )}

                    {/* Publication Date */}
                    {settings.date && (
                        <div className="inline-flex items-center gap-2 text-stone-500">
                            <span className="font-sans font-medium">
                                {new Date(settings.date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    )}

                    {/* Reading Time */}
                    {settings.readingMinutes && (
                        <div className="inline-flex items-center gap-1.5 text-stone-500">
                            <Clock size={12} />
                            <span className="font-sans font-medium">{settings.readingMinutes} min de lecture</span>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENT - Independent Flex Columns */}
            <div className="relative z-10 mt-8 flex flex-col gap-y-8">
                {sections.map((section, sIdx) => {
                    if (section.type === 'full') {
                        return (
                            <div key={section.block.id} className={`relative -m-1 p-1 ${getGridClasses('full')}`}>
                                <BlockRenderer block={section.block} />
                            </div>
                        );
                    } else {
                        // Two-column section with independent stacking
                        const hasLeft = section.left.length > 0;
                        const hasRight = section.right.length > 0;

                        if (!hasLeft && !hasRight) return null;

                        return (
                            <div key={`section-${sIdx}`} className="flex gap-x-8">
                                {/* Left Column */}
                                <div className="w-0 flex-1 flex flex-col gap-y-8">
                                    {section.left.map(block => (
                                        <div key={block.id} className={`relative -m-1 p-1 ${getGridClasses('left')}`}>
                                            <BlockRenderer block={block} />
                                        </div>
                                    ))}
                                </div>

                                {/* Right Column */}
                                <div className="w-0 flex-1 flex flex-col gap-y-8">
                                    {section.right.map(block => (
                                        <div key={block.id} className={`relative -m-1 p-1 ${getGridClasses('right')}`}>
                                            <BlockRenderer block={block} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                })}
            </div>

            {/* References Footer */}
            {references && references.length > 0 && (
                <div className="mt-16 pt-8 border-t border-stone-200 relative z-10">
                    <h3 className={TEXT_STYLES.h3}>References</h3>
                    <div className="mt-4 space-y-3">
                        {references.map((ref, idx) => (
                            <div key={ref.id} id={`ref-${ref.id}`} className="flex gap-3 text-sm font-sans text-stone-600">
                                <span className="font-bold text-stone-400 select-none min-w-[20px]">{idx + 1}.</span>
                                <div className="flex-1">
                                    <span className="font-bold text-stone-800">{ref.title}</span>.
                                    {ref.publisher && <span className="text-stone-500 italic"> {ref.publisher}</span>}
                                    {ref.date && <span className="text-stone-500">, {ref.date}</span>}.
                                    {ref.url && (
                                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-stone-400 hover:text-stone-900 underline decoration-stone-300">
                                            Link
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Text */}
            {settings?.footerEnabled && settings.footerText && (
                <footer className="text-center mt-20 pt-6 border-t border-stone-200/60 relative z-10">
                    <span className="font-calligraphy text-2xl text-stone-600">{settings.footerText}</span>
                </footer>
            )}

            <div className="absolute bottom-6 right-6 text-[10px] text-stone-400 font-sans select-none">
                © Nolwenn - À la Brestoise
            </div>
        </article>
    );
};

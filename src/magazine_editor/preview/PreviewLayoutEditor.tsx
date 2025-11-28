import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArticleBlock, TextLayout, ArticleSettings } from '../../types';
import { TEXT_STYLES } from '../lib/fonts';
import { Placement, PreviewLayout } from './types';
import { setPlacement as setStorePlacement } from '../lib/layoutStore';
import { GripVertical, Columns, Maximize2, AlignLeft, AlignRight, X, AlignCenter, Star, Clock } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// --- DRAGGABLE WRAPPER (HTML5) ---
interface BlockWrapperProps {
    id: string;
    block: ArticleBlock;
    placement: Placement;
    onUpdatePlacement: (p: Placement) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDrop: (e: React.DragEvent, id: string) => void;
    isDragging: boolean;
    readOnly?: boolean;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({
    id, block, placement, onUpdatePlacement, onDragStart, onDragOver, onDrop, isDragging, readOnly
}) => {
    const [showToolbar, setShowToolbar] = useState(false);
    const isDragHandleActive = useRef(false);
    const pressStartTime = useRef(0);

    // Grid classes
    const gridClasses = useMemo(() => {
        if (placement === 'left') return 'col-span-1 col-start-1';
        if (placement === 'right') return 'col-span-1 col-start-2';
        return 'col-span-2';
    }, [placement]);

    const handleHandleMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;
        isDragHandleActive.current = true;
        pressStartTime.current = Date.now();
    };

    const handleHandleMouseUp = (e: React.MouseEvent) => {
        if (readOnly) return;
        isDragHandleActive.current = false;
        const diff = Date.now() - pressStartTime.current;
        if (diff < 200) {
            // It was a click, toggle toolbar
            setShowToolbar(prev => !prev);
        }
    };

    const handleWrapperDragStart = (e: React.DragEvent) => {
        if (readOnly || !isDragHandleActive.current) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(e, id);
        setShowToolbar(false);
    };

    return (
        <div
            className={`relative group/block -m-1 p-1 rounded transition-all ${isDragging ? 'opacity-40 bg-stone-100' : 'hover:outline hover:outline-1 hover:outline-stone-300'} ${gridClasses}`}
            draggable={!readOnly}
            onDragStart={handleWrapperDragStart}
            onDragOver={(e) => onDragOver(e, id)}
            onDrop={(e) => onDrop(e, id)}
            onDragEnd={() => { isDragHandleActive.current = false; }}
        >
            {/* HANDLE */}
            {!readOnly && (
                <div
                    className="absolute -left-6 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-600 opacity-0 group-hover/block:opacity-100 transition-opacity z-50 touch-none"
                    onMouseDown={handleHandleMouseDown}
                    onMouseUp={handleHandleMouseUp}
                >
                    <GripVertical size={14} />
                </div>
            )}

            {/* TOOLBAR */}
            {showToolbar && !readOnly && (
                <div
                    className="absolute top-0 left-[-20px] z-[60] bg-stone-900 text-white p-1 rounded shadow-xl flex gap-1 min-w-[100px] animate-fade-in"
                    onMouseLeave={() => setShowToolbar(false)}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button onClick={() => onUpdatePlacement('left')} className={`p-1.5 rounded-sm ${placement === 'left' ? 'bg-stone-600' : 'hover:bg-stone-700'}`} title="Left">
                        <AlignLeft size={14} />
                    </button>
                    <button onClick={() => onUpdatePlacement('full')} className={`p-1.5 rounded-sm ${placement === 'full' ? 'bg-stone-600' : 'hover:bg-stone-700'}`} title="Full">
                        <Maximize2 size={14} />
                    </button>
                    <button onClick={() => onUpdatePlacement('right')} className={`p-1.5 rounded-sm ${placement === 'right' ? 'bg-stone-600' : 'hover:bg-stone-700'}`} title="Right">
                        <AlignRight size={14} />
                    </button>
                    <div className="w-px bg-stone-700 mx-1"></div>
                    <button onClick={() => setShowToolbar(false)} className="p-1.5 hover:text-red-300"><X size={14} /></button>
                </div>
            )}

            <BlockRenderer block={block} />
        </div>
    );
};

// --- MAIN EDITOR ---
interface PreviewLayoutEditorProps {
    articleId: string;
    blocks: ArticleBlock[];
    readOnly?: boolean;
    onUpdateBlock?: (id: string, updates: Partial<ArticleBlock['content']>) => void;
    settings?: ArticleSettings;
}

export const PreviewLayoutEditor: React.FC<PreviewLayoutEditorProps> = ({
    articleId,
    blocks,
    readOnly = false,
    onUpdateBlock,
    settings
}) => {

    // 1. ISOLATE: Create immutable copy of blocks to ensure NO leakage to Builder
    const blocksRO = useMemo(() => {
        return blocks.map(b => {
            // Deep freeze in dev to catch mutations
            if (process.env.NODE_ENV !== 'production') {
                const frozen = { ...b, content: { ...b.content } };
                Object.freeze(frozen);
                Object.freeze(frozen.content);
                return frozen;
            }
            return { ...b };
        });
    }, [blocks]);

    const blockMap = useMemo(() => new Map(blocksRO.map(b => [b.id, b])), [blocksRO]);

    // 2. STATE: Local layout state (ONLY for order now, placement comes from block)
    const [layout, setLayout] = useState<PreviewLayout>({ order: [], placementById: {} });
    const [draggedId, setDraggedId] = useState<string | null>(null);

    // 3. SYNC: Load order from local storage
    useEffect(() => {
        try {
            const savedKey = `previewLayout:${articleId}`;
            const savedJson = localStorage.getItem(savedKey);
            const saved: PreviewLayout = savedJson ? JSON.parse(savedJson) : { order: [], placementById: {} };

            const currentIds = new Set(blocksRO.map(b => b.id));

            // Filter out deleted
            let newOrder = saved.order.filter(id => currentIds.has(id));

            // Append new
            blocksRO.forEach(b => {
                if (!newOrder.includes(b.id)) newOrder.push(b.id);
            });

            // Ignore saved placements! We now derive them.
            setLayout({ order: newOrder, placementById: {} });
        } catch (e) {
            console.error("Failed to load layout", e);
        }
    }, [articleId, blocksRO]);

    // 4. PERSIST (Order only)
    const saveOrder = useCallback((newOrder: string[]) => {
        const newLayout = { order: newOrder, placementById: {} };
        setLayout(newLayout);
        if (!readOnly) {
            localStorage.setItem(`previewLayout:${articleId}`, JSON.stringify(newLayout));
        }
    }, [articleId, readOnly]);

    // 5. HELPER: Derive Placement from Block Content (SSOT)
    const getDerivedPlacement = useCallback((id: string): Placement => {
        const block = blockMap.get(id);
        if (!block) return 'full';

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
    }, [blockMap]);

    // 6. UPDATE: Write back to Block Content + Store (for Builder sync)
    const handleUpdatePlacement = (id: string, p: Placement) => {
        if (!onUpdateBlock) return;
        const block = blockMap.get(id);
        if (!block) return;

        // 1. Update Block Data (SSOT)
        if (block.type === 'image') {
            const newPos = p === 'full' ? 'center' : p;
            onUpdateBlock(id, { position: newPos });
        } else {
            // Default text to 'two_thirds' for full width unless specifically standard 'full' is needed
            // but sticking to standard conventions for article body
            let newLayout: TextLayout = 'two_thirds';
            if (p === 'left') newLayout = 'left_third';
            if (p === 'right') newLayout = 'right_third';

            onUpdateBlock(id, { layout: newLayout });
        }

        // 2. Update Layout Store (Legacy Sync) - Essential so AdminBuilder reflects the change immediately
        // because AdminBuilder reads from layoutStore to determine active button state.
        if (!readOnly) {
            setStorePlacement(articleId, id, p);
        }
    };

    // 7. DRAG HANDLERS
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            return;
        }

        const oldIndex = layout.order.indexOf(draggedId);
        const newIndex = layout.order.indexOf(targetId);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = [...layout.order];
            newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, draggedId);
            saveOrder(newOrder);
        }
        setDraggedId(null);
    };

    // 8. BUILD SECTIONS (for independent column stacking)
    type Section =
        | { type: 'columns'; left: string[]; right: string[] }
        | { type: 'full'; blockId: string };

    const sections = useMemo((): Section[] => {
        const result: Section[] = [];
        let currentSection: { left: string[]; right: string[] } | null = null;

        const flushSection = () => {
            if (currentSection && (currentSection.left.length > 0 || currentSection.right.length > 0)) {
                result.push({ type: 'columns', ...currentSection });
                currentSection = null;
            }
        };

        for (const blockId of layout.order) {
            const placement = getDerivedPlacement(blockId);

            if (placement === 'full') {
                flushSection();
                result.push({ type: 'full', blockId });
            } else {
                if (!currentSection) {
                    currentSection = { left: [], right: [] };
                }
                if (placement === 'left') {
                    currentSection.left.push(blockId);
                } else if (placement === 'right') {
                    currentSection.right.push(blockId);
                }
            }
        }

        flushSection();
        return result;
    }, [layout.order, getDerivedPlacement]);


    return (
        <article className="relative w-full max-w-[1000px] mx-auto bg-[#fcfbf9] p-8 md:p-16 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-stone-200 min-h-[90vh]">
            {/* Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Guides */}
            {!readOnly && (
                <>
                    <div className="absolute top-0 left-0 right-0 h-8 flex justify-between px-16 text-[9px] font-bold text-stone-300 uppercase tracking-widest border-b border-dashed border-stone-100 pt-2 pointer-events-none">
                    </div>
                    <div className="absolute inset-y-0 left-1/2 w-px border-r border-dashed border-stone-100 pointer-events-none z-0"></div>
                </>
            )}

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
                        const block = blockMap.get(section.blockId);
                        if (!block) return null;

                        return (
                            <BlockWrapper
                                key={section.blockId}
                                id={section.blockId}
                                block={block}
                                placement="full"
                                onUpdatePlacement={(p) => handleUpdatePlacement(section.blockId, p)}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                isDragging={draggedId === section.blockId}
                                readOnly={readOnly}
                            />
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
                                    {section.left.map(blockId => {
                                        const block = blockMap.get(blockId);
                                        if (!block) return null;

                                        return (
                                            <BlockWrapper
                                                key={blockId}
                                                id={blockId}
                                                block={block}
                                                placement="left"
                                                onUpdatePlacement={(p) => handleUpdatePlacement(blockId, p)}
                                                onDragStart={handleDragStart}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDrop}
                                                isDragging={draggedId === blockId}
                                                readOnly={readOnly}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Right Column */}
                                <div className="w-0 flex-1 flex flex-col gap-y-8">
                                    {section.right.map(blockId => {
                                        const block = blockMap.get(blockId);
                                        if (!block) return null;

                                        return (
                                            <BlockWrapper
                                                key={blockId}
                                                id={blockId}
                                                block={block}
                                                placement="right"
                                                onUpdatePlacement={(p) => handleUpdatePlacement(blockId, p)}
                                                onDragStart={handleDragStart}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDrop}
                                                isDragging={draggedId === blockId}
                                                readOnly={readOnly}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }
                })}
            </div>

            {/* Footer Text */}
            {settings?.footerEnabled && settings.footerText && (
                <footer className="text-center mt-20 pt-6 border-t border-stone-200/60 relative z-10">
                    <span className="font-calligraphy text-2xl text-stone-600">{settings.footerText}</span>
                </footer>
            )}

            {!readOnly && (
                <div className="absolute bottom-6 right-6 text-[10px] text-stone-400 font-sans select-none">
                    © Nolwenn - À la Brestoise
                </div>
            )}

            {/* Print Footer Mark (Only for PDF export logic usage) */}
            {readOnly && (
                <div className="print-footer-mark hidden print:block fixed bottom-4 right-4 text-[10pt] text-stone-500 font-sans z-50">
                    © Nolwenn - À la Brestoise
                </div>
            )}
        </article>
    );
};

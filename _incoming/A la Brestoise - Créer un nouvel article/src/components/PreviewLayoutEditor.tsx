import React, { useState, useMemo } from 'react';
import { ArticleBlock, PreviewLayoutState, Reference, ArticleSettings } from '../types';
import { TEXT_STYLES } from '../lib/fonts';
import { GripVertical, AlignLeft, AlignCenter, AlignRight, Columns, Maximize2, X } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Shared Rendering Logic (Copied from ArticleRenderer to ensure isolation) ---
const TOKEN_REGEX = /(\[[^\]]+\]\([^)]+\))|(\[\^[a-zA-Z0-9_-]+\])|(\*\*(?!\s)[\s\S]+?\*\*)|(\*(?!\s)[\s\S]+?\*)|(~~(?!\s)[\s\S]+?~~)/g;

const renderRichText = (text: string, citationOrder: Map<string, number>) => {
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
            const id = citeMatch.replace('[^', '').replace(']', '');
            const number = citationOrder.get(id);
            if (number) {
                elements.push(
                    <sup key={`cite-${i}`} className="inline-block ml-0.5 -top-0.5 leading-none">
                        <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-0.5 rounded-sm">{number}</span>
                    </sup>
                );
            } else { elements.push(fullMatch); }
        } else if (boldMatch) elements.push(<strong key={`b-${i}`} className="font-bold text-stone-900">{boldMatch.slice(2, -2)}</strong>);
        else if (italicMatch) elements.push(<em key={`i-${i}`} className="italic">{italicMatch.slice(1, -1)}</em>);
        else if (strikeMatch) elements.push(<del key={`s-${i}`} className="line-through decoration-stone-400 decoration-1 opacity-70">{strikeMatch.slice(2, -2)}</del>);
        
        lastIndex = match.index! + fullMatch.length;
    });
    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return elements;
};

// --- Row Building Logic ---
type Row = 
  | { kind: 'full'; block: ArticleBlock }
  | { kind: 'split'; left?: ArticleBlock; right?: ArticleBlock };

function buildRows(blocks: ArticleBlock[], layout: PreviewLayoutState): Row[] {
  const rows: Row[] = [];
  const blockMap = new Map(blocks.map(b => [b.id, b]));
  let currentRow: { left?: ArticleBlock; right?: ArticleBlock } = {};

  const flush = () => {
    if (currentRow.left || currentRow.right) {
      rows.push({ kind: 'split', ...currentRow });
      currentRow = {};
    }
  };

  // 1. Determine the effective order
  const orderedIds = [...layout.order];
  blocks.forEach(b => {
    if (!orderedIds.includes(b.id)) orderedIds.push(b.id);
  });
  
  const validIds = orderedIds.filter(id => blockMap.has(id));

  // 2. Build rows deterministically
  validIds.forEach(id => {
    const block = blockMap.get(id);
    if (!block) return;

    const placement = layout.placements[id] || 'full';

    if (placement === 'full') {
      flush();
      rows.push({ kind: 'full', block });
    } else if (placement === 'left') {
      if (currentRow.left) flush(); // Left occupied? New row.
      currentRow.left = block;
    } else if (placement === 'right') {
      if (currentRow.right) flush(); // Right occupied? New row.
      currentRow.right = block;
    }
  });

  flush();
  return rows;
}

// --- Layout Toolbar ---
interface LayoutToolbarProps {
  block: ArticleBlock;
  layout: PreviewLayoutState;
  onUpdate: (updates: Partial<PreviewLayoutState>) => void;
  onClose: () => void;
}

const LayoutToolbar: React.FC<LayoutToolbarProps> = ({ block, layout, onUpdate, onClose }) => {
  const placement = layout.placements[block.id] || 'full';
  
  const setPlacement = (p: 'left' | 'right' | 'full') => {
    onUpdate({ placements: { ...layout.placements, [block.id]: p } });
  };

  const setTextAlign = (a: 'left' | 'center' | 'right') => {
    onUpdate({ textAlignments: { ...layout.textAlignments, [block.id]: a } });
  };

  const setImageSize = (s: 'sm' | 'md' | 'lg' | 'full') => {
    onUpdate({ imageSizes: { ...layout.imageSizes, [block.id]: s } });
  };

  const setImageAlign = (a: 'left' | 'center' | 'right') => {
    onUpdate({ imageAlignments: { ...layout.imageAlignments, [block.id]: a } });
  };

  return (
    <div 
      className="absolute top-8 left-0 z-50 bg-stone-900 text-white p-1.5 rounded shadow-xl flex flex-col gap-2 min-w-[140px] animate-fade-in"
      onPointerDownCapture={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center border-b border-stone-700 pb-1 mb-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Layout</span>
        <button onClick={onClose}><X size={10} className="text-stone-400 hover:text-white" /></button>
      </div>

      <div className="flex gap-1 bg-stone-800 p-0.5 rounded">
        {[{ id: 'left', icon: Columns }, { id: 'full', icon: Maximize2 }, { id: 'right', icon: Columns }].map((opt) => (
           <button
             key={opt.id}
             onClick={() => setPlacement(opt.id as any)}
             className={`flex-1 flex justify-center py-1 rounded-sm ${placement === opt.id ? 'bg-stone-600' : 'hover:bg-stone-700'}`}
             title={opt.id.toUpperCase()}
           >
             <opt.icon size={12} className={opt.id === 'right' ? 'scale-x-[-1]' : ''} />
           </button>
        ))}
      </div>

      {block.type === 'text' && (
         <div className="flex gap-1 bg-stone-800 p-0.5 rounded">
           {[{id: 'left', icon: AlignLeft}, {id: 'center', icon: AlignCenter}, {id: 'right', icon: AlignRight}].map(opt => (
              <button key={opt.id} onClick={() => setTextAlign(opt.id as any)} className={`flex-1 flex justify-center py-1 rounded-sm ${((layout.textAlignments[block.id] || 'left') === opt.id) ? 'bg-stone-600' : 'hover:bg-stone-700'}`}>
                <opt.icon size={12} />
              </button>
           ))}
         </div>
      )}

      {block.type === 'image' && (
        <>
           <div className="flex gap-1 bg-stone-800 p-0.5 rounded">
              {['sm', 'md', 'lg', 'full'].map(s => (
                 <button key={s} onClick={() => setImageSize(s as any)} className={`flex-1 text-[8px] font-mono py-1 rounded-sm ${((layout.imageSizes[block.id] || 'full') === s) ? 'bg-stone-600' : 'hover:bg-stone-700'}`}>
                    {s.toUpperCase()}
                 </button>
              ))}
           </div>
           <div className="flex gap-1 bg-stone-800 p-0.5 rounded">
             {[{id: 'left', icon: AlignLeft}, {id: 'center', icon: AlignCenter}, {id: 'right', icon: AlignRight}].map(opt => (
                <button key={opt.id} onClick={() => setImageAlign(opt.id as any)} className={`flex-1 flex justify-center py-1 rounded-sm ${((layout.imageAlignments[block.id] || 'center') === opt.id) ? 'bg-stone-600' : 'hover:bg-stone-700'}`}>
                  <opt.icon size={12} />
                </button>
             ))}
           </div>
        </>
      )}
    </div>
  );
};

// --- Sortable Wrapper ---
interface SortableBlockWrapperProps {
  block: ArticleBlock;
  layout: PreviewLayoutState;
  citationOrder: Map<string, number>;
  onUpdateLayout?: (updates: Partial<PreviewLayoutState>) => void;
  readOnly?: boolean;
}

const SortableBlockWrapper: React.FC<SortableBlockWrapperProps> = ({ block, layout, citationOrder, onUpdateLayout, readOnly }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled: readOnly });
  const [showToolbar, setShowToolbar] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : showToolbar ? 40 : 1,
    opacity: isDragging ? 0.4 : 1,
  };

  // Rendering logic copied to ensure isolation
  const { content } = block;
  const textAlign = layout.textAlignments[block.id] || 'left';
  const imgSize = layout.imageSizes[block.id] || 'full';
  const imgAlign = layout.imageAlignments[block.id] || 'center';
  const textAlignClass = textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left';

  const renderContent = () => {
    switch (block.type) {
      case 'title':
        return (
          <div className={`flex flex-col justify-center ${textAlignClass} py-4`}>
            {content.subtitle && <span className={`${TEXT_STYLES.subtitle} mb-4 block`}>{content.subtitle}</span>}
            <h1 className={TEXT_STYLES.display}>{content.title}</h1>
          </div>
        );
      case 'image':
        let widthClass = 'w-full';
        if (imgSize === 'sm') widthClass = 'w-[60%]';
        if (imgSize === 'md') widthClass = 'w-[75%]';
        if (imgSize === 'lg') widthClass = 'w-[90%]';
        
        let alignClass = 'mx-auto';
        if (imgAlign === 'left') alignClass = 'mr-auto';
        if (imgAlign === 'right') alignClass = 'ml-auto';
        
        return (
          <div className={`flex flex-col w-full`}>
             <figure className={`relative block ${widthClass} ${alignClass}`}>
               <div className="w-full overflow-hidden rounded-sm bg-stone-100">
                 <img src={content.imageUrl} alt={content.caption || ''} className="w-full h-auto block" loading="lazy" />
               </div>
               {content.caption && <figcaption className={`${TEXT_STYLES.caption} w-full`}>{content.caption}</figcaption>}
             </figure>
          </div>
        );
      case 'text':
        return (
          <div className={`${textAlignClass}`}>
            {content.heading && <h2 className={TEXT_STYLES.h2}>{content.heading}</h2>}
            <div className={`${TEXT_STYLES.body}`}>
              <p className={content.dropCap ? 'first-letter:text-6xl first-letter:font-serif first-letter:font-medium first-letter:float-left first-letter:mr-3 first-letter:mt-[-4px] first-letter:text-stone-900' : ''}>
                {renderRichText(content.text || '', citationOrder)}
              </p>
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
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group/block rounded-sm -m-1 p-1 transition-all ${!readOnly ? 'hover:outline hover:outline-1 hover:outline-stone-300' : ''}`}
    >
       {!readOnly && (
         <button
           {...attributes}
           {...listeners}
           className="absolute -left-4 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover/block:opacity-100 cursor-grab active:cursor-grabbing hover:bg-stone-100 rounded-l"
           onClick={(e) => {
               e.preventDefault();
               setShowToolbar(!showToolbar);
           }}
         >
           <GripVertical size={12} className="text-stone-400" />
         </button>
       )}

       {showToolbar && !readOnly && onUpdateLayout && (
         <LayoutToolbar 
            block={block} 
            layout={layout} 
            onUpdate={onUpdateLayout} 
            onClose={() => setShowToolbar(false)} 
         />
       )}

       {renderContent()}
    </div>
  );
};

// --- Main Component ---
interface PreviewLayoutEditorProps {
  blocks: ArticleBlock[];
  tags?: string[];
  references?: Reference[];
  settings?: ArticleSettings;
  layoutState: PreviewLayoutState;
  setLayoutState: (s: PreviewLayoutState) => void;
  readOnly?: boolean;
}

export const PreviewLayoutEditor: React.FC<PreviewLayoutEditorProps> = ({ 
  blocks, tags, references, settings, layoutState, setLayoutState, readOnly = false
}) => {
  
  const citationOrder = useMemo(() => {
    const order = new Map<string, number>();
    if (!references) return order;
    let count = 1;
    const orderedIds = layoutState.order.length > 0 ? layoutState.order : blocks.map(b => b.id);
    const blockMap = new Map(blocks.map(b => [b.id, b]));
    
    orderedIds.forEach(id => {
      const b = blockMap.get(id);
      if (b?.type === 'text' && b.content.text) {
        const matches = b.content.text.matchAll(/\[\^([a-zA-Z0-9_-]+)\]/g);
        for (const match of matches) {
          const refId = match[1];
          if (!order.has(refId)) order.set(refId, count++);
        }
      }
    });
    return order;
  }, [blocks, layoutState.order, references]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }) 
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
       const oldOrder = layoutState.order;
       const oldIndex = oldOrder.indexOf(active.id as string);
       const newIndex = oldOrder.indexOf(over?.id as string);
       
       if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(oldOrder, oldIndex, newIndex);
          setLayoutState({ ...layoutState, order: newOrder });
       }
    }
  };

  const handleUpdateLayout = (updates: Partial<PreviewLayoutState>) => {
    setLayoutState({ ...layoutState, ...updates });
  };

  const rows = buildRows(blocks, layoutState);

  const orderedRefs = references 
    ? references.filter(r => citationOrder.has(r.id)).sort((a, b) => (citationOrder.get(a.id)! - citationOrder.get(b.id)!))
    : [];

  return (
    <article className="relative w-full max-w-[1000px] mx-auto bg-[#fcfbf9] p-8 md:p-16 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-stone-200 min-h-[90vh]">
        {/* Grain Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-multiply" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>

        {/* Visual Columns UI (Preview Only) */}
        {!readOnly && (
          <>
            <div className="absolute top-0 left-0 right-0 h-8 flex justify-between px-16 text-[9px] font-bold text-stone-300 uppercase tracking-widest border-b border-dashed border-stone-100 pt-2 pointer-events-none">
                <span className="bg-[#fcfbf9] px-2">Left Col</span>
                <span className="bg-[#fcfbf9] px-2">Right Col</span>
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layoutState.order} strategy={rectSortingStrategy} disabled={readOnly}>
                <div className="flex flex-col gap-8 relative z-10">
                   {rows.map((row, idx) => {
                      if (row.kind === 'full') {
                         return (
                            <div key={`row-${idx}`} className="w-full">
                               <SortableBlockWrapper 
                                  block={row.block} 
                                  layout={layoutState} 
                                  citationOrder={citationOrder}
                                  onUpdateLayout={handleUpdateLayout}
                                  readOnly={readOnly}
                               />
                            </div>
                         );
                      } else {
                         return (
                            <div key={`row-${idx}`} className="grid grid-cols-2 gap-8 items-start">
                               <div className="col-span-1 min-w-0">
                                  {row.left && (
                                     <SortableBlockWrapper 
                                        block={row.left} 
                                        layout={layoutState} 
                                        citationOrder={citationOrder}
                                        onUpdateLayout={handleUpdateLayout}
                                        readOnly={readOnly}
                                     />
                                  )}
                               </div>
                               <div className="col-span-1 min-w-0">
                                  {row.right && (
                                     <SortableBlockWrapper 
                                        block={row.right} 
                                        layout={layoutState} 
                                        citationOrder={citationOrder}
                                        onUpdateLayout={handleUpdateLayout}
                                        readOnly={readOnly}
                                     />
                                  )}
                               </div>
                            </div>
                         );
                      }
                   })}
                </div>
            </SortableContext>
        </DndContext>

        {/* Refs Footer */}
        {orderedRefs.length > 0 && (
            <div className="mt-16 pt-8 border-t border-stone-200 relative z-10">
                <h3 className={TEXT_STYLES.h3}>References</h3>
                <div className="mt-4 space-y-2">
                    {orderedRefs.map(ref => (
                        <div key={ref.id} className="flex gap-2 text-sm text-stone-600 font-sans">
                            <span className="font-bold text-stone-400">{citationOrder.get(ref.id)}.</span>
                            <span>{ref.title}, {ref.publisher} ({ref.date})</span>
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
        
        {/* Web Footer Mark */}
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

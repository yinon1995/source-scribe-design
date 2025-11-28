
import React from 'react';
import { ArticleRendererProps, ArticleBlock, TextLayout } from '../types';
import { TEXT_STYLES } from '../lib/fonts';

// Standard Grid Mapping for standalone text blocks
const getGridColumnClass = (layout: TextLayout = 'two_thirds'): string => {
  switch (layout) {
    case 'full':
      return 'col-span-1 md:col-span-12';
    case 'left_third':
      return 'col-span-1 md:col-span-4 lg:col-span-4 lg:col-start-1';
    case 'middle_third':
      return 'col-span-1 md:col-span-4 lg:col-span-4 lg:col-start-5';
    case 'right_third':
      return 'col-span-1 md:col-span-4 lg:col-span-4 lg:col-start-9';
    case 'two_thirds':
    default:
      return 'col-span-1 md:col-span-12 lg:col-span-7 lg:col-start-1 lg:pr-6';
  }
};

interface BlockRendererProps {
  block: ArticleBlock;
  className?: string; // Optional override for container class
  renderText?: (text: string) => React.ReactNode;
}

// Helper to split content into paragraphs and lists
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

// Renders individual blocks. 
// When inside a FlowSection, the `className` prop handles the specific layout context (e.g. inside a sidebar).
const BlockRenderer: React.FC<BlockRendererProps> = ({ block, className, renderText }) => {
  const { content } = block;

  switch (block.type) {
    case 'title':
      return (
        <div className={className || "col-span-1 md:col-span-12 lg:col-span-7 flex flex-col justify-center lg:pr-8 lg:col-start-1"}>
          {content.subtitle && (
            <span className={`${TEXT_STYLES.subtitle} mb-4 block`}>{content.subtitle}</span>
          )}
          <h1 className={TEXT_STYLES.display}>{content.title}</h1>
        </div>
      );

    case 'image':
      const pos = content.position || 'center';
      const scale = content.scale ?? 1.0;
      // Convert scale to percentage, clamp 50-180
      const widthPercent = Math.max(50, Math.min(180, Math.round(scale * 100)));

      // If no className provided, assume standalone grid item behavior
      const wrapperClass = className || 'col-span-1 md:col-span-12';

      // Alignment inside the figure wrapper
      let alignSelfClass = 'items-center'; // Default center
      if (pos === 'left') alignSelfClass = 'items-start mr-auto';
      if (pos === 'right') alignSelfClass = 'items-end ml-auto';
      if (pos === 'center') alignSelfClass = 'items-center mx-auto';

      return (
        <div className={`${wrapperClass} flex flex-col`}>
          <figure
            className={`relative block transition-[width] duration-300 ease-out ${alignSelfClass}`}
            style={{ width: `min(100%, ${widthPercent}%)` }}
          >
            <div className="w-full overflow-hidden rounded-sm bg-stone-100">
              <img
                src={content.imageUrl}
                alt={content.caption || 'Article image'}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
            {content.caption && (
              <figcaption className={`${TEXT_STYLES.caption} w-full`}>
                {content.caption}
              </figcaption>
            )}
          </figure>
        </div>
      );

    case 'text':
      // If className passed (e.g. inside FlowSection), use it. 
      // Otherwise calculate based on text layout preference.
      let textGridClass = className;
      if (!textGridClass) {
        // Fallback logic for standalone text blocks
        const activeLayout = content.layout || content.textLayout || 'two_thirds';
        // DEBUG: Log layout to trace
        console.log("TEXT_LAYOUT_RENDER", block.id, activeLayout);
        textGridClass = getGridColumnClass(activeLayout);
      }

      const parsedBlocks = parseTextBlocks(content.text || '');

      return (
        <div className={textGridClass}>
          {content.heading && (
            <h2 className={TEXT_STYLES.h2}>{content.heading}</h2>
          )}
          <div className={`${TEXT_STYLES.body}`} style={{ textAlign: content.textAlign }}>
            {parsedBlocks.map((b, i) => {
              if (b.type === 'ul') {
                return (
                  <ul key={i} className="mt-4 mb-4 pl-6 list-disc space-y-2">
                    {b.content.map((item, k) => (
                      <li key={k} className="text-stone-700 leading-relaxed marker:text-stone-400">
                        {renderText ? renderText(item) : item}
                      </li>
                    ))}
                  </ul>
                );
              } else {
                const textContent = b.content.join('\n');
                const isFirstBlock = i === 0;
                return (
                  <p key={i} className={isFirstBlock && content.dropCap ? 'first-letter:text-6xl first-letter:font-serif first-letter:font-medium first-letter:float-left first-letter:mr-3 first-letter:mt-[-4px] first-letter:text-stone-900' : ''}>
                    {renderText ? renderText(textContent) : textContent}
                  </p>
                );
              }
            })}
          </div>
        </div>
      );

    case 'sidebar':
      return (
        <aside className={className || "col-span-1 md:col-span-4 lg:col-span-3 lg:col-start-9 lg:pl-8 border-l border-stone-200/0 lg:border-stone-200/50 h-fit mt-2"}>
          <div className="space-y-8">
            {content.sidebarItems?.map((group, idx) => (
              <div key={idx}>
                <h3 className={TEXT_STYLES.h3}>{group.heading}</h3>
                <ul className="space-y-2 mt-3">
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
        <div className={className || "col-span-1 md:col-span-12 lg:col-span-8 lg:col-start-3 text-center px-4"}>
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
      const width = content.dividerWidth || 'content';

      let borderClass = 'bg-stone-200 h-px';
      if (style === 'bold') borderClass = 'bg-stone-300 h-[2px]';
      if (style === 'dashed') borderClass = 'bg-transparent border-t border-dashed border-stone-300 h-px';

      const wrapperClassDiv = className || 'col-span-1 md:col-span-12';
      const innerWidthClass = width === 'content' ? 'w-[min(680px,100%)] mx-auto' : 'w-full';

      return (
        <div className={`${wrapperClassDiv} py-8 flex items-center justify-center`}>
          <div className={`${innerWidthClass} ${borderClass}`}></div>
        </div>
      );

    default:
      return null;
  }
};

interface FlowSectionProps {
  direction: 'left' | 'right';
  textBlocks: ArticleBlock[];
  imgBlocks: ArticleBlock[];
  renderText?: (text: string) => React.ReactNode;
}

const FlowSection: React.FC<FlowSectionProps> = ({ direction, textBlocks, imgBlocks, renderText }) => {
  // CONFIGURATION
  // Left Flow: Rail (5) | Text (7)
  // Right Flow: Text (7) | Rail (5)

  // FIX: Let Text Block layout preference override the default direction derived from the image.
  const textPreference = textBlocks.find(b => {
    const l = b.content.layout || b.content.textLayout;
    return l === 'left_third' || l === 'right_third';
  });

  let effectiveDirection = direction;

  if (textPreference) {
    const layout = textPreference.content.layout || textPreference.content.textLayout;
    if (layout === 'left_third') {
      // User wants Text on LEFT. In this component, Text Left = Image Right = direction 'right'
      effectiveDirection = 'right';
    } else if (layout === 'right_third') {
      // User wants Text on RIGHT. In this component, Text Right = Image Left = direction 'left'
      effectiveDirection = 'left';
    }
  }

  const isRight = effectiveDirection === 'right';

  const TextColumn = (
    <div className="col-span-1 md:col-span-7 flex flex-col gap-6">
      {textBlocks.map(block => (
        <BlockRenderer key={block.id} block={block} className="w-full" renderText={renderText} />
      ))}
    </div>
  );

  const ImageRail = (
    <div className={`col-span-1 md:col-span-5 flex flex-col gap-8 ${isRight ? 'md:col-start-8' : 'md:col-start-1'}`}>
      {imgBlocks.map(block => (
        // Images in rail take full width of the rail container, internal scaling logic handles the rest.
        <BlockRenderer key={block.id} block={block} className="w-full" />
      ))}
    </div>
  );

  return (
    <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-y-8 gap-x-8 items-start">
      {/* 
        DOM Order Strategy for Mobile:
        - If Image is LEFT, we want Image FIRST on mobile. -> [ImageRail, TextColumn]
        - If Image is RIGHT, we want Text FIRST on mobile. -> [TextColumn, ImageRail]
      */}
      {isRight ? (
        <>
          {TextColumn}
          {ImageRail}
        </>
      ) : (
        <>
          {ImageRail}
          {TextColumn}
        </>
      )}
    </div>
  );
};

// Regex for citations [^id], Markdown-style links [text](url), and Formatting
// 1. Link: [text](url)
// 2. Citation: [^id]
// 3. Bold: **text** (lazy match, ensuring no space after open/before close for cleaner matching)
// 4. Italic: *text* (lazy match)
// 5. Strike: ~~text~~
const TOKEN_REGEX = /(\[[^\]]+\]\([^)]+\))|(\[\^[a-zA-Z0-9_-]+\])|(\*\*(?!\s)[\s\S]+?\*\*)|(\*(?!\s)[\s\S]+?\*)|(~~(?!\s)[\s\S]+?~~)/g;

export const ArticleRenderer: React.FC<ArticleRendererProps> = ({ blocks, tags, references, settings }) => {

  // 1. Calculate Citation Order based on occurrence in text blocks
  const citationOrder = React.useMemo(() => {
    if (!references || references.length === 0) return new Map<string, number>();

    const foundIds = new Set<string>();
    const order = new Map<string, number>();
    const validIds = new Set(references.map(r => r.id));
    let count = 1;

    // We only tokenize to find citation keys
    blocks.forEach(block => {
      if (block.type === 'text' && block.content.text) {
        const matches = block.content.text.matchAll(/\[\^([a-zA-Z0-9_-]+)\]/g);
        for (const match of matches) {
          const id = match[1];
          if (validIds.has(id) && !foundIds.has(id)) {
            foundIds.add(id);
            order.set(id, count++);
          }
        }
      }
    });
    return order;
  }, [blocks, references]);

  // 2. Render Text Helper
  const renderRichText = (text: string) => {
    if (!text) return null;

    // Iterate manually via matchAll to avoid split capturing group issues
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    const matches = [...text.matchAll(TOKEN_REGEX)];

    matches.forEach((match, i) => {
      const fullMatch = match[0];
      const linkMatch = match[1]; // [text](url)
      const citeMatch = match[2]; // [^id]
      const boldMatch = match[3]; // **text**
      const italicMatch = match[4]; // *text*
      const strikeMatch = match[5]; // ~~text~~

      // Push text before match
      if (match.index! > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }

      if (linkMatch) {
        // Parse [text](url)
        const linkParts = linkMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkParts) {
          elements.push(
            <a key={`link-${i}`} href={linkParts[2]} target="_blank" rel="noopener noreferrer" className="text-stone-900 border-b border-stone-300 hover:border-stone-900 transition-colors cursor-pointer">
              {linkParts[1]}
            </a>
          );
        } else {
          elements.push(fullMatch);
        }
      } else if (citeMatch) {
        // Parse [^id]
        const id = citeMatch.replace('[^', '').replace(']', '');
        const number = citationOrder.get(id);
        if (number) {
          elements.push(
            <sup key={`cite-${i}`} className="inline-block ml-0.5 -top-0.5 leading-none">
              <a
                href={`#ref-${id}`}
                id={`cite-${id}`} // Anchor for back-linking
                className="text-[10px] font-bold text-stone-500 hover:text-stone-900 transition-colors bg-stone-100 px-0.5 rounded-sm"
              >
                {number}
              </a>
            </sup>
          );
        } else {
          elements.push(fullMatch); // Invalid citation
        }
      } else if (boldMatch) {
        elements.push(<strong key={`b-${i}`} className="font-bold text-stone-900">{boldMatch.slice(2, -2)}</strong>);
      } else if (italicMatch) {
        elements.push(<em key={`i-${i}`} className="italic">{italicMatch.slice(1, -1)}</em>);
      } else if (strikeMatch) {
        elements.push(<del key={`s-${i}`} className="line-through decoration-stone-400 decoration-1 opacity-70">{strikeMatch.slice(2, -2)}</del>);
      }

      lastIndex = match.index! + fullMatch.length;
    });

    // Push remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
  };

  const renderSections = () => {
    const rendered = [];

    // Grouping Logic
    let currentRun: ArticleBlock[] = [];
    let currentRunDirection: 'left' | 'right' | null = null;

    const flushRun = () => {
      if (currentRun.length === 0) return;

      const flowImages = currentRun.filter(b => b.type === 'image');

      if (flowImages.length > 0 && currentRunDirection) {
        // Render as Flow Section
        rendered.push(
          <FlowSection
            key={`flow-${currentRun[0].id}`}
            direction={currentRunDirection}
            textBlocks={currentRun.filter(b => b.type === 'text')}
            imgBlocks={flowImages}
            renderText={renderRichText}
          />
        );
      } else {
        // Render individually (Standard)
        currentRun.forEach(b => {
          rendered.push(<BlockRenderer key={b.id} block={b} renderText={renderRichText} />);
        });
      }

      currentRun = [];
      currentRunDirection = null;
    };

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isText = block.type === 'text';
      const isImage = block.type === 'image';
      const pos = block.content.position || 'center';

      const isSideImage = isImage && (pos === 'left' || pos === 'right');

      if (isText || isSideImage) {
        if (isText) {
          currentRun.push(block);
        } else {
          if (currentRunDirection === null) {
            currentRunDirection = pos as 'left' | 'right';
            currentRun.push(block);
          } else if (currentRunDirection === pos) {
            currentRun.push(block);
          } else {
            flushRun();
            currentRunDirection = pos as 'left' | 'right';
            currentRun.push(block);
          }
        }
      } else {
        flushRun();
        rendered.push(<BlockRenderer key={block.id} block={block} renderText={renderRichText} />);
      }
    }

    flushRun();

    return rendered;
  };

  const getOrderedReferences = () => {
    if (citationOrder.size === 0) return [];
    const ordered: { number: number; ref: any }[] = [];
    citationOrder.forEach((num, id) => {
      const refDef = references?.find(r => r.id === id);
      if (refDef) {
        ordered.push({ number: num, ref: refDef });
      }
    });
    return ordered.sort((a, b) => a.number - b.number);
  };

  const orderedRefs = getOrderedReferences();

  return (
    <article lang="en" className="relative w-full max-w-[1200px] mx-auto bg-[#fcfbf9] p-6 md:p-12 lg:p-16 pb-24 md:pb-32 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-stone-200/60 min-h-[90vh]">
      {/* Grain Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-multiply"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Article Header (Calligraphy) */}
      {settings?.headerEnabled && settings.headerText && (
        <header className="relative z-10 text-center mb-12 pb-6 border-b border-stone-200/60">
          <span className="font-calligraphy text-4xl md:text-5xl text-stone-900 leading-tight">
            {settings.headerText}
          </span>
        </header>
      )}

      {/* Article Hashtags / Metadata */}
      {tags && tags.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-3 mb-12 mt-2">
          {tags.map(tag => (
            <span key={tag} className="font-sans text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Main Grid Container */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-y-10 lg:gap-y-12 lg:gap-x-8 items-start">
        {renderSections()}

        {/* References Footer */}
        {orderedRefs.length > 0 && (
          <div className="col-span-1 md:col-span-12 lg:col-span-7 lg:col-start-1 mt-16 pt-8 border-t border-stone-200">
            <h3 className={TEXT_STYLES.h3}>References</h3>
            <div className="mt-4 space-y-3">
              {orderedRefs.map(({ number, ref }) => (
                <div key={ref.id} id={`ref-${ref.id}`} className="flex gap-3 text-sm font-sans text-stone-600">
                  <span className="font-bold text-stone-400 select-none min-w-[20px]">{number}.</span>
                  <div className="flex-1">
                    <span className="font-bold text-stone-800">{ref.title}</span>.
                    {ref.publisher && <span className="text-stone-500 italic"> {ref.publisher}</span>}
                    {ref.date && <span className="text-stone-500">, {ref.date}</span>}.
                    {ref.url && (
                      <a href={ref.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-stone-400 hover:text-stone-900 underline decoration-stone-300">
                        Link
                      </a>
                    )}
                    {/* Back link jumps to the FIRST occurrence anchor */}
                    <a href={`#cite-${ref.id}`} className="ml-2 text-stone-300 hover:text-blue-500 no-underline" title="Back to citation">
                      ↩
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Article Footer (Calligraphy) */}
      {settings?.footerEnabled && settings.footerText && (
        <footer className="relative z-10 text-center mt-20 pt-6 border-t border-stone-200/60 pb-8">
          <span className="font-calligraphy text-2xl md:text-3xl text-stone-600 leading-tight">
            {settings.footerText}
          </span>
        </footer>
      )}

      {/* Web Footer Mark (In-Paper) - Hidden on Print */}
      <div className="web-footer-mark absolute bottom-6 right-6 md:bottom-12 md:right-12 text-[10px] md:text-xs text-stone-400 font-sans select-none print:hidden">
        © Nolwenn - À la Brestoise
      </div>

      {/* Print Footer Mark (Repeats on every page via fixed positioning in App.tsx exporter, or print styles here) */}
      <div className="print-footer-mark hidden print:block fixed bottom-4 right-4 text-[10pt] text-stone-500 font-sans z-50">
        © Nolwenn - À la Brestoise
      </div>
    </article>
  );
}

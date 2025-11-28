
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AdminBuilderProps, ArticleBlock, BlockType, TextLayout, Reference, ArticleSettings } from '../types';
import { Trash2, ArrowUp, ArrowDown, Type, Image as ImageIcon, MessageSquare, Heading, List, X, Upload, GripVertical, AlignLeft, AlignCenter, AlignRight, Plus, Hash, Link as LinkIcon, Quote, BookOpen, LayoutTemplate, AlertCircle, Minus, Bold, Italic, Strikethrough, Loader2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TagsEditor: React.FC<{ tags: string[], onChange: (tags: string[]) => void }> = ({ tags, onChange }) => {
  const [inputVal, setInputVal] = useState(tags.join(', '));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    
    // Normalize and Update
    const newTags = val.split(',')
      .map(t => t.trim())
      .map(t => t.replace(/^#/, '')) // remove # prefix if user typed it
      .filter(t => t.length > 0);
      
    // De-duplicate and limit to 12
    const uniqueTags = Array.from(new Set(newTags)).slice(0, 12);
    onChange(uniqueTags);
  };

  return (
    <div className="mb-6 bg-white p-5 rounded-md border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-3">
         <Hash size={14} className="text-stone-400" />
         <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
           Article Hashtags
         </label>
      </div>
      
      <input 
        type="text"
        value={inputVal}
        onChange={handleChange}
        placeholder="e.g. design, architecture, minimal (comma separated)"
        className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 font-sans text-sm focus:border-stone-800 focus:outline-none transition-colors mb-4 placeholder:text-stone-400"
      />
      
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center px-2 py-1 rounded-sm bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
              #{tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-stone-300 italic">No tags added yet.</p>
      )}
    </div>
  );
};

const HeaderFooterEditor: React.FC<{ settings: ArticleSettings, onChange: (s: ArticleSettings) => void }> = ({ settings, onChange }) => {
  // Defensive: ensure settings exists
  const safeSettings = settings || { headerEnabled: false, headerText: '', footerEnabled: false, footerText: '' };

  return (
    <div className="mb-6 bg-white p-5 rounded-md border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
       <div className="flex items-center gap-2 mb-4">
         <LayoutTemplate size={14} className="text-stone-400" />
         <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
           Header & Footer
         </label>
      </div>

      <div className="space-y-6">
        {/* Header Section */}
        <div className="relative">
           <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase">Header</label>
              <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-2 py-1 rounded border border-stone-200 hover:bg-stone-100 transition-colors">
                 <input 
                    type="checkbox" 
                    checked={safeSettings.headerEnabled} 
                    onChange={(e) => onChange({...safeSettings, headerEnabled: e.target.checked})}
                    className="accent-stone-900 cursor-pointer"
                 />
                 <span className="text-[10px] font-bold text-stone-600 select-none cursor-pointer">Show</span>
              </label>
           </div>
           <input 
             type="text"
             disabled={!safeSettings.headerEnabled}
             value={safeSettings.headerText || ''}
             onChange={(e) => onChange({...safeSettings, headerText: e.target.value})}
             className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 font-sans text-sm focus:border-stone-800 focus:outline-none disabled:opacity-50 disabled:bg-stone-50 transition-colors placeholder:text-stone-400"
             placeholder="Header Text"
           />
           {safeSettings.headerEnabled && safeSettings.headerText && (
             <div className="mt-3 text-center border border-stone-100 rounded p-2 bg-stone-50/50">
                <p className="text-[9px] text-stone-300 uppercase mb-1">Preview</p>
                <span className="font-calligraphy text-xl text-stone-800">{safeSettings.headerText}</span>
                <div className="w-8 h-px bg-stone-200 mx-auto mt-1"></div>
             </div>
           )}
        </div>

        {/* Footer Section */}
        <div className="relative">
           <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase">Footer</label>
               <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-2 py-1 rounded border border-stone-200 hover:bg-stone-100 transition-colors">
                 <input 
                    type="checkbox" 
                    checked={safeSettings.footerEnabled} 
                    onChange={(e) => onChange({...safeSettings, footerEnabled: e.target.checked})}
                    className="accent-stone-900 cursor-pointer"
                 />
                 <span className="text-[10px] font-bold text-stone-600 select-none cursor-pointer">Show</span>
              </label>
           </div>
           <input 
             type="text"
             disabled={!safeSettings.footerEnabled}
             value={safeSettings.footerText || ''}
             onChange={(e) => onChange({...safeSettings, footerText: e.target.value})}
             className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 font-sans text-sm focus:border-stone-800 focus:outline-none disabled:opacity-50 disabled:bg-stone-50 transition-colors placeholder:text-stone-400"
             placeholder="Footer Text"
           />
           {safeSettings.footerEnabled && safeSettings.footerText && (
             <div className="mt-3 text-center border border-stone-100 rounded p-2 bg-stone-50/50">
                <p className="text-[9px] text-stone-300 uppercase mb-1">Preview</p>
                <div className="w-8 h-px bg-stone-200 mx-auto mb-1"></div>
                <span className="font-calligraphy text-xl text-stone-800">{safeSettings.footerText}</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const ReferencesEditor: React.FC<{ references: Reference[], onChange: (refs: Reference[]) => void }> = ({ references, onChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newRef, setNewRef] = useState<Reference>({ id: '', title: '', url: '', publisher: '', date: '' });

  const addReference = () => {
    if (!newRef.id || !newRef.title) return;
    
    // Normalize ID
    const id = newRef.id.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (references.some(r => r.id === id)) {
      alert("ID must be unique");
      return;
    }

    onChange([...references, { ...newRef, id }]);
    setNewRef({ id: '', title: '', url: '', publisher: '', date: '' });
    setIsAdding(false);
  };

  const removeReference = (id: string) => {
    onChange(references.filter(r => r.id !== id));
  };

  return (
    <div className="mb-6 bg-white p-5 rounded-md border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-stone-400" />
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              References & Citations
            </label>
         </div>
         <span className="text-[9px] text-stone-400 font-mono bg-stone-100 px-1.5 py-0.5 rounded">Use [^id] to cite</span>
      </div>

      <div className="space-y-3 mb-4">
        {references.map((ref) => (
           <div key={ref.id} className="flex items-start gap-3 p-3 bg-stone-50 rounded border border-stone-100 group">
              <div className="flex-1 min-w-0">
                 <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] font-bold text-stone-500 font-mono bg-stone-200 px-1.5 rounded">{ref.id}</span>
                    <h4 className="text-xs font-bold text-stone-800 truncate">{ref.title}</h4>
                 </div>
                 <div className="text-[10px] text-stone-500 truncate flex gap-2">
                    {ref.publisher && <span>{ref.publisher}</span>}
                    {ref.date && <span>• {ref.date}</span>}
                    {ref.url && <a href={ref.url} target="_blank" className="text-blue-500 hover:underline flex items-center gap-0.5"><LinkIcon size={8} /> Link</a>}
                 </div>
              </div>
              <button onClick={() => removeReference(ref.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={12} />
              </button>
           </div>
        ))}
      </div>

      {isAdding ? (
        <div className="p-3 bg-stone-50 rounded border border-stone-200 animate-fade-in">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Citation ID (e.g. who2024)</label>
                <input 
                  type="text" 
                  className="w-full p-1.5 text-xs border border-stone-200 rounded font-mono"
                  placeholder="unique-id"
                  value={newRef.id}
                  onChange={e => setNewRef({...newRef, id: e.target.value})}
                />
              </div>
              <div>
                 <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Source Title</label>
                 <input 
                    type="text" 
                    className="w-full p-1.5 text-xs border border-stone-200 rounded"
                    placeholder="Article or Book Title"
                    value={newRef.title}
                    onChange={e => setNewRef({...newRef, title: e.target.value})}
                  />
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input type="text" placeholder="URL (Optional)" className="p-1.5 text-xs border border-stone-200 rounded" value={newRef.url} onChange={e => setNewRef({...newRef, url: e.target.value})} />
              <input type="text" placeholder="Publisher" className="p-1.5 text-xs border border-stone-200 rounded" value={newRef.publisher} onChange={e => setNewRef({...newRef, publisher: e.target.value})} />
              <input type="text" placeholder="Date" className="p-1.5 text-xs border border-stone-200 rounded" value={newRef.date} onChange={e => setNewRef({...newRef, date: e.target.value})} />
           </div>
           <div className="flex justify-end gap-2">
              <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-200 rounded">Cancel</button>
              <button onClick={addReference} disabled={!newRef.id || !newRef.title} className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded disabled:opacity-50">Save Reference</button>
           </div>
        </div>
      ) : (
        <button 
           onClick={() => setIsAdding(true)} 
           className="w-full py-2 border border-dashed border-stone-300 text-stone-400 rounded hover:border-stone-400 hover:text-stone-600 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
        >
          <Plus size={12} /> Add Reference
        </button>
      )}
    </div>
  );
};

const BlockLayoutSelector: React.FC<{
  current: TextLayout | undefined;
  onChange: (layout: TextLayout) => void;
}> = ({ current, onChange }) => {
  const layouts: { id: TextLayout; label: string; gridVisual: React.ReactNode }[] = [
    { 
      id: 'two_thirds', 
      label: 'Main Body',
      gridVisual: <div className="flex w-full h-full gap-0.5"><div className="w-[66%] bg-current opacity-80 rounded-[1px]"></div><div className="w-[33%] border border-current opacity-20 border-dashed rounded-[1px]"></div></div>
    },
    { 
      id: 'left_third', 
      label: 'Left Col',
      gridVisual: <div className="flex w-full h-full gap-0.5"><div className="w-[33%] bg-current opacity-80 rounded-[1px]"></div><div className="w-[66%] opacity-10"></div></div>
    },
    { 
      id: 'middle_third', 
      label: 'Mid Col',
      gridVisual: <div className="flex w-full h-full gap-0.5"><div className="w-[33%] opacity-10"></div><div className="w-[33%] bg-current opacity-80 rounded-[1px]"></div><div className="w-[33%] opacity-10"></div></div>
    },
    { 
      id: 'right_third', 
      label: 'Right Col',
      gridVisual: <div className="flex w-full h-full gap-0.5"><div className="w-[66%] opacity-10"></div><div className="w-[33%] bg-current opacity-80 rounded-[1px]"></div></div>
    },
    { 
      id: 'full', 
      label: 'Full Width',
      gridVisual: <div className="w-full h-full bg-current opacity-80 rounded-[1px]"></div>
    },
  ];

  return (
    <div className="mb-4">
      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Column Grid Layout</label>
      <div className="flex gap-2 flex-wrap">
        {layouts.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={(e) => {
               e.stopPropagation();
               onChange(l.id);
            }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
              (current === l.id || (!current && l.id === 'two_thirds'))
                ? 'bg-stone-800 text-white border-stone-800 ring-1 ring-stone-800' 
                : 'bg-white text-stone-400 border-stone-200 hover:border-stone-400 hover:text-stone-600'
            }`}
            title={l.label}
          >
            <div className="w-8 h-5">{l.gridVisual}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const AddBlockPill: React.FC<{
  onAdd: (type: BlockType) => void;
  showLabel?: boolean;
}> = ({ onAdd, showLabel = true }) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-stone-200 rounded-full px-4 py-2 flex items-center gap-2"
      onPointerDownCapture={stop}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onClick={stop}
    >
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-2">
          Add Block
        </span>
      )}

      <button type="button" onClick={() => onAdd('title')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 hover:text-stone-900 transition-colors" title="Headline">
        <Heading size={18} />
      </button>
      <div className="w-px h-4 bg-stone-200"></div>

      <button type="button" onClick={() => onAdd('text')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 hover:text-stone-900 transition-colors" title="Text Paragraph">
        <Type size={18} />
      </button>
      <div className="w-px h-4 bg-stone-200"></div>

      <button type="button" onClick={() => onAdd('image')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 hover:text-stone-900 transition-colors" title="Image">
        <ImageIcon size={18} />
      </button>
      <div className="w-px h-4 bg-stone-200"></div>

      <button type="button" onClick={() => onAdd('quote')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 hover:text-stone-900 transition-colors" title="Quote">
        <MessageSquare size={18} />
      </button>
      <div className="w-px h-4 bg-stone-200"></div>

      <button type="button" onClick={() => onAdd('sidebar')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 hover:text-stone-900 transition-colors" title="Sidebar List">
        <List size={18} />
      </button>
      <div className="w-px h-4 bg-stone-200"></div>

      <button type="button" onClick={() => onAdd('divider')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 hover:text-stone-900 transition-colors" title="Divider">
        <Minus size={18} />
      </button>
    </div>
  );
};

interface BlockEditorProps {
  block: ArticleBlock;
  updateBlock: (id: string, updates: Partial<ArticleBlock['content']>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isSelected: boolean;
  onSelect: (id: string) => void;
  references: Reference[];
  onAddReference: (ref: Reference) => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ 
  block, updateBlock, removeBlock, moveBlock, isFirst, isLast, 
  dragHandleProps, isSelected, onSelect, references, onAddReference 
}) => {
  
  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCitePopover, setShowCitePopover] = useState(false);
  const [createRefMode, setCreateRefMode] = useState(false);
  const [newRefData, setNewRefData] = useState<Reference>({ id: '', title: '', url: '', publisher: '', date: '' });
  
  // Validate Citations in Text Blocks
  const validReferenceIds = React.useMemo(() => new Set(references.map(r => r.id)), [references]);
  const missingCitations = React.useMemo(() => {
    if (block.type !== 'text' || !block.content.text) return [];
    
    const matches = [...block.content.text.matchAll(/\[\^([a-zA-Z0-9_-]+)\]/g)];
    const missing = new Set<string>();
    
    matches.forEach(m => {
        const id = m[1];
        if (!validReferenceIds.has(id)) {
            missing.add(id);
        }
    });
    
    return Array.from(missing);
  }, [block.content.text, block.type, validReferenceIds]);

  const insertToken = (token: string, wrapPattern?: [string, string], allowEmpty = false) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const fullText = ta.value;
      const selected = fullText.substring(start, end);

      let newText = '';
      let newCursorPos = end;

      if (wrapPattern) {
          // Link behavior: [selected](url)
          // Formatting behavior: **selected**
          
          if (start === end && !allowEmpty) {
              alert("Please select text first.");
              return;
          }
          
          newText = fullText.substring(0, start) + wrapPattern[0] + selected + wrapPattern[1] + fullText.substring(end);
          
          if (start === end) {
              // Cursor in between markers
              newCursorPos = start + wrapPattern[0].length;
          } else {
              // Cursor after markers
              newCursorPos = start + wrapPattern[0].length + selected.length + wrapPattern[1].length;
          }
      } else {
          // Citation behavior: Append token AFTER selection
          newText = fullText.substring(0, end) + token + fullText.substring(end);
          newCursorPos = end + token.length;
      }
      
      // Update state
      updateBlock(block.id, { text: newText });

      // Restore cursor next tick
      requestAnimationFrame(() => {
          if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
      });
  };

  const handleList = () => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    // Expand selection to full lines
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = val.length;

    const chunk = val.slice(lineStart, lineEnd);
    const lines = chunk.split('\n');

    // Detect if all lines in selection are already list items
    const allList = lines.every(l => !l.trim() || /^\s*[-*•]\s/.test(l));

    const newLines = lines.map(l => {
      if (!l.trim()) return l;
      if (allList) return l.replace(/^\s*[-*•]\s/, ''); // Remove
      if (/^\s*[-*•]\s/.test(l)) return l; // Already list
      return `- ${l}`; // Add list
    });

    const newChunk = newLines.join('\n');
    const newVal = val.slice(0, lineStart) + newChunk + val.slice(lineEnd);

    updateBlock(block.id, { text: newVal });

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(lineStart, lineStart + newChunk.length);
      }
    });
  };
  
  const handleCiteClick = () => {
      setShowCitePopover(!showCitePopover);
      setCreateRefMode(false);
  };
  
  const handleFormat = (type: 'bold' | 'italic' | 'strike') => {
     let m1 = '', m2 = '';
     if (type === 'bold') { m1 = '**'; m2 = '**'; }
     else if (type === 'italic') { m1 = '*'; m2 = '*'; }
     else if (type === 'strike') { m1 = '~~'; m2 = '~~'; }
     
     insertToken('', [m1, m2], true);
  };

  const insertCite = (id: string) => {
      insertToken(`[^${id}]`);
      setShowCitePopover(false);
  };

  const handleCreateRef = () => {
     if (!newRefData.id || !newRefData.title) return;
     
     // Normalize ID
     const safeId = newRefData.id.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
     
     if (references.some(r => r.id === safeId)) {
        alert("ID already exists!");
        return;
     }
     
     const ref = { ...newRefData, id: safeId };
     onAddReference(ref);
     insertCite(safeId);
     setNewRefData({ id: '', title: '', url: '', publisher: '', date: '' });
  };

  const renderInputs = () => {
    switch (block.type) {
      case 'title':
        return (
          <div className="space-y-3" onPointerDownCapture={stopProp}>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Headline</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 font-serif text-2xl focus:border-stone-800 focus:outline-none transition-colors placeholder:text-stone-400"
                placeholder="Article Headline"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Subtitle</label>
              <input
                type="text"
                value={block.content.subtitle || ''}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 font-sans text-xs uppercase tracking-widest focus:border-stone-800 focus:outline-none transition-colors placeholder:text-stone-400"
                placeholder="Subtitle / Eyebrow"
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-3" onPointerDownCapture={stopProp}>
             <BlockLayoutSelector 
                current={block.content.layout || block.content.textLayout} 
                onChange={(layout) => updateBlock(block.id, { layout: layout })}
             />

             <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Section Header (Optional)</label>
              <input
                type="text"
                value={block.content.heading || ''}
                onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 font-serif text-lg focus:border-stone-800 focus:outline-none placeholder:text-stone-400"
                placeholder="Subheading"
              />
            </div>
             
             {/* Toolbar Text Area Container */}
             <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Body Text</label>
                </div>
                
                <div className="flex items-center flex-wrap gap-1 bg-stone-100 border border-stone-200 border-b-0 rounded-t-sm p-1.5 relative">
                   {/* Formatting Buttons */}
                   <button
                     type="button"
                     onClick={() => handleFormat('bold')}
                     onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                     className="p-1.5 hover:bg-white hover:text-stone-900 rounded-sm text-stone-600 transition-colors"
                     title="Bold (Selection)"
                   >
                      <Bold size={14} />
                   </button>
                   <button
                     type="button"
                     onClick={() => handleFormat('italic')}
                     onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                     className="p-1.5 hover:bg-white hover:text-stone-900 rounded-sm text-stone-600 transition-colors"
                     title="Italic (Selection)"
                   >
                      <Italic size={14} />
                   </button>
                   <button
                     type="button"
                     onClick={() => handleFormat('strike')}
                     onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                     className="p-1.5 hover:bg-white hover:text-stone-900 rounded-sm text-stone-600 transition-colors"
                     title="Strikethrough (Selection)"
                   >
                      <Strikethrough size={14} />
                   </button>

                   <div className="w-px h-4 bg-stone-300 mx-1"></div>

                   {/* LINK REMOVED — BULLETS ADDED */}
                   <button
                     type="button"
                     onClick={handleList}
                     onMouseDown={(e) => e.preventDefault()}
                     onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                     className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-white hover:text-stone-900 rounded-sm text-stone-600 transition-colors text-xs font-medium"
                     title="Bullets"
                   >
                      <List size={14} />
                      Bullets
                   </button>
                   
                   <div className="w-px h-4 bg-stone-300 mx-1"></div>
                   
                   {/* Cite Button Wrapper */}
                   <div className="relative">
                       <button
                         type="button"
                         onClick={handleCiteClick}
                         onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                         className={`flex items-center gap-1.5 px-2 py-1.5 hover:bg-white hover:text-stone-900 rounded-sm text-stone-600 transition-colors text-xs font-medium ${showCitePopover ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                         title="Insert Citation"
                       >
                          <Quote size={14} />
                          Cite
                       </button>

                       {/* Cite Popover */}
                       {showCitePopover && (
                           <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-stone-200 shadow-lg rounded-md z-[100] p-3 animate-fade-in flex flex-col gap-2" onPointerDownCapture={stopProp}>
                               <div className="flex justify-between items-center border-b border-stone-100 pb-2 mb-1">
                                  <span className="text-[10px] font-bold uppercase text-stone-400">{createRefMode ? 'New Reference' : 'Insert Citation'}</span>
                                  <button onClick={() => setShowCitePopover(false)} className="text-stone-300 hover:text-stone-600"><X size={12}/></button>
                                </div>
                               
                               {!createRefMode ? (
                                   <>
                                      <div className="max-h-40 overflow-y-auto space-y-1">
                                          {references.length === 0 && <p className="text-xs text-stone-400 italic p-2">No references yet.</p>}
                                          {references.map(ref => (
                                              <button 
                                                key={ref.id}
                                                onClick={() => insertCite(ref.id)}
                                                className="w-full text-left p-1.5 hover:bg-stone-50 rounded text-xs truncate flex items-center gap-2"
                                              >
                                                <span className="font-mono text-[9px] bg-stone-100 text-stone-500 px-1 rounded">{ref.id}</span>
                                                <span className="truncate flex-1">{ref.title}</span>
                                              </button>
                                          ))}
                                      </div>
                                      <button 
                                        onClick={() => setCreateRefMode(true)}
                                        className="w-full py-1.5 mt-1 border border-dashed border-stone-300 text-stone-500 text-xs rounded hover:bg-stone-50 hover:text-stone-800 font-medium"
                                      >
                                        + Create New
                                      </button>
                                   </>
                               ) : (
                                   <div className="space-y-2">
                                       <input 
                                         className="w-full text-xs border border-stone-200 rounded p-1.5" 
                                         placeholder="ID (e.g. who2024)"
                                         value={newRefData.id}
                                         onChange={e => setNewRefData({...newRefData, id: e.target.value})}
                                       />
                                       <input 
                                          className="w-full text-xs border border-stone-200 rounded p-1.5" 
                                          placeholder="Title"
                                          value={newRefData.title}
                                          onChange={e => setNewRefData({...newRefData, title: e.target.value})}
                                       />
                                       <input 
                                          className="w-full text-xs border border-stone-200 rounded p-1.5" 
                                          placeholder="URL (Optional)"
                                          value={newRefData.url}
                                          onChange={e => setNewRefData({...newRefData, url: e.target.value})}
                                       />
                                       <div className="grid grid-cols-2 gap-2">
                                           <input 
                                              className="w-full text-xs border border-stone-200 rounded p-1.5" 
                                              placeholder="Publisher"
                                              value={newRefData.publisher}
                                              onChange={e => setNewRefData({...newRefData, publisher: e.target.value})}
                                           />
                                           <input 
                                              className="w-full text-xs border border-stone-200 rounded p-1.5" 
                                              placeholder="Date"
                                              value={newRefData.date}
                                              onChange={e => setNewRefData({...newRefData, date: e.target.value})}
                                           />
                                       </div>
                                       <div className="flex gap-2 pt-1">
                                           <button onClick={() => setCreateRefMode(false)} className="flex-1 py-1 text-xs text-stone-400 hover:text-stone-600">Back</button>
                                           <button 
                                              onClick={handleCreateRef}
                                              disabled={!newRefData.id || !newRefData.title}
                                              className="flex-1 py-1 text-xs bg-stone-900 text-white rounded disabled:opacity-50"
                                           >
                                              Save & Insert
                                           </button>
                                       </div>
                                   </div>
                               )}
                           </div>
                       )}
                   </div>
                   
                   <div className="flex-1"></div>
                   
                   <label className="flex items-center space-x-2 cursor-pointer px-2 py-1 hover:bg-stone-200 rounded transition-colors select-none">
                     <input 
                       type="checkbox" 
                       checked={block.content.dropCap || false}
                       onChange={(e) => updateBlock(block.id, { dropCap: e.target.checked })}
                       className="accent-stone-900 cursor-pointer"
                     />
                     <span className="text-[10px] text-stone-600 font-bold uppercase tracking-wider cursor-pointer">Drop Cap</span>
                   </label>
                </div>

                <textarea
                  ref={textareaRef}
                  value={block.content.text || ''}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  className="w-full p-3 border border-stone-200 rounded-b-sm rounded-t-none font-body text-sm min-h-[120px] focus:ring-1 focus:ring-stone-400 focus:outline-none bg-stone-50/50 -mt-px relative z-10"
                  placeholder="Write your article text here..."
                />
            </div>

            {missingCitations.length > 0 && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
                    <AlertCircle size={14} />
                    <span>Missing references: {missingCitations.map(id => `[^${id}]`).join(', ')}</span>
                </div>
            )}
          </div>
        );

      case 'sidebar':
        const addGroup = () => {
          const newItems = [...(block.content.sidebarItems || [])];
          newItems.push({ heading: 'New Group', items: ['Item 1'] });
          updateBlock(block.id, { sidebarItems: newItems });
        };
        
        return (
           <div className="space-y-4" onPointerDownCapture={stopProp}>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Sidebar Content</label>
              
              {block.content.sidebarItems?.map((group, groupIdx) => (
                <div key={groupIdx} className="bg-stone-50 p-3 rounded border border-stone-200 relative">
                   <button 
                      type="button"
                      onClick={() => {
                        const newItems = block.content.sidebarItems?.filter((_, i) => i !== groupIdx);
                        updateBlock(block.id, { sidebarItems: newItems });
                      }}
                      className="absolute top-2 right-2 text-stone-400 hover:text-red-500"
                   >
                     <X size={12} />
                   </button>
                   
                   <input
                      type="text"
                      value={group.heading}
                      onChange={(e) => {
                        const newItems = [...(block.content.sidebarItems || [])];
                        newItems[groupIdx].heading = e.target.value;
                        updateBlock(block.id, { sidebarItems: newItems });
                      }}
                      className="w-full bg-transparent border-b border-stone-300 text-xs font-bold uppercase tracking-wider mb-2 focus:outline-none"
                      placeholder="Group Title"
                   />
                   
                   <textarea
                      value={group.items.join('\n')}
                      onChange={(e) => {
                        const newItems = [...(block.content.sidebarItems || [])];
                        newItems[groupIdx].items = e.target.value.split('\n');
                        updateBlock(block.id, { sidebarItems: newItems });
                      }}
                      className="w-full text-xs font-sans text-stone-600 bg-transparent focus:outline-none"
                      rows={3}
                      placeholder="List items (one per line)"
                   />
                   <p className="text-[10px] text-stone-400 mt-1">One item per line</p>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={addGroup} 
                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Group
              </button>
           </div>
        );

      case 'quote':
        return (
           <div className="space-y-3" onPointerDownCapture={stopProp}>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Quote Text</label>
              <textarea
                value={block.content.quote || ''}
                onChange={(e) => updateBlock(block.id, { quote: e.target.value })}
                className="w-full p-2 border border-stone-200 rounded-sm font-serif text-lg italic focus:ring-1 focus:ring-stone-400 focus:outline-none bg-stone-50/50"
                placeholder="Enter quote..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Author</label>
              <input
                type="text"
                value={block.content.author || ''}
                onChange={(e) => updateBlock(block.id, { author: e.target.value })}
                className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 focus:border-stone-800 focus:outline-none text-sm placeholder:text-stone-400"
                placeholder="Quote author..."
              />
            </div>
          </div>
        );

      case 'image':
        const currentPos = block.content.position || 'center';
        const currentScale = block.content.scale ?? 1.0;
        
        return (
          <div className="space-y-4" onPointerDownCapture={stopProp}>
             <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Image URL</label>
                  <input
                    type="text"
                    value={block.content.imageUrl || ''}
                    onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
                    className="w-full p-2 border border-stone-200 rounded-sm text-xs font-mono focus:ring-1 focus:ring-stone-400 focus:outline-none bg-stone-50/50"
                    placeholder="https://..."
                  />
                  
                  {/* Local Upload */}
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 mt-3">Or Upload File</label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-sm text-xs font-medium transition-colors flex items-center gap-2">
                      <Upload size={14} />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           
                           // Revoke old blob if exists
                           if (block.content.imageUrl?.startsWith('blob:')) {
                             URL.revokeObjectURL(block.content.imageUrl);
                           }

                           const objectUrl = URL.createObjectURL(file);
                           updateBlock(block.id, {
                             imageUrl: objectUrl,
                             imageFileName: file.name
                           });
                        }}
                      />
                    </label>
                    {block.content.imageFileName && <span className="text-[10px] text-stone-500 truncate max-w-[150px]">{block.content.imageFileName}</span>}
                  </div>
                </div>
                
                {/* Position & Scale Controls */}
                <div className="flex items-center gap-4 mt-1 bg-stone-50 p-2 rounded border border-stone-100">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Position</label>
                        <div className="flex bg-white rounded border border-stone-200 p-0.5">
                            {[
                                { val: 'left', icon: <AlignLeft size={14} /> },
                                { val: 'center', icon: <AlignCenter size={14} /> },
                                { val: 'right', icon: <AlignRight size={14} /> }
                            ].map((opt) => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateBlock(block.id, { position: opt.val as any });
                                    }}
                                    className={`flex-1 flex justify-center py-1.5 rounded-sm transition-all ${
                                        currentPos === opt.val ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                                    }`}
                                    title={`Align ${opt.val}`}
                                >
                                    {opt.icon}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-stone-400 mt-1 leading-tight">
                            Tip: Place next to text for side-by-side layout (Left/Right only)
                        </p>
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Scale</label>
                             <span className="text-[10px] font-mono text-stone-500">{Math.round(currentScale * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="1.8" 
                            step="0.05"
                            value={currentScale}
                            onPointerDownCapture={stopProp}
                            onChange={(e) => updateBlock(block.id, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-stone-900 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

             </div>
             
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Caption</label>
              <input
                type="text"
                value={block.content.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                className="w-full p-2 border-b border-stone-200 bg-white text-stone-900 focus:border-stone-800 focus:outline-none text-sm placeholder:text-stone-400"
                placeholder="Image caption..."
              />
            </div>
          </div>
        );

      case 'divider':
         return (
             <div className="space-y-4" onPointerDownCapture={stopProp}>
                <div>
                   <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Style</label>
                   <div className="flex gap-2">
                      {['thin', 'bold', 'dashed'].map((s) => (
                          <button
                             key={s}
                             type="button"
                             onClick={(e) => { e.stopPropagation(); updateBlock(block.id, { dividerStyle: s as any }); }}
                             className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                                (block.content.dividerStyle || 'thin') === s 
                                ? 'bg-stone-800 text-white border-stone-800' 
                                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                             }`}
                          >
                             {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                      ))}
                   </div>
                </div>
                 <div>
                   <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Width</label>
                   <div className="flex gap-2">
                      {['content', 'full'].map((w) => (
                          <button
                             key={w}
                             type="button"
                             onClick={(e) => { e.stopPropagation(); updateBlock(block.id, { dividerWidth: w as any }); }}
                             className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                                (block.content.dividerWidth || 'content') === w 
                                ? 'bg-stone-800 text-white border-stone-800' 
                                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                             }`}
                          >
                             {w.charAt(0).toUpperCase() + w.slice(1)}
                          </button>
                      ))}
                   </div>
                </div>
                
                {/* Visual Preview in Editor */}
                <div className="mt-4 p-4 bg-stone-50 rounded border border-stone-100 flex justify-center">
                   <div className={`
                     w-full 
                     ${(block.content.dividerStyle || 'thin') === 'thin' ? 'h-px bg-stone-300' : ''}
                     ${block.content.dividerStyle === 'bold' ? 'h-[2px] bg-stone-800' : ''}
                     ${block.content.dividerStyle === 'dashed' ? 'border-t border-dashed border-stone-300' : ''}
                     ${(block.content.dividerWidth || 'content') === 'content' ? 'max-w-[50%]' : 'w-full'}
                   `}></div>
                </div>
             </div>
         );
      
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={(e) => {
        // Prevent selection when typing in an input
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
           onSelect(block.id);
        }
      }}
      className={`bg-white border shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-md p-5 transition-all relative group
        ${isSelected ? 'border-stone-900 ring-1 ring-stone-900 z-10' : 'border-stone-200 hover:border-stone-300'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle & Type Icon */}
        <div className="mt-1 flex flex-col items-center gap-3">
          {/* Drag Handle */}
          <button 
            type="button"
            className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-600 p-2 touch-none rounded hover:bg-stone-100 transition-colors"
            {...dragHandleProps}
            title="Drag to reorder"
            // Important: Stop propagation on pointer down to prevent parent sensors from capturing if mixed
            onPointerDown={(e) => dragHandleProps?.onPointerDown && dragHandleProps.onPointerDown(e)}
          >
            <GripVertical size={16} />
          </button>

          <div className="p-2 bg-stone-50 rounded-md text-stone-400 border border-stone-100">
            {block.type === 'title' && <Heading size={18} />}
            {block.type === 'text' && <Type size={18} />}
            {block.type === 'image' && <ImageIcon size={18} />}
            {block.type === 'quote' && <MessageSquare size={18} />}
            {block.type === 'sidebar' && <List size={18} />}
            {block.type === 'divider' && <Minus size={18} />}
          </div>
          
          {/* Arrow Controls */}
          <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveBlock(block.id, 'up');
              }}
              onPointerDownCapture={(e) => e.stopPropagation()}
              disabled={isFirst} 
              className="p-1.5 hover:text-blue-600 disabled:opacity-0 disabled:cursor-not-allowed hover:bg-blue-50 rounded"
              title="Move Up"
            >
              <ArrowUp size={14} />
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveBlock(block.id, 'down');
              }} 
              onPointerDownCapture={(e) => e.stopPropagation()}
              disabled={isLast} 
              className="p-1.5 hover:text-blue-600 disabled:opacity-0 disabled:cursor-not-allowed hover:bg-blue-50 rounded"
              title="Move Down"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>

        {/* Editor Inputs */}
        <div className="flex-1">
          {renderInputs()}
        </div>
      </div>

      {/* Delete Button - Hardened */}
      <button 
        type="button"
        onPointerDownCapture={(e) => {
          // Critical: Stop DnD sensors from seeing this pointer down
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
           e.preventDefault();
           e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("TRASH_CLICK", block.id); // Debug Log
          removeBlock(block.id);
        }}
        className="absolute top-2 right-2 z-[9999] pointer-events-auto cursor-pointer text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
        title="Delete Block"
        aria-label="Delete block"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const SortableBlockItem: React.FC<any> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: props.isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BlockEditor {...props} dragHandleProps={listeners} />
    </div>
  );
};

export const AdminBuilder: React.FC<AdminBuilderProps> = ({ 
  blocks, setBlocks, tags, setTags, references, setReferences, settings, setSettings 
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);

  // Publish State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // Requires 5px movement to start drag, allowing clicks to pass through
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const updateBlock = (id: string, updates: Partial<ArticleBlock['content']>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, ...updates } } : b));
  };

  const removeBlock = (id: string) => {
    console.log("REMOVE_BLOCK", id);
    setBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setSelectedId(prev => (prev === id ? null : prev));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
      setBlocks(prev => {
          const index = prev.findIndex(b => b.id === id);
          if (index === -1) return prev;
          if (direction === 'up' && index === 0) return prev;
          if (direction === 'down' && index === prev.length - 1) return prev;
          
          const newBlocks = [...prev];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          
          [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
          return newBlocks;
      });
  };

  const createNewBlock = (type: BlockType): ArticleBlock => {
      // Use blockFactory logic inline if import issues, but provided blockFactory is fine.
      // Re-implementing simplified here to ensure self-contained change if factory import is tricky in this context
      // actually user provided src/lib/blockFactory.ts content, but let's stick to consistent logic
      
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      let content: ArticleBlock['content'] = {};

      switch (type) {
        case 'title':
            content = { title: 'New Headline', subtitle: 'SUBTITLE' };
            break;
        case 'text':
            content = { text: '', layout: 'two_thirds' };
            break;
        case 'image':
            content = { imageUrl: '', layout: 'full', position: 'center', scale: 1.0 };
            break;
        case 'quote':
            content = { quote: 'Quote text here...', author: 'Author Name' };
            break;
        case 'sidebar':
            content = { sidebarItems: [{ heading: 'SECTION', items: ['Item 1'] }] };
            break;
        case 'divider':
            content = { dividerStyle: 'thin', dividerWidth: 'content' };
            break;
      }

      return { id, type, content };
  };
  
  const addBlock = (type: BlockType) => {
      const newBlock = createNewBlock(type);
      setBlocks(prev => [...prev, newBlock]);
      setSelectedId(newBlock.id);
      
      setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
  };

  const insertBlockAfter = (afterId: string | null, type: BlockType) => {
      const newBlock = createNewBlock(type);
      setBlocks(prev => {
          const next = [...prev];
          if (!afterId) {
            // Insert at start
            return [newBlock, ...next];
          }
          const idx = next.findIndex(b => b.id === afterId);
          if (idx === -1) {
            // Fallback: append
            return [...next, newBlock];
          }
          // Splice insert
          next.splice(idx + 1, 0, newBlock);
          return next;
      });
      setSelectedId(newBlock.id);
      setInsertAfterId(null);
  };

  const handleAddReference = (ref: Reference) => {
    setReferences(prev => [...prev, ref]);
  };
  
  const handlePublish = async () => {
    setIsPublishing(true);
    console.log('[PUBLISH] requested');
    // Mock network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsPublishing(false);
    setShowPublishModal(false);
    setPublishMessage("Demande de publication enregistrée (à venir).");
    setTimeout(() => setPublishMessage(null), 3000);
  };

  return (
    <div className="max-w-[800px] mx-auto pb-32 pt-10">
        
        <TagsEditor tags={tags} onChange={setTags} />
        
        <HeaderFooterEditor settings={settings} onChange={setSettings} />
        
        <ReferencesEditor references={references} onChange={setReferences} />

        {/* Sticky Toolbar */}
        <div className="sticky top-20 z-50 mb-8 flex justify-center">
            <AddBlockPill onAdd={(type) => insertBlockAfter(null, type)} showLabel />
        </div>

        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4">
                    {blocks.map((block, index) => (
                        <React.Fragment key={block.id}>
                            <SortableBlockItem 
                                block={block}
                                updateBlock={updateBlock}
                                removeBlock={removeBlock}
                                moveBlock={moveBlock}
                                isFirst={index === 0}
                                isLast={index === blocks.length - 1}
                                isSelected={selectedId === block.id}
                                onSelect={setSelectedId}
                                references={references}
                                onAddReference={handleAddReference}
                            />

                            {/* Insert After Each Block Control */}
                            <div className="flex justify-center -mt-1 mb-6">
                                {insertAfterId === block.id ? (
                                    <div 
                                        className="relative animate-fade-in"
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    >
                                        <AddBlockPill 
                                            showLabel={false}
                                            onAdd={(type) => insertBlockAfter(block.id, type)}
                                        />
                                        <button
                                            type="button"
                                            className="absolute -top-2 -right-2 bg-white border border-stone-200 shadow-sm rounded-full p-1 text-stone-400 hover:text-stone-900 z-50"
                                            title="Close"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setInsertAfterId(null);
                                            }}
                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button"
                                        className="w-10 h-10 rounded-full border border-stone-200 bg-white/80 hover:bg-white shadow-sm flex items-center justify-center text-stone-300 hover:text-stone-900 transition-colors"
                                        title="Insert block here"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setInsertAfterId(block.id);
                                        }}
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    >
                                        <Plus size={18} />
                                    </button>
                                )}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
        
        {blocks.length === 0 && (
            <div className="text-center py-20 text-stone-400">
                <p>No content blocks yet.</p>
                <p className="text-sm mt-2">Add one from the toolbar above.</p>
            </div>
        )}
        
        {/* Publish Action Area */}
        <div className="mt-12 pt-6 border-t border-stone-200 flex flex-col items-end gap-2">
            <button
                onClick={() => setShowPublishModal(true)}
                className="bg-stone-900 text-white px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-stone-700 transition-colors shadow-sm"
            >
                Publier
            </button>
            {publishMessage && (
                <span className="text-xs text-green-600 font-medium animate-fade-in">
                   {publishMessage}
                </span>
            )}
        </div>
        
        {/* Publish Confirmation Modal */}
        {showPublishModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div 
                  className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                  onClick={() => !isPublishing && setShowPublishModal(false)}
                ></div>
                
                {/* Modal Panel */}
                <div className="relative bg-white p-6 rounded-md shadow-2xl max-w-sm w-full border border-stone-100 animate-fade-in-up">
                  <h3 className="font-serif text-xl text-stone-900 mb-2">Publier l’article ?</h3>
                  <p className="font-sans text-sm text-stone-600 mb-6 leading-relaxed">
                    Cette action publiera l’article sur le site (intégration à venir).
                  </p>
                  
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setShowPublishModal(false)}
                      disabled={isPublishing}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-70"
                    >
                      {isPublishing && <Loader2 size={12} className="animate-spin" />}
                      Publier
                    </button>
                  </div>
                </div>
            </div>
        )}
    </div>
  );
};

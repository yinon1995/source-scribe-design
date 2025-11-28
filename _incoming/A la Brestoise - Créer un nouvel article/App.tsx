import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_BLOCKS } from './constants';
import { ArticleBlock, Reference, ArticleSettings } from './types';
import { AdminBuilder } from './components/AdminBuilder';
import { PreviewLayoutEditor } from './src/preview/PreviewLayoutEditor';
import { Eye, Edit3, Save, Layers, Loader2 } from 'lucide-react';

const DEFAULT_SETTINGS: ArticleSettings = {
  headerEnabled: true,
  headerText: 'Lumière Magazine',
  footerEnabled: true,
  footerText: 'Spring 2024 Collection',
  publishedAt: new Date().toISOString().split('T')[0],
  readingTimeMode: 'auto',
  readingTimeMinutes: 5
};

const App: React.FC = () => {
  // Use hydration ref to prevent strict-mode double invocation and state overwrite loops
  const hydratedRef = useRef(false);
  const [blocks, setBlocks] = useState<ArticleBlock[]>(INITIAL_BLOCKS);
  const [tags, setTags] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [settings, setSettings] = useState<ArticleSettings>(DEFAULT_SETTINGS);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Hydration Effect (Runs ONCE)
  useEffect(() => {
    if (hydratedRef.current) return;
    
    try {
        const savedBlocks = localStorage.getItem('lumiere_blocks');
        if (savedBlocks) {
            const parsed = JSON.parse(savedBlocks);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("HYDRATED_FROM_STORAGE", parsed.length);
                setBlocks(parsed);
            }
        }

        const savedTags = localStorage.getItem('lumiere_tags');
        if (savedTags) {
          const parsedTags = JSON.parse(savedTags);
          if (Array.isArray(parsedTags)) {
            setTags(parsedTags);
          }
        }

        const savedRefs = localStorage.getItem('lumiere_references');
        if (savedRefs) {
          const parsedRefs = JSON.parse(savedRefs);
          if (Array.isArray(parsedRefs)) {
            setReferences(parsedRefs);
          }
        }

        const savedSettings = localStorage.getItem('lumiere_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings) {
            // Merge with defaults to ensure all keys exist
            setSettings(prev => ({ ...DEFAULT_SETTINGS, ...parsedSettings }));
          }
        }
    } catch(e) {
        console.error("Hydration failed", e);
    }
    
    hydratedRef.current = true;
  }, []);

  // Persistence Effect (Write-only, avoids read-write loops)
  useEffect(() => {
      if (!hydratedRef.current) return;
      localStorage.setItem('lumiere_blocks', JSON.stringify(blocks));
      localStorage.setItem('lumiere_tags', JSON.stringify(tags));
      localStorage.setItem('lumiere_references', JSON.stringify(references));
      localStorage.setItem('lumiere_settings', JSON.stringify(settings));
  }, [blocks, tags, references, settings]);

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // 1. Open a new window for printing
      const printWindow = window.open('', '_blank', 'width=1000,height=1200');
      if (!printWindow) {
        alert("Please allow popups to export PDF.");
        setIsExporting(false);
        return;
      }

      // 2. Gather Styles
      // We explicitly look for the Tailwind Config script and Styles from the current document
      const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(node => node.outerHTML)
        .join('\n');
      
      // Try to find the tailwind config script specifically
      const tailwindConfigScript = Array.from(document.querySelectorAll('script'))
        .find(s => s.textContent?.includes('tailwind.config'))?.outerHTML || '';

      // 3. Write HTML Shell
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${settings.headerText || 'Article Export'}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            ${tailwindConfigScript}
            ${styleSheets}
            <style>
              @media print {
                @page { margin: 12mm; }
                body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none !important; }

                /* Hide the in-paper web footer on print */
                .web-footer-mark { display: none !important; }
                
                /* Show and position the print footer to repeat on every page */
                .print-footer-mark {
                    display: block !important;
                    position: fixed !important;
                    bottom: 10mm !important;
                    right: 10mm !important;
                    font-size: 10pt !important;
                    color: rgba(120, 113, 108, 0.7) !important; /* stone-500/70 equivalent */
                    font-family: sans-serif !important;
                    z-index: 9999 !important;
                }
              }
              body { background: white; min-height: 100vh; }
            </style>
          </head>
          <body>
            <div id="print-root"></div>
          </body>
        </html>
      `);
      printWindow.document.close();

      // 4. Render ArticleRenderer into the new window
      // Give the browser a moment to parse the written HTML
      await new Promise(resolve => setTimeout(resolve, 100));

      const printRootEl = printWindow.document.getElementById('print-root');
      if (printRootEl) {
        const root = createRoot(printRootEl);
        root.render(
            <PreviewLayoutEditor
                articleId="export"
                blocks={blocks}
                readOnly={true}
                onUpdateBlock={() => {}}
                settings={settings}
            />
        );
      }

      // 5. Wait for Assets (Images & Fonts)
      const waitForAssets = async () => {
        // Wait a beat for React to mount
        await new Promise(r => setTimeout(r, 500));

        // Check fonts
        if (printWindow.document.fonts && printWindow.document.fonts.ready) {
           await printWindow.document.fonts.ready;
        }

        // Check images
        const images = Array.from(printWindow.document.images);
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // Don't block on error
            });
        }));
        
        // Final safety buffer for layout
        await new Promise(r => setTimeout(r, 500));
      };

      await waitForAssets();

      // 6. Trigger Print
      printWindow.focus();
      printWindow.print();
      
      // 7. Cleanup (Optional: close window after print? User might want to keep it open)
      // printWindow.close(); 
      
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const updateBlock = (id: string, updates: Partial<ArticleBlock['content']>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, ...updates } } : b));
  };

  return (
    <div className="min-h-screen bg-[#e8e6e1] text-stone-900 font-sans selection:bg-stone-300 selection:text-stone-900 overflow-y-scroll">
      
      {/* Navigation / Control Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#e8e6e1]/80 backdrop-blur-md border-b border-stone-300/50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif font-bold text-xl tracking-tight text-stone-900">À la Brestoise</span>
          </div>

          <div className="flex items-center bg-stone-200/50 p-1 rounded-full border border-stone-300/50">
             <button
                onClick={() => setIsAdmin(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                  isAdmin 
                    ? 'bg-stone-900 text-white shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
             >
                <Edit3 size={12} />
                <span>Builder</span>
             </button>
             <button
                onClick={() => setIsAdmin(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                  !isAdmin 
                    ? 'bg-stone-900 text-white shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
             >
                <Eye size={12} />
                <span>Preview</span>
             </button>
          </div>

          <button 
            onClick={handleExportPdf}
            disabled={isExporting}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-colors ${
                isExporting ? 'text-stone-400 cursor-wait' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 pt-20 pb-20 px-4 min-h-screen">
        {isAdmin ? (
          <div className="animate-fade-in">
            <AdminBuilder 
              blocks={blocks} 
              setBlocks={setBlocks} 
              tags={tags} 
              setTags={setTags} 
              references={references}
              setReferences={setReferences}
              settings={settings}
              setSettings={setSettings}
            />
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col justify-center items-center pt-4 md:pt-12">
             <PreviewLayoutEditor 
                articleId="default"
                blocks={blocks}
                onUpdateBlock={updateBlock}
                settings={settings}
             />
          </div>
        )}
      </main>

    </div>
  );
};

export default App;
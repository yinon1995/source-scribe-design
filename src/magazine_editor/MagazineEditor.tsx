import React, { useState, useEffect, useRef } from 'react';
import { ArticleBlock, Reference, ArticleSettings } from './types';
import { AdminBuilder } from './components/AdminBuilder';
import { PreviewLayoutEditor } from './preview/PreviewLayoutEditor';
import { Eye, Edit3, ArrowLeft, Loader2, Save } from 'lucide-react';

const DEFAULT_SETTINGS: ArticleSettings = {
    headerEnabled: true,
    headerText: 'À la Brestoise',
    footerEnabled: true,
    footerText: '',
    publishedAt: new Date().toISOString().split('T')[0],
    readingTimeMode: 'auto',
    readingTimeMinutes: 5,
    // Metadata defaults
    featured: false,
    date: new Date().toISOString().split('T')[0],
    readingMinutes: null
};

interface MagazineEditorProps {
    initialData?: {
        blocks?: ArticleBlock[];
        tags?: string[];
        references?: Reference[];
        settings?: Partial<ArticleSettings>;
    };
    onPublish?: (payload: {
        blocks: ArticleBlock[];
        tags: string[];
        references: Reference[];
        settings: ArticleSettings;
    }) => Promise<void> | void;
    onSaveDraft?: (payload: {
        blocks: ArticleBlock[];
        tags: string[];
        references: Reference[];
        settings: ArticleSettings;
    }) => Promise<void> | void;
    onBack?: () => void;
}

export default function MagazineEditor({ initialData, onPublish, onSaveDraft, onBack }: MagazineEditorProps) {
    const hydratedRef = useRef(false);
    const [blocks, setBlocks] = useState<ArticleBlock[]>(initialData?.blocks || []);
    const [tags, setTags] = useState<string[]>(initialData?.tags || []);
    const [references, setReferences] = useState<Reference[]>(initialData?.references || []);
    const [settings, setSettings] = useState<ArticleSettings>({ ...DEFAULT_SETTINGS, ...initialData?.settings });
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isChildBusy, setIsChildBusy] = useState(false);

    // Hydration Effect (Runs ONCE)
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;
    }, []);

    const updateBlock = (id: string, updates: Partial<ArticleBlock['content']>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, ...updates } } : b));
    };

    const hasBlobUrls = (blocks: ArticleBlock[]) => {
        return blocks.some(b => b.type === 'image' && b.content.imageUrl?.startsWith('blob:'));
    };

    const handleRequestPublish = () => {
        if (isChildBusy) {
            alert("Veuillez attendre la fin des téléchargements d'images.");
            return;
        }
        if (hasBlobUrls(blocks)) {
            alert("Erreur: Une image est en cours de traitement ou invalide (blob URL détectée). Veuillez réuploader l'image.");
            return;
        }
        setShowPublishModal(true);
    };

    const handleConfirmPublish = async () => {
        if (!onPublish) return;

        setIsPublishing(true);
        try {
            await onPublish({ blocks, tags, references, settings });
            setShowPublishModal(false);
        } catch (error) {
            console.error("Publish failed", error);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSaveDraftClick = async () => {
        if (!onSaveDraft) return;
        if (isChildBusy) {
            alert("Veuillez attendre la fin des téléchargements d'images.");
            return;
        }
        if (hasBlobUrls(blocks)) {
            alert("Erreur: Une image est en cours de traitement ou invalide (blob URL détectée). Veuillez réuploader l'image.");
            return;
        }
        setIsSavingDraft(true);
        try {
            await onSaveDraft({ blocks, tags, references, settings });
        } catch (error) {
            console.error("Draft save failed", error);
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleReorderBlocks = (fromIndex: number, toIndex: number) => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            const [moved] = newBlocks.splice(fromIndex, 1);
            newBlocks.splice(toIndex, 0, moved);
            return newBlocks;
        });
    };

    return (
        <div className="min-h-screen bg-[#e8e6e1] text-stone-900 font-sans selection:bg-stone-300 selection:text-stone-900">

            {/* Navigation / Control Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#e8e6e1]/80 backdrop-blur-md border-b border-stone-300/50">
                <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors border border-stone-300 rounded hover:bg-stone-100"
                            >
                                <ArrowLeft size={14} />
                                <span>Retour au tableau de bord</span>
                            </button>
                        )}
                        <span className="font-serif font-bold text-xl tracking-tight text-stone-900">À la Brestoise</span>
                    </div>

                    <div className="flex items-center bg-stone-200/50 p-1 rounded-full border border-stone-300/50">
                        <button
                            onClick={() => setIsPreviewMode(false)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${!isPreviewMode
                                ? 'bg-stone-900 text-white shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            <Edit3 size={12} />
                            <span>Builder</span>
                        </button>
                        <button
                            onClick={() => setIsPreviewMode(true)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${isPreviewMode
                                ? 'bg-stone-900 text-white shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            <Eye size={12} />
                            <span>Preview</span>
                        </button>
                    </div>

                    {onPublish && (
                        <button
                            onClick={handleRequestPublish}
                            disabled={isChildBusy}
                            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors ${isChildBusy ? 'bg-stone-400 cursor-not-allowed text-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                        >
                            {isChildBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                            Publish
                        </button>
                    )}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="relative z-10 pt-20 pb-20 px-4 min-h-screen">
                {!isPreviewMode ? (
                    <div className="animate-fade-in">
                        <AdminBuilder
                            blocks={blocks}
                            setBlocks={setBlocks}
                            onReorderBlocks={handleReorderBlocks}
                            onUpdateBlock={updateBlock}
                            tags={tags}
                            setTags={setTags}
                            references={references}
                            setReferences={setReferences}
                            settings={settings}
                            setSettings={setSettings}
                            onRequestPublish={handleRequestPublish}
                            onBusy={setIsChildBusy}
                        />

                        {/* Draft Button at the bottom */}
                        {onSaveDraft && (
                            <div className="max-w-[1000px] mx-auto mt-12 mb-20 flex justify-center">
                                <button
                                    onClick={handleSaveDraftClick}
                                    disabled={isSavingDraft || isChildBusy}
                                    className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-300 text-stone-600 rounded-full shadow-sm hover:bg-stone-50 hover:text-stone-900 hover:border-stone-400 transition-all disabled:opacity-50"
                                >
                                    {isSavingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span className="font-bold uppercase tracking-wider text-xs">Enregistrer comme brouillon</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in flex flex-col justify-center items-center pt-4 md:pt-12">
                        <div
                            data-preview-marker="true"
                            style={{
                                position: "sticky",
                                top: 60,
                                zIndex: 99999,
                                background: "#00d1ff",
                                color: "#00131a",
                                padding: "10px 12px",
                                fontWeight: 900,
                                textAlign: "center",
                                borderBottom: "2px solid rgba(0,0,0,0.15)",
                                marginBottom: "20px",
                                borderRadius: "4px"
                            }}
                        >
                            PREVIEW LAYOUT MODE ON
                        </div>
                        <PreviewLayoutEditor
                            articleId="default"
                            blocks={blocks}
                            onUpdateBlock={updateBlock}
                            onReorderBlocks={handleReorderBlocks}
                            settings={settings}
                            references={references}
                        />
                    </div>
                )}
            </main>

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
                                onClick={handleConfirmPublish}
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

            {/* Debug: Block Order Hash */}
            <div className="fixed bottom-1 right-1 bg-black/50 text-white text-[9px] font-mono px-1 rounded z-[9999] pointer-events-none">
                Order: {blocks.map(b => b.id.slice(0, 3)).join('-')}
            </div>

        </div>
    );
}

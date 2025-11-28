// Admin editor page - Magazine Editor Integration
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAdminToken } from "@/lib/adminSession";
import { getPostBySlug } from "@/lib/content";
import { toast } from "sonner";
import MagazineEditor from "@/magazine_editor/MagazineEditor";
import type { ArticleBlock, Reference, ArticleSettings } from "@/magazine_editor/types";

const AdminNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get("slug");
  const isEditing = !!editSlug;

  const [initialData, setInitialData] = useState<{
    blocks: ArticleBlock[];
    tags: string[];
    references: Reference[];
    settings: Partial<ArticleSettings>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Check auth and load existing article if editing
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session administrateur expirée");
      navigate("/admin");
      return;
    }

    if (isEditing && editSlug) {
      try {
        const existing = getPostBySlug(editSlug);
        if (existing) {
          // Try to rehydrate editor state from body comment
          let loadedBlocks: ArticleBlock[] = [];
          let loadedReferences: Reference[] = [];
          let loadedSettings: Partial<ArticleSettings> | undefined;

          const stateMatch = existing.body.match(/^<!-- MAGAZINE_EDITOR_STATE: (.*?) -->/);
          if (stateMatch) {
            try {
              const state = JSON.parse(stateMatch[1]);
              if (Array.isArray(state.blocks)) loadedBlocks = state.blocks;
              if (Array.isArray(state.references)) loadedReferences = state.references;
              if (state.settings) loadedSettings = state.settings;
            } catch (e) {
              console.error("Failed to parse editor state", e);
            }
          }

          setInitialData({
            blocks: loadedBlocks,
            tags: Array.isArray(existing.tags) ? existing.tags : [],
            references: loadedReferences,
            settings: {
              ...(loadedSettings || {
                headerEnabled: true,
                headerText: 'À la Brestoise',
                footerEnabled: false,
                footerText: ''
              }),
              // Always override metadata with current frontmatter to ensure consistency
              featured: (existing as any).featured || false,
              date: existing.date ? new Date(existing.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              readingMinutes: existing.readingMinutes || null,
              category: (existing.category as any) || "Commerces & lieux",
            }
          });
          toast.info("Article chargé - utilisez le nouvel éditeur pour le modifier");
        } else {
          toast.warning(`Article "${editSlug}" introuvable`);
          setInitialData({
            blocks: [],
            tags: [],
            references: [],
            settings: {}
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'article:", error);
        toast.error("Impossible de charger l'article");
      }
    } else {
      // New article
      setInitialData({
        blocks: [],
        tags: [],
        references: [],
        settings: {
          headerEnabled: true,
          headerText: 'À la Brestoise',
          footerEnabled: false,
          // Metadata defaults for new article
          featured: false,
          date: new Date().toISOString().split('T')[0],
          readingMinutes: null,
          category: "Commerces & lieux",
        }
      });
    }

    setLoading(false);
  }, [editSlug, isEditing, navigate]);

  const handlePublish = async (payload: {
    blocks: ArticleBlock[];
    tags: string[];
    references: Reference[];
    settings: ArticleSettings;
  }) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session administrateur expirée — veuillez vous reconnecter.");
      navigate("/admin");
      return;
    }

    try {
      // Convert magazine editor format to site's JsonArticle format
      // Extract title from first title block
      const titleBlock = payload.blocks.find(b => b.type === 'title');
      const title = titleBlock?.content.title || 'Untitled';
      const subtitle = titleBlock?.content.subtitle || '';

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // Compile blocks to markdown body
      let body = compileBlocksToMarkdown(payload.blocks);

      // Embed editor state for rehydration
      const editorState = {
        blocks: payload.blocks,
        references: payload.references,
        settings: payload.settings
      };
      // Prepend hidden comment
      body = `<!-- MAGAZINE_EDITOR_STATE: ${JSON.stringify(editorState)} -->\n\n${body}`;

      // Use metadata reading time if provided, otherwise estimate from body
      let readingMinutes = payload.settings.readingMinutes;
      if (!readingMinutes) {
        const words = body
          .replace(/[`*_#>!\[\]\(\)`~\-]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .split(" ")
          .filter(Boolean).length;
        readingMinutes = Math.max(1, Math.round(words / 200));
      }

      const articlePayload = {
        title,
        slug,
        category: payload.settings.category || "Commerces & lieux",
        tags: payload.tags,
        body,
        author: "À la Brestoise",
        date: payload.settings.date || new Date().toISOString().split('T')[0],
        readingMinutes,
        // Metadata
        featured: payload.settings.featured || false,
        // Optional fields
        excerpt: subtitle,
        sources: payload.references.map(r => `${r.title} — ${r.publisher || ''}`).filter(Boolean),
        // SEO
        seoTitle: payload.settings.seo?.metaTitle,
        seoDescription: payload.settings.seo?.metaDescription,
        canonicalUrl: payload.settings.seo?.canonical,
        searchAliases: payload.settings.seo?.focusKeywords, // stored as array
        allowIndexing: payload.settings.seo?.allowIndexing,
      };

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(articlePayload),
      });

      let responseBody: any;
      try {
        responseBody = await res.json();
      } catch {
        try {
          responseBody = { error: await res.text() };
        } catch {
          responseBody = {};
        }
      }

      if (res.status === 401) {
        toast.error("Accès refusé — mot de passe administrateur invalide.");
        return;
      }

      if (!res.ok || !responseBody?.success) {
        let message = responseBody?.error || "Publication impossible";

        // Add detailed error information
        const details: string[] = [];
        details.push(`HTTP ${res.status}`);

        if (responseBody?.fieldErrors) {
          const fieldErr = Object.entries(responseBody.fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join("; ");
          details.push(fieldErr);
        } else if (responseBody?.details?.message) {
          details.push(responseBody.details.message);
        }

        if (details.length > 0) {
          message += `\n${details.join(" — ")}`;
        }

        toast.error(message);
        console.error("[admin] Publication échouée", res.status, responseBody);
        return;
      }

      toast.success("Article publié avec succès !");
      setTimeout(() => navigate("/articles"), 2000);
    } catch (error: any) {
      toast.error("Erreur réseau — réessayez.");
      console.error("[admin] Erreur réseau publication", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8e6e1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {initialData && (
        <MagazineEditor
          initialData={initialData}
          onPublish={handlePublish}
          onBack={() => navigate("/admin")}
        />
      )}
    </div>
  );
};

// Helper function to compile blocks to markdown
function compileBlocksToMarkdown(blocks: ArticleBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'title':
        return `# ${block.content.title || ''}\n${block.content.subtitle ? `*${block.content.subtitle}*\n` : ''}`;

      case 'text':
        let text = '';
        if (block.content.heading) {
          text += `## ${block.content.heading}\n\n`;
        }
        text += block.content.text || '';
        return text;

      case 'image':
        const caption = block.content.caption ? `\n*${block.content.caption}*` : '';
        return `![${block.content.caption || ''}](${block.content.imageUrl || ''})${caption}`;

      case 'quote':
        return `> "${block.content.quote || ''}"\n>\n> — ${block.content.author || ''}`;

      case 'sidebar':
        const items = block.content.sidebarItems || [];
        return items.map(group => {
          return `### ${group.heading}\n` + group.items.map(item => `- ${item}`).join('\n');
        }).join('\n\n');

      case 'divider':
        return '---';

      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

export default AdminNew;

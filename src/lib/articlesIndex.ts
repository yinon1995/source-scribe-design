import { postsIndex } from "@/lib/content";
import { site } from "@/lib/siteContent";

export type AdminArticleListItem = {
	title: string;
	excerpt: string;
	image: string;
	category: string;
	readTime: string;
	slug: string;
	tags?: string[];
	date: string;
};

function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

function labelForTag(tag?: string): string {
	const n = normalize(tag || "");
	if (n.includes("science")) return site.categories.beaute;
	if (n.includes("nouveau") || n.includes("commerce") || n.includes("lieu")) return site.categories.commercesEtLieux;
	if (n.includes("experience") || n.includes("lieu")) return site.categories.experience;
	if (n.includes("beaute")) return site.categories.beaute;
	return site.categories.beaute;
}

// Returns the same list that powers the public /articles grid,
// ensuring admin sees exactly the same article set.
export function getAllArticlesForAdmin(): AdminArticleListItem[] {
	// Debug: inspect postsIndex when building admin/public article list
	if (typeof window !== "undefined") {
		// eslint-disable-next-line no-console
		console.log("[articlesIndex] postsIndex length & slugs", {
			length: postsIndex.length,
			slugs: postsIndex.map((p) => p.slug),
		});
	}
	return postsIndex.map((p) => ({
		title: p.title,
		excerpt: p.summary,
		image: p.heroImage ?? "/placeholder.svg",
		category: p.category || labelForTag(p.tags && p.tags.length > 0 ? p.tags[0] : undefined),
		readTime: `${p.readingMinutes ?? 5} min`,
		slug: p.slug,
		tags: p.tags,
		date: p.date,
	}));
}



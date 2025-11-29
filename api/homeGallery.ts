import type { VercelRequest, VercelResponse } from "@vercel/node";
import { promises as fs } from "fs";
import path from "path";

type GalleryItem = {
    id: string;
    src: string;
    alt?: string;
    description?: string;
};

type GalleryConfig = {
    title: string;
    items: GalleryItem[];
    homeHeroImages?: string[];
};

const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUBLISH_BRANCH = process.env.PUBLISH_BRANCH?.trim() || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
const GALLERY_PATH = "content/home/gallery.json";
const MAX_ITEMS = 15;

export const config = { runtime: "nodejs" };

function respond(res: VercelResponse, status: number, body: any) {
    if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
        // Prevent caching so admin/home always get fresh data
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    }
    res.status(status).send(JSON.stringify(body));
}

async function githubGet(repo: string, token: string, branch: string, filePath: string) {
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, {
        headers: { Accept: "application/vnd.github+json", Authorization: `token ${token}` },
    });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
    return res.json();
}

async function githubPut(repo: string, token: string, branch: string, filePath: string, content: string, message: string) {
    let sha: string | undefined;
    try {
        const existing = await githubGet(repo, token, branch, filePath);
        if (existing?.sha) sha = existing.sha;
    } catch (e) {
        // Ignore error if file doesn't exist, we'll create it
    }

    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const res = await fetch(url, {
        method: "PUT",
        headers: { Accept: "application/vnd.github+json", Authorization: `token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            content: Buffer.from(content).toString("base64"),
            branch,
            sha,
            committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" },
        }),
    });
    if (!res.ok) throw new Error(`GitHub PUT ${res.status}`);
    return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // GET - Public, no auth required
        if (req.method === "GET") {
            // Try to read from GitHub first (source of truth)
            if (GITHUB_REPO && GITHUB_TOKEN) {
                try {
                    const existing = await githubGet(GITHUB_REPO, GITHUB_TOKEN, PUBLISH_BRANCH, GALLERY_PATH);
                    if (existing?.content) {
                        const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
                        respond(res, 200, { success: true, data: JSON.parse(decoded) });
                        return;
                    }
                } catch (error) {
                    console.error("GitHub read failed, falling back to empty/fs", error);
                }
            }

            // Fallback to local FS or empty
            try {
                const content = await fs.readFile(path.resolve(process.cwd(), GALLERY_PATH), "utf-8");
                respond(res, 200, { success: true, data: JSON.parse(content), source: "fs" });
            } catch {
                respond(res, 200, { success: true, data: { title: "Galerie", items: [] }, source: "empty" });
            }
            return;
        }

        // PUT - Admin only
        if (req.method === "PUT") {
            const authHeader = req.headers?.authorization || "";
            const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

            if (!PUBLISH_TOKEN || token !== PUBLISH_TOKEN) {
                respond(res, 401, { success: false, error: "Unauthorized" });
                return;
            }

            let payload: any = req.body;
            if (typeof payload === "string") payload = JSON.parse(payload);

            const title = payload?.title || "Galerie";
            const items = Array.isArray(payload?.items) ? payload.items : [];
            const homeHeroImages = Array.isArray(payload?.homeHeroImages)
                ? payload.homeHeroImages.filter((img: any) => typeof img === "string")
                : [];

            if (items.length > MAX_ITEMS) {
                respond(res, 422, { success: false, error: `Maximum ${MAX_ITEMS} images` });
                return;
            }

            // Validate items
            const validatedItems: GalleryItem[] = [];
            for (const item of items) {
                if (!item?.src) continue;
                validatedItems.push({
                    id: item.id || `img-${Date.now()}-${Math.random()}`,
                    src: item.src,
                    alt: item.alt || "",
                    description: item.description || "",
                });
            }

            const config: GalleryConfig = { title, items: validatedItems, homeHeroImages };
            const contentString = JSON.stringify(config, null, 2);

            // Write to GitHub
            if (GITHUB_REPO && GITHUB_TOKEN) {
                try {
                    await githubPut(GITHUB_REPO, GITHUB_TOKEN, PUBLISH_BRANCH, GALLERY_PATH, contentString, "chore(gallery): update gallery images");

                    // Trigger deploy hook if available
                    if (VERCEL_DEPLOY_HOOK_URL) {
                        try {
                            await fetch(VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
                        } catch (e) {
                            console.error("Deploy hook failed", e);
                        }
                    }

                    respond(res, 200, { success: true, data: config });
                    return;
                } catch (error: any) {
                    console.error("GitHub write failed", error);
                    respond(res, 502, { success: false, error: "GitHub write failed" });
                    return;
                }
            }

            // Fallback to local FS (for dev)
            try {
                await fs.writeFile(path.resolve(process.cwd(), GALLERY_PATH), contentString, "utf-8");
                respond(res, 200, { success: true, data: config, mode: "fs-write" });
            } catch (error: any) {
                respond(res, 500, { success: false, error: "Write failed" });
            }
            return;
        }

        respond(res, 405, { success: false, error: "Method not allowed" });
    } catch (error: any) {
        console.error("API Error", error);
        respond(res, 500, { success: false, error: "Server error" });
    }
}

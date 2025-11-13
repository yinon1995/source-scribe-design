import type { VercelResponse } from "@vercel/node";

const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

function toBase64(content: string | Uint8Array) {
	return Buffer.from(content).toString("base64");
}

function encodeGitHubPath(path: string) {
	return path.split("/").map(encodeURIComponent).join("/");
}

export function json(res: VercelResponse, status: number, data: any) {
	res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(data));
}

export async function githubGet(path: string) {
	if (!REPO || !TOKEN) return undefined;
	const url = `https://api.github.com/repos/${REPO}/contents/${encodeGitHubPath(path)}`;
	const res = await fetch(url, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `token ${TOKEN}`,
		},
	});
	if (res.status === 404) return undefined;
	if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
	return res.json();
}

export async function githubPut(path: string, content: string, message: string) {
	if (!REPO || !TOKEN) throw new Error("Missing GitHub credentials");
	let sha: string | undefined;
	const existing = await githubGet(path);
	if (existing && typeof (existing as any).sha === "string") sha = (existing as any).sha;
	const url = `https://api.github.com/repos/${REPO}/contents/${encodeGitHubPath(path)}`;
	const res = await fetch(url, {
		method: "PUT",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `token ${TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			message,
			content: toBase64(content),
			branch: "main",
			sha,
			committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" },
		}),
	});
	if (!res.ok) {
		const txt = await res.text();
		throw new Error(`GitHub PUT ${res.status}: ${txt}`);
	}
	return res.json();
}



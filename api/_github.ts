import type { VercelRequest, VercelResponse } from "@vercel/node";

const REPO = process.env.GITHUB_REPO; // e.g. "nolwennrobet-lab/source-scribe-design"
const TOKEN = process.env.GITHUB_TOKEN;

export async function createIssue(title: string, body: string, labels: string[]) {
  if (!REPO || !TOKEN) throw new Error("Missing GITHUB_REPO/GITHUB_TOKEN");
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) throw new Error(`GitHub error: ${res.status}`);
  return res.json();
}

export function json(res: VercelResponse, status: number, data: any) {
  res
    .status(status)
    .setHeader("Content-Type", "application/json")
    .send(JSON.stringify(data));
}

export type { VercelRequest, VercelResponse };



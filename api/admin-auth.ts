type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const method = req.method?.toUpperCase();

  if (method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!PUBLISH_TOKEN || provided !== PUBLISH_TOKEN) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  res.status(200).json({ ok: true });
}



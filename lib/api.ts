// HTTP client for snippets-api. This is the only module that talks to the API.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const NAME_MAX = 200;
export const AUTHOR_MAX = 100;
export const CONTENT_MAX_BYTES = 100 * 1024;

export type Snippet = {
  id: string;
  name: string;
  content: string;
  author: string;
  created_at: string; // ISO 8601 UTC
};

export type SnippetMeta = Omit<Snippet, "content">;

export type SnippetPage = {
  items: SnippetMeta[]; // newest first
  page: number;
  pageSize: number;
  total: number;
  totalPages: number; // 0 when there are no snippets
};

export type CreateSnippetInput = Pick<Snippet, "name" | "author" | "content">;

export class ApiError extends Error {
  /** HTTP status, or 0 when the API could not be reached at all. */
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!API_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not set", 0);
  }
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Could not reach the snippets API at ${API_URL}`, 0);
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") message = body.error;
  } catch {
    // Non-JSON error body; keep the generic message.
  }
  if (res.status === 413) message = "Snippet is too large (max 100 KB).";
  return new ApiError(message, res.status);
}

export async function createSnippet(input: CreateSnippetInput): Promise<Snippet> {
  const res = await request("/snippets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

/** `page` ≥ 1, `pageSize` 1–50. A page past the end returns empty `items`. */
export async function listSnippets({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<SnippetPage> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await request(`/snippets?${qs}`);
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

/** Returns null when the snippet does not exist. */
export async function getSnippet(id: string): Promise<Snippet | null> {
  const res = await request(`/snippets/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

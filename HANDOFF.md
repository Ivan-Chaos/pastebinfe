# Handoff: snippets-web

## What this is
The frontend for **Shareable HTML Snippets**. Users create HTML snippets (name, HTML content, author) and get a shareable link that anyone can open to view the rendered snippet. All data lives in a separate backend repo, `snippets-api` (Express + SQLite). This app is a pure HTTP client of that API.

## Stack (fixed, don't substitute)
- Next.js with the **Pages Router**, not the App Router
- TypeScript, Tailwind
- No database libraries, and no Next.js API routes (`pages/api` was intentionally removed)

## Hard rules
- **Never touch the DB.** Every read and write goes through `snippets-api` over HTTP.
- **Never render snippet HTML into the app's DOM.** No `dangerouslySetInnerHTML`. Snippet HTML is untrusted and would run scripts on the app's origin (XSS).
- **Always render snippet HTML in a sandboxed iframe:** `<iframe sandbox="allow-scripts" srcDoc={content}>`.
- **Never add `allow-same-origin`.** Combined with `allow-scripts`, it lets the frame escape the sandbox. This applies to both the share page and the live preview.
- Author is a plain-text name the user types. There's no auth.

## API contract (provided by snippets-api)
| Route | Use |
| --- | --- |
| `POST /snippets` | Body `{ name, author, content }`. Returns 201 with the full snippet, or 400 `{ error }`. |
| `GET /snippets` | Returns the 50 most recent snippets as metadata (`id, name, author, created_at`), without content. |
| `GET /snippets/:id` | Returns the full snippet, or 404. |

Snippet shape: `{ id: string; name: string; content: string; author: string; created_at: string /* ISO 8601 UTC */ }`.
Limits enforced by the API: name ≤ 200 chars, author ≤ 100 chars, content ≤ 100 KB. Requests over 200 KB are rejected with 413.

## Pages
- **`lib/api.ts`** (API client): reads `NEXT_PUBLIC_API_URL` and exports the `Snippet` and `SnippetMeta` types plus `createSnippet` and `listSnippets`. It surfaces the API's `error` message when a request fails.
- **`pages/index.tsx`** (create form and recent list):
  - Inputs: name, author, and a textarea for the HTML content.
  - On submit: show a loading state, then call `createSnippet`. On success, show the share URL `${window.location.origin}/s/${id}` with a copy button and refresh the list. On a 400, show the API's error inline.
  - Optional live preview using the same sandboxed iframe.
  - Below the form: a list of recent snippets (name, author, created time in local time), each linking to `/s/[id]`.
- **`pages/s/[id].tsx`** (share page):
  - Uses `getServerSideProps` to fetch `GET /snippets/:id`, so the link works for anyone who opens it. Returns `notFound` on a 404 and throws on other errors. URL-encode the id.
  - Renders the name, the author, the created time, and the content in the sandboxed iframe.

## Environment variables
| Var | Example | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API base URL, used client- and server-side |

`.env.example` is committed. `.env.local` is ignored.
**`NEXT_PUBLIC_*` values are inlined at build time**, so set the production value *before* `next build`.

## Current status
**Done:** scaffolded with `create-next-app` (Pages Router, TS, Tailwind, ESLint, `@/*` alias, no `src/` directory), sample `pages/api` removed, env files added. `npm run build` passes.

**To do:** `lib/api.ts`, `pages/index.tsx` (form and list), and `pages/s/[id].tsx` (share page).

## Run locally
Start `snippets-api` on `:4000` first, then run `npm run dev` here (this app runs on `:3000`).

## Deploy
- Any Node host that runs Next.js.
- Set `NEXT_PUBLIC_API_URL=https://<api-domain>` **before building**.
- The API's `CORS_ORIGIN` must exactly match this app's production origin.

## Verify (prod)
- Create a snippet, then open its share link in a private window.
- Paste `<script>alert(document.domain)</script>` as content. The alert must **not** show this app's domain. That proves the sandbox is working.

## Troubleshooting
- CORS error in the browser: the API's `CORS_ORIGIN` doesn't match this app's origin exactly (scheme, host and port, no trailing slash).
- Prod still calls localhost: `NEXT_PUBLIC_API_URL` was set after the build. Rebuild.

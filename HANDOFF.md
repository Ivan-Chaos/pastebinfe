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
| `POST /snippets` | Body `{ name, author, content }`. Returns 201 with the full snippet, 400 `{ error }`, or 413 if over 200 KB. The API stores a blank author as "Anonymous", but the creator form requires one. |
| `GET /snippets?page=&pageSize=` | Returns `{ items, page, pageSize, total, totalPages }`. Items are metadata only (no content), newest first. `page` ≥ 1, `pageSize` 1–50 (default 20). A page past the end returns empty `items`; `totalPages` is 0 when there are no snippets. |
| `GET /snippets/:id` | Returns the full snippet, or 404. |
| `PATCH` / `DELETE /snippets/:id` | Admin only (`Authorization: Bearer <ADMIN_KEY>`). **Not used by this app.** If you add admin features, call these from server-side code only and never put the key in a `NEXT_PUBLIC_*` variable. |

Snippet shape: `{ id: string; name: string; content: string; author: string; created_at: string /* ISO 8601 UTC */ }`.
Limits enforced by the API: name ≤ 200 chars, author ≤ 100 chars, content ≤ 100 KB. Requests over 200 KB are rejected with 413.

## Pages
- **`lib/api.ts`** (API client): reads `NEXT_PUBLIC_API_URL` and exports the types plus `createSnippet`, `listSnippets` and `getSnippet`. It throws `ApiError` with the API's `error` message; `status: 0` means the API was unreachable.
- **`lib/validateHtml.ts`**: a structural HTML check used by the creator. It flags unclosed or mismatched tags, stray closing tags, unterminated comments or quotes, and input with no tags. It allows void elements and the end tags HTML lets you omit.
- **`components/SnippetFrame.tsx`**: the only place snippet HTML is rendered (`sandbox="allow-scripts"`).
- **`pages/index.tsx`** (gallery, `/`): rendered with `getServerSideProps` and paginated with `?page=N` (12 per page). Each card links to `/snippet/[id]`.
- **`pages/new.tsx`** (creator, `/new`): fields for snippet name, creator name and HTML, with length/size limits, HTML validation and a debounced live preview. On success it shows the share link with a copy button.
- **`pages/snippet/[id].tsx`** (viewer): rendered with `getServerSideProps`. It returns `notFound` on a 404, shows "API unavailable" if the API can't be reached, and throws on other errors. It toggles between **Preview** (sandboxed iframe) and **HTML** (escaped source with line numbers); `?view=source` links straight to the HTML view.
- `/s/:id` redirects to `/snippet/:id` (`next.config.ts`).

## Environment variables
| Var | Example | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API base URL, used client- and server-side |

`.env.example` is committed. `.env.local` is ignored.
**`NEXT_PUBLIC_*` values are inlined at build time**, so set the production value *before* `next build`.

## Current status
**Done:** scaffolded with `create-next-app` (Pages Router, TS, Tailwind, ESLint, `@/*` alias, no `src/` directory), sample `pages/api` removed, env files added. `npm run build` passes.

**Done:** the gallery, creator and viewer screens. They've been verified end to end against a local `snippets-api`: creating from the browser through CORS, server-side paging, 404, the `/s` redirect, and the sandbox (a snippet's script sees `origin=null` and can't read cookies).

**To do:** none in the app itself. Optional: admin edit/delete, which would need server-side code.

## Run locally
Start `snippets-api` on `:4000` first, then run `npm run dev` here (this app runs on `:3000`).

## Deploy
- Any Node host that runs Next.js.
- Set `NEXT_PUBLIC_API_URL=https://<api-domain>` **before building**.
- The API's `CORS_ORIGIN` must exactly match this app's production origin.

## Verify (prod)
- Create a snippet, then open its share link (`/snippet/<id>`) in a private window.
- Paste `<script>alert(document.domain)</script>` as content. The alert must **not** show this app's domain. That proves the sandbox is working.

## Troubleshooting
- CORS error in the browser: the API's `CORS_ORIGIN` doesn't match this app's origin exactly (scheme, host and port, no trailing slash).
- Prod still calls localhost: `NEXT_PUBLIC_API_URL` was set after the build. Rebuild.

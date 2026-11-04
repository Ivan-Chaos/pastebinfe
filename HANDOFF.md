# Handoff: snippets-web

## What this is
The frontend for **Shareable HTML Snippets**. Users create HTML snippets (name, HTML content, author) and get a shareable link that anyone can open to view the rendered snippet. All data lives in a separate backend repo, `snippets-api` (Express + SQLite). This app is a pure HTTP client of that API.

## Stack (fixed, don't substitute)
- Next.js with the **Pages Router**, not the App Router
- TypeScript, Tailwind
- No database libraries, and no Next.js API routes (`pages/api` was intentionally removed)
- **Static export** (`output: "export"`) hosted on GitHub Pages. There is no server, so there's no `getServerSideProps`, no redirects and no dynamic routes.

Why things are the way they are: see [`docs/decisions.md`](docs/decisions.md).

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
| `PATCH` / `DELETE /snippets/:id` | Admin only (`Authorization: Bearer <ADMIN_KEY>`). **Not used by this app.** The key must stay server-side, and GitHub Pages has no server side (decision #10). |

Snippet shape: `{ id: string; name: string; content: string; author: string; created_at: string /* ISO 8601 UTC */ }`.
Limits enforced by the API: name ≤ 200 chars, author ≤ 100 chars, content ≤ 100 KB. Requests over 200 KB are rejected with 413.

## Pages
- **`lib/api.ts`** (API client): reads `NEXT_PUBLIC_API_URL` and exports the types plus `createSnippet`, `listSnippets` and `getSnippet`. It throws `ApiError` with the API's `error` message; `status: 0` means the API was unreachable.
- **`lib/validateHtml.ts`**: a structural HTML check used by the creator. It flags unclosed or mismatched tags, stray closing tags, unterminated comments or quotes, and input with no tags. It allows void elements and the end tags HTML lets you omit.
- **`lib/useApi.ts`**: a small hook that loads data in the browser. All reads happen client-side.
- **`lib/routes.ts`**: builds snippet links (`snippetHref`, `snippetShareUrl`). The share URL includes the base path.
- **`components/SnippetFrame.tsx`**: the only place snippet HTML is rendered (`sandbox="allow-scripts"`).
- **`pages/index.tsx`** (gallery, `/`): paginated with `?page=N` (12 per page). Each card links to the viewer.
- **`pages/new.tsx`** (creator, `/new`): fields for snippet name, creator name and HTML, with length/size limits, HTML validation and a debounced live preview. On success it shows the share link with a copy button.
- **`pages/snippet/index.tsx`** (viewer, `/snippet/?id=<id>`): shows "Snippet not found" for unknown ids and "API unavailable" if the API can't be reached. It toggles between **Preview** (sandboxed iframe) and **HTML** (escaped source with line numbers); `&view=source` links straight to the HTML view.

## Environment variables
| Var | Example | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API base URL. In CI it comes from the repo variable `API_URL`. |
| `NEXT_PUBLIC_BASE_PATH` | `/pastebinfe` | URL prefix for the GitHub Pages project site. Set by the workflow; leave it empty locally. |

`.env.example` is committed. `.env.local` is ignored.
**`NEXT_PUBLIC_*` values are inlined at build time**, so set the production value *before* `next build`.

## Current status
**Done:** scaffolded with `create-next-app` (Pages Router, TS, Tailwind, ESLint, `@/*` alias, no `src/` directory), sample `pages/api` removed, env files added. `npm run build` passes.

**Done:** the gallery, creator and viewer screens, converted to a static export. They were verified against a local `snippets-api`, served the way GitHub Pages serves them (under `/pastebinfe`):
- the gallery and paging
- a share link opened directly
- the Preview/HTML toggle
- the not-found state
- creating a snippet from the browser through CORS
- the sandbox: a snippet's script sees `origin=null` and can't read cookies

The deploy workflow is in place.

**To do:**
- Host `snippets-api` publicly over HTTPS.
- Then follow the Deploy steps below.

Optional: admin edit/delete. It would need a server (decision #10).

## Run locally
Start `snippets-api` on `:4000` first, then run `npm run dev` here (this app runs on `:3000`, at the root, with no base path).

To build the export locally: `npm run build` writes `out/`. To try the Pages prefix, set `NEXT_PUBLIC_BASE_PATH=/pastebinfe` for that build.

## Deploy (GitHub Pages)
`.github/workflows/deploy-pages.yml` builds and deploys on every push to `main`. It can also be started by hand from the Actions tab.

One-time setup:
1. Host `snippets-api` publicly over **HTTPS**. Pages is HTTPS, and browsers block calls from it to an HTTP API.
2. On the API, set `CORS_ORIGIN=https://ivan-chaos.github.io` (no path, no trailing slash).
3. In the repo, open Settings → Secrets and variables → Actions → **Variables**. Add `API_URL` = the API's HTTPS address, with no trailing slash.
4. In the repo, open Settings → Pages → Source and choose **GitHub Actions**.
5. Re-run the workflow. The site is at **https://ivan-chaos.github.io/pastebinfe/**.

## Verify (prod)
- Create a snippet, then open its share link (`/pastebinfe/snippet/?id=<id>`) in a private window.
- Paste `<script>alert(document.domain)</script>` as content. The alert must **not** show this app's domain. That proves the sandbox is working.

## Troubleshooting
- **"API unavailable" in prod:** `API_URL` is wrong or unset, or the API isn't reachable over HTTPS. Check the browser console.
- **CORS error in the browser:** the API's `CORS_ORIGIN` doesn't exactly match `https://ivan-chaos.github.io` (scheme and host, no path, no trailing slash).
- **Prod still calls the old API:** the URL is baked in at build time. Re-run the workflow after changing `API_URL`.
- **Workflow fails with "API_URL is not set":** do Deploy step 3.
- **Local build fails with `Duplicate identifier 'PagesPageConfig'`:** `next dev` and `next build` both generated types into `.next/`. Stop the dev server, delete `.next`, and build again. This doesn't happen in CI.
- **Local build on Windows Git Bash says "basePath has to start with a /":** Git Bash rewrote `/pastebinfe` into a Windows path. Prefix the command with `MSYS_NO_PATHCONV=1`.

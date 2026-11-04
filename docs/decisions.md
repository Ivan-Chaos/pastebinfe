# Decision log: snippets-web

Decisions made while building the frontend, newest first. Each entry says what was decided, why, and what it costs. Inputs were [`HANDOFF.md`](../HANDOFF.md) and the `snippets-api` reference.

| # | Decision | Status |
| --- | --- | --- |
| 12 | [Deploy as a static export to GitHub Pages](#12-deploy-as-a-static-export-to-github-pages) | Active |
| 11 | [Viewer URL is `/snippet/?id=<id>`](#11-viewer-url-is-snippetidid) | Active (replaces part of #3) |
| 10 | [Admin edit/delete is not implemented](#10-admin-editdelete-is-not-implemented) | Active |
| 9 | [Creator name is required](#9-creator-name-is-required) | Active |
| 8 | [Paginate on the API, 12 per page, page in the URL](#8-paginate-on-the-api-12-per-page-page-in-the-url) | Active |
| 7 | [Treat "API unreachable" as a page state, not a crash](#7-treat-api-unreachable-as-a-page-state-not-a-crash) | Active |
| 6 | [No mock API while the backend was being built](#6-no-mock-api-while-the-backend-was-being-built) | Done |
| 5 | [HTML validation is a hand-written structural check](#5-html-validation-is-a-hand-written-structural-check) | Active |
| 4 | [Viewer has a Preview / HTML toggle kept in the URL](#4-viewer-has-a-preview--html-toggle-kept-in-the-url) | Active |
| 3 | [Three screens: gallery, creator, viewer](#3-three-screens-gallery-creator-viewer) | Active |
| 2 | [One component renders snippet HTML, sandboxed](#2-one-component-renders-snippet-html-sandboxed) | Active |
| 1 | [Pages Router, pure HTTP client of `snippets-api`](#1-pages-router-pure-http-client-of-snippets-api) | Active |

---

## 12. Deploy as a static export to GitHub Pages

**Context.** The app is to be hosted on GitHub Pages, which only serves static files. Before this, the gallery and viewer used `getServerSideProps`, and `next.config.ts` had a redirect.

**Decision.**
- `next.config.ts`: `output: "export"`, `trailingSlash: true` (emits `new/index.html` etc., which Pages serves without rewrites). `basePath` comes from `NEXT_PUBLIC_BASE_PATH`: empty locally, `/<repo-name>` in CI.
- All API reads happen in the browser via `lib/useApi.ts`; there is no server-side rendering.
- `.github/workflows/deploy-pages.yml` builds on every push to `main` and deploys `out/` with the official Pages actions. The API address comes from the repository variable `API_URL`, and the job fails early if it's missing.
- `public/.nojekyll` stops Jekyll from dropping the `_next/` folder if the site is ever deployed from a branch instead of Actions.

**Consequences.**
- No server-rendered HTML. Pages show a skeleton while loading, and shared links have no per-snippet title or preview for crawlers and chat unfurls.
- The `/s/:id` redirect was removed: static export doesn't support redirects.
- The API must be publicly reachable over **HTTPS**, and its `CORS_ORIGIN` must be `https://ivan-chaos.github.io` (no path).
- The API URL is baked in at build time. Changing `API_URL` requires a new workflow run.
- Admin features can't be added on Pages (see #10).
- Going back to a Node host means reverting this config and restoring the `getServerSideProps` versions, which are in git history at `492761c`.

## 11. Viewer URL is `/snippet/?id=<id>`

**Context.** A static export can only emit pages whose paths are known at build time. Snippet ids are created at runtime, so `/snippet/[id]` can't be exported. The user's requirement was a viewer at "`snippet/id` or whatever".

**Decision.** There is one static page, `pages/snippet/index.tsx`, and the id goes in the query string. Links are built in one place, `lib/routes.ts` (`snippetHref`, `snippetShareUrl`). `snippetShareUrl` includes the base path.

**Alternatives rejected.** Using a `404.html` fallback to fake `/snippet/<id>` paths: it serves every snippet with a 404 status, adds a client-side redirect, and is fragile.

**Consequences.** Links from the short-lived `/snippet/<id>` version (local only, never deployed) don't resolve. If the app moves to a Node host, path-style URLs can come back by changing only `lib/routes.ts` and the page file.

## 10. Admin edit/delete is not implemented

**Context.** The API offers `PATCH` and `DELETE /snippets/:id` behind a bearer `ADMIN_KEY`, and says the key must never reach the browser.

**Decision.** These aren't used. Doing it safely needs server-side code, which the original HANDOFF ruled out (`pages/api` removed) and GitHub Pages can't run.

**Consequences.** Removing a snippet, including test data, means calling the API directly with the key. Adding admin features means adding a server: a separate small service, or moving off Pages.

## 9. Creator name is required

**Context.** The API accepts a blank author and stores it as `"Anonymous"`. The user's requirement listed creator name as an input.

**Decision.** The form requires it (1–100 chars).

**Consequences.** Stricter than the API. Making it optional is a one-line change in `pages/new.tsx`; the API already handles the blank case.

## 8. Paginate on the API, 12 per page, page in the URL

**Context.** The original contract returned only the 50 newest snippets with no paging. The user asked for a paginated gallery. While the API was still being built, we chose to assume it would gain paging rather than paginate those 50 in the browser.

**Decision.** `listSnippets({ page, pageSize })` calls `GET /snippets?page=&pageSize=` (the shipped API uses `pageSize` and returns `totalPages`). The gallery uses 12 per page (a 3×4 grid) and keeps the page in `?page=N`, so pages can be linked and the back button works. A page past the end shows an empty state with a link back to page 1.

**Consequences.** The API counts pages from the newest snippet. If someone creates a snippet while you're browsing, the next page can repeat an item. That's accepted.

## 7. Treat "API unreachable" as a page state, not a crash

**Decision.** `lib/api.ts` throws `ApiError`. `status` is the HTTP code, or `0` when the request never got a response (network, CORS, or `NEXT_PUBLIC_API_URL` unset). The API's own `{ error }` message is shown when there is one. Pages render `components/ApiUnavailable.tsx` for status 0; it shows the configured API URL, which makes misconfiguration obvious.

## 6. No mock API while the backend was being built

**Context.** Development started before `snippets-api` existed. Options were a local mock server, a mock mode inside the app, or a real client only.

**Decision (user's choice).** Real HTTP client only, written against the documented contract, with the "API unavailable" state (#7) covering the gap.

**Consequences.** The screens couldn't be tested end to end until the API shipped. Once it did, the only change needed was the paging parameters (`limit` became `pageSize`, plus `totalPages`).

## 5. HTML validation is a hand-written structural check

**Context.** The user asked to "validate snippet for being valid HTML". Browsers never reject HTML; they repair anything. `DOMParser` never reports errors for `text/html`, and the API stores content without checking it.

**Decision.** `lib/validateHtml.ts` is a small tokenizer with no dependencies. Before a snippet can be created, it reports these errors with line numbers:
- Empty input, or input with no tags at all.
- Unterminated comments (`<!--` with no `-->`).
- Tags missing their closing `>`, and attribute quotes that never close.
- Closing tags with no matching opening tag, and closing tags in the wrong order.
- Elements left unclosed.

It skips the contents of `script`, `style`, `textarea` and `title`. It also accepts things HTML legitimately allows:
- void elements, like `<img>`
- self-closing `/>`
- end tags HTML lets you leave out, like `<p>a<p>b` or `<li>`, `<td>` and `<tr>`
- a bare `<` in text

**Alternatives rejected.**
- Strict XHTML parsing: it rejects normal HTML.
- `parse5` parse errors: a dependency, and its error coverage isn't designed for this use.
- No validation: the user asked for it.

**Consequences.** It catches typing mistakes. It doesn't check which elements may contain which (for example, a `<div>` inside a `<p>`), and it's no security control: the sandbox (#2) is. The API doesn't validate, so content posted to the API directly is unchecked.

## 4. Viewer has a Preview / HTML toggle kept in the URL

**Decision.** The viewer shows **Preview** (the sandboxed iframe) or **HTML** (the original source as escaped text, with line numbers and a copy button). The choice is stored in `?view=source` via a shallow `router.replace`, so you can link straight to either view. The source view is plain React text and never touches the DOM as HTML.

## 3. Three screens: gallery, creator, viewer

**Decision (user's choice).** `/` is the gallery, the creator is `/new`, and the viewer was originally `/snippet/[id]` with `/s/:id` redirecting to it (both later changed by #11 and #12). The HANDOFF's single index page (form plus recent list) was split into separate screens.

The creator also has:
- live character and byte counters against the API limits (name 200, author 100, content 100 KB)
- a live preview, refreshed 300 ms after you stop typing
- a success panel with the share link

## 2. One component renders snippet HTML, sandboxed

**Decision.** `components/SnippetFrame.tsx` is the only place snippet HTML is rendered:
`<iframe sandbox="allow-scripts" srcDoc={content} referrerPolicy="no-referrer">`.
Both the viewer and the creator preview use it.

**Why.** Snippet HTML is untrusted. With `allow-scripts` and no `allow-same-origin`, the frame runs in an opaque origin. This was checked in the browser: a snippet's script sees `origin=null` and can't read cookies, and the parent page can't reach into the frame. Keeping it in one component means the sandbox attribute is defined once.

**Rules.**
- Never add `allow-same-origin`.
- Never use `dangerouslySetInnerHTML`.

## 1. Pages Router, pure HTTP client of `snippets-api`

**Context.** These were fixed by the HANDOFF.

**Decision.**
- Next.js Pages Router, TypeScript and Tailwind.
- No database access and no `pages/api`.
- Everything goes through `lib/api.ts`, the only module that knows API URLs, the request shape and errors.

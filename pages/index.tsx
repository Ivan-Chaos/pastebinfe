import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ApiError, listSnippets } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { snippetHref } from "@/lib/routes";
import ApiUnavailable from "@/components/ApiUnavailable";
import LocalTime from "@/components/LocalTime";

const PAGE_SIZE = 12;

export default function Gallery() {
  const router = useRouter();
  const raw = Number.parseInt(String(router.query.page ?? "1"), 10);
  const page = Number.isFinite(raw) && raw >= 1 ? raw : 1;

  const state = useApi(router.isReady ? `page:${page}` : null, () =>
    listSnippets({ page, pageSize: PAGE_SIZE }),
  );

  return (
    <>
      <Head>
        <title>Snippets · Gallery</title>
      </Head>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
        {state.status === "success" && (
          <p className="text-sm text-zinc-500">
            {state.data.total} snippet{state.data.total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {state.status === "loading" ? (
        <GallerySkeleton />
      ) : state.status === "error" ? (
        <ApiUnavailable message={state.error instanceof ApiError ? state.error.message : undefined} />
      ) : state.data.total === 0 ? (
        <div className="rounded-md border border-dashed border-black/15 p-10 text-center dark:border-white/20">
          <p className="text-zinc-500">No snippets yet.</p>
          <Link href="/new" className="mt-3 inline-block font-medium underline">
            Create the first one
          </Link>
        </div>
      ) : state.data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-black/15 p-10 text-center dark:border-white/20">
          <p className="text-zinc-500">This page is empty.</p>
          <Link href="/" className="mt-3 inline-block font-medium underline">
            Back to page 1
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.items.map((s) => (
              <li key={s.id}>
                <Link
                  href={snippetHref(s.id)}
                  className="block h-full rounded-md border border-black/10 p-4 transition-colors hover:border-black/30 hover:bg-black/[.02] dark:border-white/15 dark:hover:border-white/40 dark:hover:bg-white/[.03]"
                >
                  <p className="truncate font-medium" title={s.name}>
                    {s.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-500">by {s.author}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    <LocalTime iso={s.created_at} />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={Math.max(1, state.data.totalPages)} />
        </>
      )}
    </>
  );
}

function GallerySkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="h-[92px] animate-pulse rounded-md bg-black/5 dark:bg-white/5" />
      ))}
    </ul>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1 && page === 1) return null;
  const href = (p: number) => (p === 1 ? "/" : { pathname: "/", query: { page: p } });
  const btn = "rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20";
  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${btn} hover:bg-black/5 dark:hover:bg-white/10`}>
          ← Prev
        </Link>
      ) : (
        <span className={`${btn} opacity-40`}>← Prev</span>
      )}
      <span className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={`${btn} hover:bg-black/5 dark:hover:bg-white/10`}>
          Next →
        </Link>
      ) : (
        <span className={`${btn} opacity-40`}>Next →</span>
      )}
    </nav>
  );
}

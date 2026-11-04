import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { ApiError, listSnippets, type SnippetMeta } from "@/lib/api";
import ApiUnavailable from "@/components/ApiUnavailable";
import LocalTime from "@/components/LocalTime";

const PAGE_SIZE = 12;

type Props =
  | { ok: true; items: SnippetMeta[]; total: number; page: number; totalPages: number }
  | { ok: false; error: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ query }) => {
  const raw = Number.parseInt(String(query.page ?? "1"), 10);
  const page = Number.isFinite(raw) && raw >= 1 ? raw : 1;

  try {
    const res = await listSnippets({ page, pageSize: PAGE_SIZE });
    const { items, total } = res;
    const totalPages = Math.max(1, res.totalPages);
    if (page > totalPages) {
      return { redirect: { destination: totalPages === 1 ? "/" : `/?page=${totalPages}`, permanent: false } };
    }
    return { props: { ok: true, items, total, page, totalPages } };
  } catch (err) {
    if (err instanceof ApiError) return { props: { ok: false, error: err.message } };
    throw err;
  }
};

export default function Gallery(props: Props) {
  return (
    <>
      <Head>
        <title>Snippets · Gallery</title>
      </Head>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
          {props.ok && (
            <p className="text-sm text-zinc-500">
              {props.total} snippet{props.total === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {!props.ok ? (
        <ApiUnavailable message={props.error} />
      ) : props.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-black/15 p-10 text-center dark:border-white/20">
          <p className="text-zinc-500">No snippets yet.</p>
          <Link href="/new" className="mt-3 inline-block font-medium underline">
            Create the first one
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {props.items.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/snippet/${encodeURIComponent(s.id)}`}
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
          <Pagination page={props.page} totalPages={props.totalPages} />
        </>
      )}
    </>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => (p === 1 ? "/" : `/?page=${p}`);
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

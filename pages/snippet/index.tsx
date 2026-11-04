import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ApiError, getSnippet, type Snippet } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { snippetShareUrl } from "@/lib/routes";
import SnippetFrame from "@/components/SnippetFrame";
import CopyButton from "@/components/CopyButton";
import LocalTime from "@/components/LocalTime";
import ApiUnavailable from "@/components/ApiUnavailable";

type View = "preview" | "source";

// Viewer: /snippet/?id=<id>[&view=source]
export default function SnippetPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const state = useApi(router.isReady ? `id:${id}` : null, () =>
    id ? getSnippet(id) : Promise.resolve(null),
  );

  if (state.status === "loading") {
    return <div className="h-[70vh] animate-pulse rounded-md bg-black/5 dark:bg-white/5" aria-busy="true" />;
  }
  if (state.status === "error") {
    const err = state.error;
    if (err instanceof ApiError && err.status === 0) return <ApiUnavailable message={err.message} />;
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        Couldn&apos;t load this snippet: {err instanceof Error ? err.message : "unknown error"}
      </p>
    );
  }
  if (!state.data) return <NotFound />;
  return <SnippetViewer snippet={state.data} />;
}

function NotFound() {
  return (
    <>
      <Head>
        <title>Snippet not found · Snippets</title>
      </Head>
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Snippet not found</h1>
        <p className="mt-2 text-zinc-500">The link may be wrong, or the snippet was deleted.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Back to the gallery
        </Link>
      </div>
    </>
  );
}

function SnippetViewer({ snippet }: { snippet: Snippet }) {
  const router = useRouter();
  const view: View = router.query.view === "source" ? "source" : "preview";

  function setView(next: View) {
    const query = { ...router.query };
    if (next === "source") query.view = "source";
    else delete query.view;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
  }

  return (
    <>
      <Head>
        <title>{`${snippet.name} · Snippets`}</title>
      </Head>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight">{snippet.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            by <span className="text-foreground">{snippet.author}</span> · <LocalTime iso={snippet.created_at} />
          </p>
        </div>
        <CopyButton text={snippetShareUrl(snippet.id)} label="Copy link" />
      </div>

      <div className="mb-3 flex items-center justify-between gap-4">
        <div role="tablist" className="inline-flex rounded-md border border-black/15 p-0.5 dark:border-white/20">
          {(["preview", "source"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-sm ${
                view === v ? "bg-foreground text-background" : "text-zinc-600 hover:text-foreground dark:text-zinc-400"
              }`}
            >
              {v === "preview" ? "Preview" : "HTML"}
            </button>
          ))}
        </div>
        {view === "source" && <CopyButton text={snippet.content} label="Copy HTML" />}
      </div>

      {view === "preview" ? (
        <SnippetFrame content={snippet.content} title={snippet.name} className="h-[70vh]" />
      ) : (
        <SourceView content={snippet.content} />
      )}
    </>
  );
}

function SourceView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="max-h-[70vh] overflow-auto rounded-md border border-black/10 bg-zinc-50 dark:border-white/15 dark:bg-zinc-900">
      <pre className="font-mono text-sm leading-6">
        <code className="grid grid-cols-[auto_1fr]">
          {lines.map((line, i) => (
            <span key={i} className="contents">
              <span className="select-none border-r border-black/10 px-3 text-right text-zinc-400 dark:border-white/10">
                {i + 1}
              </span>
              <span className="whitespace-pre px-4">{line || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

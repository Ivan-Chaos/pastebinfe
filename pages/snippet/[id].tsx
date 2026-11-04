import Head from "next/head";
import { useRouter } from "next/router";
import { useSyncExternalStore } from "react";
import type { GetServerSideProps } from "next";
import { ApiError, getSnippet, type Snippet } from "@/lib/api";
import ApiUnavailable from "@/components/ApiUnavailable";
import SnippetFrame from "@/components/SnippetFrame";
import CopyButton from "@/components/CopyButton";
import LocalTime from "@/components/LocalTime";

type View = "preview" | "source";
type Props = { snippet: Snippet };
type PageProps = Props | { snippet: null; apiError: string };

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params }) => {
  try {
    const snippet = await getSnippet(String(params?.id ?? ""));
    if (!snippet) return { notFound: true };
    return { props: { snippet } };
  } catch (err) {
    // API unreachable: show a friendly notice. Other API errors still throw.
    if (err instanceof ApiError && err.status === 0) {
      return { props: { snippet: null, apiError: err.message } };
    }
    throw err;
  }
};

const subscribe = () => () => {};

export default function SnippetPage(props: PageProps) {
  if (!props.snippet) return <ApiUnavailable message={"apiError" in props ? props.apiError : undefined} />;
  return <SnippetViewer snippet={props.snippet} />;
}

function SnippetViewer({ snippet }: Props) {
  const router = useRouter();
  const view: View = router.query.view === "source" ? "source" : "preview";
  const pageUrl = useSyncExternalStore(
    subscribe,
    () => window.location.href.split("?")[0],
    () => "",
  );

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
        {pageUrl && <CopyButton text={pageUrl} label="Copy link" />}
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

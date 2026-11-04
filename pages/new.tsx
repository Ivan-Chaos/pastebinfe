import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ApiError,
  AUTHOR_MAX,
  CONTENT_MAX_BYTES,
  NAME_MAX,
  createSnippet,
  type Snippet,
} from "@/lib/api";
import { validateHtml } from "@/lib/validateHtml";
import { snippetHref, snippetShareUrl } from "@/lib/routes";
import SnippetFrame from "@/components/SnippetFrame";
import CopyButton from "@/components/CopyButton";

type Field = "name" | "author" | "content";

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export default function NewSnippet() {
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, author: false, content: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<Snippet | null>(null);

  const [previewContent, setPreviewContent] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setPreviewContent(content), 300);
    return () => clearTimeout(t);
  }, [content]);
  const contentBytes = useMemo(() => byteLength(content), [content]);
  const html = useMemo(() => validateHtml(content), [content]);

  const errors = {
    name: !name.trim() ? "Snippet name is required." : name.length > NAME_MAX ? `Max ${NAME_MAX} characters.` : null,
    author: !author.trim()
      ? "Creator name is required."
      : author.length > AUTHOR_MAX
        ? `Max ${AUTHOR_MAX} characters.`
        : null,
    content: contentBytes > CONTENT_MAX_BYTES ? `Content exceeds ${CONTENT_MAX_BYTES / 1024} KB.` : null,
  };
  const hasErrors = Boolean(errors.name || errors.author || errors.content || !html.ok);
  const touch = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, author: true, content: true });
    setSubmitError(null);
    if (hasErrors) return;

    setSubmitting(true);
    try {
      const snippet = await createSnippet({ name: name.trim(), author: author.trim(), content });
      setCreated(snippet);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.status === 0 ? `The snippets API is unavailable. ${err.message}` : err.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setName("");
    setContent("");
    setTouched({ name: false, author: false, content: false });
    setCreated(null);
  }

  if (created) {
    const url = snippetShareUrl(created.id);
    return (
      <>
        <Head>
          <title>Snippet created · Snippets</title>
        </Head>
        <div className="rounded-md border border-emerald-500/40 bg-emerald-50 p-6 dark:bg-emerald-950/30">
          <h1 className="text-xl font-semibold">Snippet created</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Anyone with this link can view “{created.name}”.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-black/15 bg-background px-3 py-1.5 font-mono text-sm dark:border-white/20"
            />
            <CopyButton text={url} label="Copy link" />
            <Link
              href={snippetHref(created.id)}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
            >
              Open
            </Link>
          </div>
          <button type="button" onClick={reset} className="mt-4 text-sm underline">
            Create another
          </button>
        </div>
      </>
    );
  }

  const inputCls =
    "w-full rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-black/50 dark:border-white/20 dark:focus:border-white/50";

  return (
    <>
      <Head>
        <title>New snippet · Snippets</title>
      </Head>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New snippet</h1>

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled
              label="Snippet name"
              htmlFor="name"
              counter={`${name.length}/${NAME_MAX}`}
              error={touched.name ? errors.name : null}
            >
              <input
                id="name"
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => touch("name")}
                className={inputCls}
                placeholder="My button demo"
              />
            </Labeled>
            <Labeled
              label="Creator name"
              htmlFor="author"
              counter={`${author.length}/${AUTHOR_MAX}`}
              error={touched.author ? errors.author : null}
            >
              <input
                id="author"
                value={author}
                maxLength={AUTHOR_MAX}
                onChange={(e) => setAuthor(e.target.value)}
                onBlur={() => touch("author")}
                className={inputCls}
                placeholder="Ada"
              />
            </Labeled>
          </div>

          <Labeled
            label="HTML"
            htmlFor="content"
            counter={`${contentBytes < 1024 ? `${contentBytes} B` : `${(contentBytes / 1024).toFixed(1)} KB`} / ${CONTENT_MAX_BYTES / 1024} KB`}
            error={touched.content ? errors.content : null}
          >
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => touch("content")}
              spellCheck={false}
              rows={18}
              className={`${inputCls} resize-y font-mono`}
              placeholder={'<h1>Hello</h1>\n<p>Your HTML here…</p>'}
            />
          </Labeled>

          {touched.content && !html.ok && (
            <ul className="rounded-md border border-red-500/40 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              {html.errors.map((err, i) => (
                <li key={i}>
                  <span className="font-mono text-xs opacity-70">line {err.line}:</span> {err.message}
                </li>
              ))}
            </ul>
          )}

          {submitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting || (hasErrors && Object.values(touched).some(Boolean))}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Creating…" : "Create snippet"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Live preview</span>
          {previewContent.trim() ? (
            <SnippetFrame content={previewContent} title="Live preview" className="h-[30rem]" />
          ) : (
            <div className="flex h-[30rem] items-center justify-center rounded-md border border-dashed border-black/15 text-sm text-zinc-500 dark:border-white/20">
              Preview appears here
            </div>
          )}
        </div>
      </form>
    </>
  );
}

function Labeled({
  label,
  htmlFor,
  counter,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  counter?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {counter && <span className="text-xs text-zinc-500">{counter}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// The app is a static export (GitHub Pages), so snippet ids can't be path
// segments: there is no server to render /snippet/<id>. The id goes in the
// query string instead: /snippet/?id=<id>.

export const snippetHref = (id: string) => ({ pathname: "/snippet", query: { id } });

/** Absolute share URL, including the deploy's basePath (e.g. /pastebinfe). */
export function snippetShareUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${base}/snippet/?id=${encodeURIComponent(id)}`;
}

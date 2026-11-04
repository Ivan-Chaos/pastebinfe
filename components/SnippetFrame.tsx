// The ONLY place snippet HTML is rendered. Snippet HTML is untrusted:
// - it must never go into the app's DOM (no dangerouslySetInnerHTML);
// - the sandbox must stay "allow-scripts" only. Adding "allow-same-origin"
//   would let the snippet escape the sandbox and run on the app's origin.

type Props = {
  content: string;
  title: string;
  className?: string;
};

export default function SnippetFrame({ content, title, className = "" }: Props) {
  return (
    <iframe
      sandbox="allow-scripts"
      srcDoc={content}
      title={title}
      referrerPolicy="no-referrer"
      className={`w-full rounded-md border border-black/10 bg-white dark:border-white/15 ${className}`}
    />
  );
}

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders an ISO timestamp in the viewer's local time. The server render uses
 * UTC so the markup matches during hydration, then the client switches to local.
 */
export default function LocalTime({ iso }: { iso: string }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span>{iso}</span>;

  const text = isClient
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

  return (
    <time dateTime={iso} title={date.toISOString()}>
      {text}
    </time>
  );
}

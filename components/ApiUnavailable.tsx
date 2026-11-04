import { API_URL } from "@/lib/api";

export default function ApiUnavailable({ message }: { message?: string }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="font-medium">The snippets API is unavailable.</p>
      <p className="mt-1">
        {message ?? "Could not reach the API."} Configured URL:{" "}
        <code className="font-mono">{API_URL || "(NEXT_PUBLIC_API_URL not set)"}</code>
      </p>
    </div>
  );
}

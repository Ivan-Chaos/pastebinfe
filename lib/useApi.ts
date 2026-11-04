import { useEffect, useState } from "react";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: unknown };

/**
 * Runs `load` in the browser whenever `key` changes. Pass `key = null` to wait
 * (e.g. until router.query is ready). The app is a static export, so all API
 * reads happen client-side.
 */
export function useApi<T>(key: string | null, load: () => Promise<T>): ApiState<T> {
  const [state, setState] = useState<{ key: string | null; value: ApiState<T> }>({
    key: null,
    value: { status: "loading" },
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    load().then(
      (data) => !cancelled && setState({ key, value: { status: "success", data } }),
      (error) => !cancelled && setState({ key, value: { status: "error", error } }),
    );
    return () => {
      cancelled = true;
    };
    // `load` is expected to close over the same inputs that `key` encodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Until the effect for the current key has resolved, report loading.
  return state.key === key ? state.value : { status: "loading" };
}

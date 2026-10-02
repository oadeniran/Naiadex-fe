import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `intervalMs` while `active` is true. Stops when active flips
 * false or the component unmounts. `fn` should be stable or wrapped in useCallback.
 */
export function usePolling(fn: () => void, active: boolean, intervalMs = 2500) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!active) return;
    saved.current(); // fire immediately on activation
    const id = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
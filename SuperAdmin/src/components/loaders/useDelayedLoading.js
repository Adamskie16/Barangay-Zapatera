import { useState, useEffect, useRef } from 'react';

/**
 * useDelayedLoading
 * Eliminates jarring 20ms skeleton flashes on fast network queries and Supabase caches.
 * Delays the visible loading state until the query takes longer than `delay` ms (default: 150ms).
 * Once visible, optionally enforces a `minDuration` to avoid rapid UI layout thrashing.
 *
 * @param {boolean} isLoading - Raw loading flag from Supabase/React Query/state
 * @param {number} delay - Debounce delay in ms before showing skeletons (default: 150ms)
 * @param {number} minDuration - Minimum duration in ms the loader remains once displayed (default: 200ms)
 * @returns {boolean} showLoader - Debounced state for rendering skeleton screens
 */
export function useDelayedLoading(isLoading, delay = 150, minDuration = 200) {
  const [showLoader, setShowLoader] = useState(false);
  const showTimeRef = useRef(null);

  useEffect(() => {
    let timer;

    if (isLoading) {
      timer = setTimeout(() => {
        showTimeRef.current = Date.now();
        setShowLoader(true);
      }, delay);
    } else {
      if (showLoader && minDuration > 0 && showTimeRef.current) {
        const elapsed = Date.now() - showTimeRef.current;
        const remaining = Math.max(0, minDuration - elapsed);
        timer = setTimeout(() => {
          setShowLoader(false);
          showTimeRef.current = null;
        }, remaining);
      } else {
        setShowLoader(false);
        showTimeRef.current = null;
      }
    }

    return () => clearTimeout(timer);
  }, [isLoading, delay, minDuration, showLoader]);

  return showLoader;
}

export default useDelayedLoading;

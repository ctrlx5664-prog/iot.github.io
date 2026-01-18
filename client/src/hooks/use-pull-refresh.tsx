import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && containerRef.current?.scrollTop === 0) {
        // Apply resistance to pull
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, maxPull);
        setPullDistance(distance);

        // Prevent default scroll when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    },
    [isPulling, isRefreshing, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
    shouldTrigger: pullDistance >= threshold,
  };
}

// Pull-to-refresh indicator component
export function PullRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center transition-all duration-200"
      style={{
        height: isRefreshing ? 60 : pullDistance,
        opacity: progress,
      }}
    >
      <div
        className={`w-8 h-8 rounded-full border-2 border-cyan-500 flex items-center justify-center ${
          isRefreshing ? "animate-spin" : ""
        }`}
        style={{
          transform: `rotate(${progress * 180}deg)`,
          borderTopColor: shouldTrigger ? "rgb(6, 182, 212)" : "transparent",
          borderRightColor: shouldTrigger ? "rgb(6, 182, 212)" : "transparent",
        }}
      >
        {!isRefreshing && (
          <svg
            className={`w-4 h-4 text-cyan-500 transition-transform ${
              shouldTrigger ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

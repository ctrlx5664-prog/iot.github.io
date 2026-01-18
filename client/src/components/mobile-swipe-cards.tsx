import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeCardsProps {
  children: React.ReactNode[];
  showIndicators?: boolean;
  showArrows?: boolean;
  className?: string;
}

export function SwipeCards({
  children,
  showIndicators = true,
  showArrows = false,
  className,
}: SwipeCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].pageX;
    scrollLeft.current = containerRef.current?.scrollLeft || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.touches[0].pageX;
    const walk = (startX.current - x) * 1.5;
    containerRef.current.scrollLeft = scrollLeft.current + walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    snapToNearestCard();
  };

  const snapToNearestCard = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 16; // card width + gap
    const scrollPos = container.scrollLeft;
    const nearestIndex = Math.round(scrollPos / cardWidth);
    const clampedIndex = Math.max(0, Math.min(nearestIndex, children.length - 1));
    
    container.scrollTo({
      left: clampedIndex * cardWidth,
      behavior: "smooth",
    });
    setCurrentIndex(clampedIndex);
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const cardWidth = containerRef.current.offsetWidth * 0.85 + 16;
    containerRef.current.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const cardWidth = container.offsetWidth * 0.85 + 16;
      const newIndex = Math.round(container.scrollLeft / cardWidth);
      if (newIndex !== currentIndex) {
        setCurrentIndex(Math.max(0, Math.min(newIndex, children.length - 1)));
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex, children.length]);

  return (
    <div className={cn("relative", className)}>
      {/* Cards Container */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[85%] snap-center"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Desktop) */}
      {showArrows && children.length > 1 && (
        <>
          <button
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center border transition-opacity",
              currentIndex === 0 && "opacity-50 cursor-not-allowed"
            )}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollToIndex(Math.min(children.length - 1, currentIndex + 1))}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center border transition-opacity",
              currentIndex === children.length - 1 && "opacity-50 cursor-not-allowed"
            )}
            disabled={currentIndex === children.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && children.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {children.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-cyan-500 w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Quick action chip for mobile
interface QuickActionChipProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "success" | "danger" | "warning";
  disabled?: boolean;
}

export function QuickActionChip({
  icon,
  label,
  onClick,
  variant = "default",
  disabled,
}: QuickActionChipProps) {
  const variants = {
    default: "bg-muted hover:bg-muted/80 text-foreground",
    success: "bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/30",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30",
    warning: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all active:scale-95",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Horizontal scroll for quick actions
export function QuickActionsScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:hidden -mx-4 px-4">
      <div 
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

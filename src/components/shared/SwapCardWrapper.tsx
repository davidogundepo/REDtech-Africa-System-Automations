import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface SwapCardWrapperProps {
  views: { label: string; content: React.ReactNode }[];
  defaultView?: number;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  minHeight?: string;
}

/**
 * SwapCardWrapper — a reusable card that cycles through multiple view options
 * via a small ↻ icon in the top-right corner. Used across all 14 pages of the
 * platform to enable "one landscape screen, no scrolling" layouts.
 */
export const SwapCardWrapper = ({
  views,
  defaultView = 0,
  className = "",
  headerClassName = "",
  contentClassName = "",
  minHeight = "auto",
}: SwapCardWrapperProps) => {
  const [activeIndex, setActiveIndex] = useState(defaultView);

  if (views.length === 0) return null;

  const current = views[activeIndex] || views[0];

  const cycleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % views.length);
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${className}`} style={{ minHeight }}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${headerClassName}`}>
        <CardTitle className="text-sm font-semibold">{current.label}</CardTitle>
        {views.length > 1 && (
          <button
            onClick={cycleView}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 hover:rotate-180"
            title={`Switch view (${activeIndex + 1}/${views.length})`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </CardHeader>
      <CardContent className={`pt-0 ${contentClassName}`}>
        <div className="animate-fade-in-up" key={activeIndex}>
          {current.content}
        </div>
      </CardContent>
    </Card>
  );
};

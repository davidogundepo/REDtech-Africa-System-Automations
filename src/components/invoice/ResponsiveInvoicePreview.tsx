import { useEffect, useRef, useState, ReactNode } from "react";

/**
 * Wraps the fixed-width A4 InvoicePreview (210mm ≈ 794px) and uses
 * transform: scale() to fit any container width responsively.
 * Replaces the non-standard `zoom` CSS property which is broken in Firefox.
 */
const A4_WIDTH_PX = 794;

export function ResponsiveInvoicePreview({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    const recompute = () => {
      const cw = containerRef.current?.clientWidth || 0;
      const next = Math.min(1, Math.max(0.4, (cw - 8) / A4_WIDTH_PX));
      setScale(next);
      const ih = innerRef.current?.scrollHeight || 0;
      setInnerHeight(ih * next);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", recompute);
    return () => { ro.disconnect(); window.removeEventListener("resize", recompute); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-muted p-3 sm:p-4 rounded-2xl border border-border/50 shadow-inner overflow-auto max-h-[calc(100vh-140px)] custom-scrollbar"
    >
      <div style={{ height: innerHeight ? innerHeight + 8 : undefined }}>
        <div
          ref={innerRef}
          style={{
            width: A4_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_65px_-15px_rgba(0,0,0,0.4)] transition-shadow duration-500 rounded-lg overflow-hidden ring-1 ring-border"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

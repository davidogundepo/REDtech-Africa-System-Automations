interface PlatformAttributionProps {
  className?: string;
  withTopBorder?: boolean;
}

export function PlatformAttribution({ className = "", withTopBorder = false }: PlatformAttributionProps) {
  return (
    <div
      className={[
        "flex items-center justify-center gap-1.5",
        "text-[9px] uppercase",
        withTopBorder ? "pt-6 border-t border-border/40" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span className="font-semibold text-muted-foreground/50 tracking-[0.22em]">Built on</span>
      <div className="flex items-center gap-2 font-bold text-muted-foreground/40 tracking-[0.14em]">
        <span>Google</span>
        <span>·</span>
        <span>Vercel</span>
        <span>·</span>
        <span>Supabase</span>
      </div>
    </div>
  );
}

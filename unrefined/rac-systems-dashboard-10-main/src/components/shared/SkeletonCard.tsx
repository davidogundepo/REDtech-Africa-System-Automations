import { cn } from "@/lib/utils";

const Skelton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
);

export const SkeletonStatCards = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4 mb-8`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <Skelton className="h-3 w-24"/>
          <Skelton className="h-5 w-5 rounded-lg"/>
        </div>
        <Skelton className="h-8 w-20 mb-2"/>
        <Skelton className="h-2 w-full rounded-full mb-1"/>
        <Skelton className="h-2.5 w-16"/>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="rounded-xl border border-border overflow-hidden">
    {/* Header */}
    <div className="flex gap-4 px-4 py-3 border-b border-border bg-muted/30">
      {Array.from({ length: cols }).map((_, i) => (
        <Skelton key={i} className="h-3 flex-1"/>
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className={`flex gap-4 px-4 py-3.5 border-b border-border/50 ${r % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skelton key={c} className={`h-3 flex-1 ${c === 0 ? "w-1/3" : ""}`}/>
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonCardList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-3">
        <Skelton className="h-10 w-10 rounded-xl flex-shrink-0"/>
        <div className="flex-1 space-y-2">
          <Skelton className="h-3.5 w-1/2"/>
          <Skelton className="h-2.5 w-3/4"/>
          <div className="flex gap-2 pt-1">
            <Skelton className="h-5 w-16 rounded-full"/>
            <Skelton className="h-5 w-20 rounded-full"/>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonPageHeader = () => (
  <div className="flex items-center justify-between mb-8">
    <div className="space-y-2">
      <Skelton className="h-8 w-48"/>
      <Skelton className="h-3.5 w-64"/>
    </div>
    <div className="flex gap-2">
      <Skelton className="h-9 w-24 rounded-lg"/>
      <Skelton className="h-9 w-32 rounded-lg"/>
    </div>
  </div>
);

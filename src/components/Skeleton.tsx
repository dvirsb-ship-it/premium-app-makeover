import { cn } from "../lib/utils";

/** Shimmering placeholder — pair with the `skeleton` utility. */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden />;
}

/** Ready-made card skeleton mirroring the cases list layout. */
export function CaseCardSkeleton() {
  return (
    <div className="liquid-glass w-full rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-5 w-4/5 rounded-md" />
      <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
      <Skeleton className="mt-4 h-9 w-full rounded-2xl" />
    </div>
  );
}

/** Stack of case-card skeletons. */
export function CaseListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}

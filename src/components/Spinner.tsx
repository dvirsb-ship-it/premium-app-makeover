import { cn } from "../lib/utils";

/** Small gold spinner used inside buttons during async actions. */
export function Spinner({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-block", className)}
      style={{ width: size, height: size }}
    >
      <span
        className="block h-full w-full animate-spin rounded-full border-2 border-current border-t-transparent opacity-90"
        aria-hidden
      />
      <span className="sr-only">Loading…</span>
    </span>
  );
}

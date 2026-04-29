export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder rows are static
          key={i}
          className="h-4 rounded bg-white/10"
          style={{ width: `${60 + ((i * 17) % 30)}%` }}
        />
      ))}
    </div>
  );
}

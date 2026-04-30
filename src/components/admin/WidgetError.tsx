export function WidgetError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-red-200 text-sm">Error: {message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-red-500/50 px-3 py-1 text-red-100 text-xs hover:bg-red-500/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

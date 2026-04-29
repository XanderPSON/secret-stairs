import type { ReactNode } from 'react';

export function WidgetCard({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm ${className}`}
    >
      {title || action ? (
        <header className="mb-4 flex items-center justify-between">
          {title ? (
            <h2 className="font-mono text-white/50 text-xs uppercase tracking-widest">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

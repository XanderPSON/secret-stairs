import type { ReactNode } from 'react';

export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="py-8 text-center text-sm text-white/50">{children}</div>
  );
}

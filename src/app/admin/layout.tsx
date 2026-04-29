import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        background:
          'linear-gradient(135deg, #050A14 0%, #0A1628 100%)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

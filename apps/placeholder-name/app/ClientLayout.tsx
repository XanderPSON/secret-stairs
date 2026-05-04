'use client';

import { PropsWithChildren } from 'react';
import { PortalProvider } from '@cbhq/cds-web/overlays/PortalProvider';
import { ThemeProvider } from '@cbhq/cds-web/system';
import { defaultTheme } from '@cbhq/cds-web/themes/defaultTheme';

export function ClientLayout({ children }: PropsWithChildren) {
  return (
    <PortalProvider>
      <ThemeProvider theme={defaultTheme} activeColorScheme="light">
        {children}
      </ThemeProvider>
    </PortalProvider>
  );
}

import '@cbhq/cds-web/globalStyles';
import '@cbhq/cds-web/defaultFontStyles';
import '@cbhq/cds-icons/fonts/web/icon-font.css';

import { PropsWithChildren } from 'react';

import { ClientLayout } from './ClientLayout';

export const metadata = {
  title: 'App',
  description: 'Your App Description',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

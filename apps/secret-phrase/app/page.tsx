'use client';

import { HeroSquare } from '@cbhq/cds-web/illustrations';
import { VStack } from '@cbhq/cds-web/layout';
import { TextTitle2 } from '@cbhq/cds-web/typography';

export default function Home() {
  return (
    <VStack minHeight="100vh" justifyContent="center" alignItems="center" gap={1}>
      <HeroSquare name="cryptoAndMore" />

      <TextTitle2 as="h1">Welcome to your new app</TextTitle2>
    </VStack>
  );
}

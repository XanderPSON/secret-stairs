'use client';

import { truncateAddress } from '../../lib/admin/format';
import type { Address } from '../../lib/admin/types';

export function AddressLabel({
  address,
  basename,
}: {
  address: Address;
  basename: string | null | undefined;
}) {
  if (basename) {
    return <span title={address}>{basename}</span>;
  }
  return <span title={address}>{truncateAddress(address)}</span>;
}

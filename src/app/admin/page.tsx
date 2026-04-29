import { redirect } from 'next/navigation';
import { DEFAULT_CHAIN_SLUG } from '../../lib/admin/chains';

export default function AdminIndex() {
  redirect(`/admin/${DEFAULT_CHAIN_SLUG}`);
}

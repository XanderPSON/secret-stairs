export function truncateAddress(addr: string): string {
  if (addr.length < 12) {
    return addr;
  }
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function timeAgo(unixSec: number, nowSec: number = Date.now() / 1000): string {
  const diff = Math.max(0, Math.floor(nowSec - unixSec));
  if (diff < 30) {
    return 'just now';
  }
  if (diff < 60 * 60) {
    return `${Math.floor(diff / 60)}m ago`;
  }
  if (diff < 60 * 60 * 24) {
    return `${Math.floor(diff / (60 * 60))}h ago`;
  }
  return `${Math.floor(diff / (60 * 60 * 24))}d ago`;
}

const PT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: false,
});

export function formatPT(unixSec: number): string {
  return PT_FORMATTER.format(new Date(unixSec * 1000));
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatClock(ts: number, withSeconds = true): string {
  const d = new Date(ts);
  const base = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86_400_000).toDateString() === d.toDateString();
  const day = sameDay ? "Today" : yesterday ? "Yesterday" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${formatClock(ts, false)}`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

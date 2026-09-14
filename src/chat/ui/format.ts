/** Presentation-only formatting for chat timestamps. */

const DAY_MS = 24 * 60 * 60 * 1000;

function timeOf(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return timeOf(value);
}

export function formatActivityTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const elapsed = Date.now() - date.getTime();
  if (elapsed < DAY_MS) return timeOf(value);
  if (elapsed < 7 * DAY_MS) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const isSameDay = date.toDateString() === today.toDateString();
  if (isSameDay) return 'Today';

  const yesterday = new Date(today.getTime() - DAY_MS);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

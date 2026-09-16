// Priority level color helpers
export const PRIORITY_COLORS = {
  P0: { bg: 'bg-red-900/30', border: 'border-red-500', text: 'text-red-400', badge: '#ef4444', label: 'P0 — CRITICAL' },
  P1: { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-400', badge: '#f97316', label: 'P1 — SERIOUS' },
  P2: { bg: 'bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-400', badge: '#eab308', label: 'P2 — SIGNIFICANT' },
  P3: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-400', badge: '#3b82f6', label: 'P3 — LOWER URGENCY' },
};

export const STATUS_COLORS = {
  REPORTED: 'text-gray-400',
  CLASSIFIED: 'text-blue-400',
  PRIORITIZED: 'text-purple-400',
  AWAITING_APPROVAL: 'text-yellow-400',
  ASSIGNED: 'text-orange-400',
  DISPATCHED: 'text-orange-300',
  RESPONDING: 'text-green-400',
  ON_SCENE: 'text-emerald-400',
  RESOLVED: 'text-gray-400',
  CLOSED: 'text-gray-600',
};

export const INCIDENT_TYPE_ICONS = {
  FIRE_SMOKE: '🔥',
  MEDICAL: '🏥',
  CHEMICAL: '⚗️',
  SECURITY_THREAT: '🔐',
  ELECTRICAL: '⚡',
  VIOLENCE_CROWD: '👥',
  UNKNOWN: '❓',
};

export const CAPABILITY_LABELS = {
  medical: 'Medical',
  fire: 'Fire',
  hazmat: 'Hazmat',
  security: 'Security',
  isolation: 'Isolation',
  facilities: 'Facilities',
};

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(dt));
}

export function timeAgo(dt) {
  if (!dt) return '';
  const seconds = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

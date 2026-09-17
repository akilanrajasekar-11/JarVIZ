// Priority level color helpers - Editorial Palette
export const PRIORITY_COLORS = {
  P0: { bg: 'bg-red-900/10', border: 'border-red-600', text: 'text-red-700', badge: '#dc2626', label: 'P0 — CRITICAL' },
  P1: { bg: 'bg-amber-900/10', border: 'border-amber-600', text: 'text-amber-700', badge: '#ea580c', label: 'P1 — SERIOUS' },
  P2: { bg: 'bg-yellow-900/10', border: 'border-yellow-600', text: 'text-yellow-700', badge: '#D4AF37', label: 'P2 — SIGNIFICANT' },
  P3: { bg: 'bg-blue-900/10', border: 'border-blue-800', text: 'text-blue-900', badge: '#1F3A5F', label: 'P3 — LOWER URGENCY' },
};

export const STATUS_COLORS = {
  REPORTED: 'text-stone-500',
  CLASSIFIED: 'text-blue-800',
  PRIORITIZED: 'text-amber-700',
  AWAITING_APPROVAL: 'text-amber-600',
  ASSIGNED: 'text-stone-700',
  DISPATCHED: 'text-blue-900',
  RESPONDING: 'text-emerald-700',
  ON_SCENE: 'text-emerald-800',
  RESOLVED: 'text-stone-500',
  CLOSED: 'text-stone-400',
};

export const INCIDENT_TYPE_ICONS = {
  FIRE_SMOKE: 'Flame',
  MEDICAL: 'Activity',
  CHEMICAL: 'FlaskConical',
  SECURITY_THREAT: 'ShieldAlert',
  ELECTRICAL: 'Zap',
  VIOLENCE_CROWD: 'Users',
  UNKNOWN: 'AlertTriangle',
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

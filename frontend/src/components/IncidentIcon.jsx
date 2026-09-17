import {
  Flame,
  Activity,
  FlaskConical,
  ShieldAlert,
  Zap,
  Users,
  AlertTriangle,
} from 'lucide-react';

const ICON_MAP = {
  FIRE_SMOKE: Flame,
  MEDICAL: Activity,
  CHEMICAL: FlaskConical,
  SECURITY_THREAT: ShieldAlert,
  ELECTRICAL: Zap,
  VIOLENCE_CROWD: Users,
  UNKNOWN: AlertTriangle,
};

export default function IncidentIcon({ type, size = 16, className = '', style = {} }) {
  const IconComponent = ICON_MAP[type] || AlertTriangle;
  return <IconComponent size={size} className={className} style={{ flexShrink: 0, ...style }} />;
}

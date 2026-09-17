import { PRIORITY_COLORS, timeAgo } from '../utils/constants';
import IncidentIcon from './IncidentIcon';
import { MapPin, Users } from 'lucide-react';

export default function IncidentCard({ incident, onClick }) {
  const p = incident.priority?.toLowerCase() || 'p3';
  const colors = PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.P3;

  return (
    <div className={`incident-card ${p}`} onClick={() => onClick?.(incident)} role="button" tabIndex={0}>
      <div className="incident-card-header">
        <div style={{ color: colors.badge, display: 'flex', alignItems: 'center' }}>
          <IncidentIcon type={incident.incident_type} size={20} />
        </div>
        <span className="incident-type">{incident.incident_type_display || incident.incident_type}</span>
        <span className={`priority-badge ${p}`}>{incident.priority}</span>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          color: colors.badge,
          letterSpacing: '-0.02em',
        }}>
          {Math.round(incident.risk_score)}
        </span>
      </div>

      <div className="incident-meta">
        <span className="meta-item">
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {incident.location_display || incident.location}
        </span>
        <span className="meta-item">
          <Users size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {incident.people_exposed} exposed
        </span>
        <span className="meta-item">
          <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {incident.status_display || incident.status}
          </span>
        </span>
        {incident.separation_tasks?.length > 0 && (
          <span className="meta-item" style={{
            color: 'var(--navy)',
            background: 'rgba(31,58,95,0.06)',
            padding: '0.1rem 0.4rem',
            border: '1px solid rgba(31,58,95,0.2)',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}>
            🚧 {incident.separation_tasks.filter(t => t.status === 'COMPLETED').length}/{incident.separation_tasks.length} Cordon/Tasks
          </span>
        )}
        <span className="meta-item" style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
          {timeAgo(incident.created_at)}
        </span>
      </div>

      <div className="risk-bar-wrap">
        <div className="risk-bar-bg">
          <div
            className="risk-bar-fill"
            style={{
              width: `${incident.risk_score}%`,
              background: colors.badge,
            }}
          />
        </div>
      </div>

      {incident.required_capabilities?.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
          {incident.required_capabilities.map((cap) => (
            <span key={cap} className={`capability-tag ${cap}`}>{cap}</span>
          ))}
        </div>
      )}
    </div>
  );
}

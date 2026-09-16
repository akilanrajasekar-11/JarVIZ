import { PRIORITY_COLORS, STATUS_COLORS, INCIDENT_TYPE_ICONS, timeAgo } from '../utils/constants';

export default function IncidentCard({ incident, onClick }) {
  const p = incident.priority?.toLowerCase() || 'p3';
  const colors = PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.P3;
  const icon = INCIDENT_TYPE_ICONS[incident.incident_type] || '❓';
  const statusColor = STATUS_COLORS[incident.status] || 'text-gray-400';

  return (
    <div className={`incident-card ${p}`} onClick={() => onClick?.(incident)} role="button" tabIndex={0}>
      <div className="incident-card-header">
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <span className="incident-type">{incident.incident_type_display || incident.incident_type}</span>
        <span className={`priority-badge ${p}`}>{incident.priority}</span>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: colors.badge }}>
          {Math.round(incident.risk_score)}
        </span>
      </div>

      <div className="incident-meta">
        <span className="meta-item">📍 {incident.location_display || incident.location}</span>
        <span className="meta-item">👥 {incident.people_exposed} exposed</span>
        <span className={`meta-item status-badge ${statusColor}`} style={{ color: undefined }}>
          <span className={statusColor}>{incident.status_display || incident.status}</span>
        </span>
        <span className="meta-item" style={{ marginLeft: 'auto' }}>{timeAgo(incident.created_at)}</span>
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
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
          {incident.required_capabilities.map((cap) => (
            <span key={cap} className={`capability-tag ${cap}`}>{cap}</span>
          ))}
        </div>
      )}
    </div>
  );
}

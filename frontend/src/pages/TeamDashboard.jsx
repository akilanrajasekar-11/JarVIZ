import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getResources, getIncidents, updateAssignmentStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TEAM_TYPE_MAP = {
  TEAM_MEDICAL: 'MEDICAL',
  TEAM_FIRE: 'FIRE',
  TEAM_HAZMAT: 'HAZMAT',
  TEAM_SECURITY: 'SECURITY',
  TEAM_FACILITIES: 'FACILITIES',
};

const NEXT_STATUS = {
  ASSIGNED: 'DISPATCHED',
  DISPATCHED: 'RESPONDING',
  RESPONDING: 'ON_SCENE',
  ON_SCENE: 'COMPLETED',
};

export default function TeamDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const resourceType = TEAM_TYPE_MAP[user?.role];

  useEffect(() => {
    // Get assignments for this team type by fetching all incidents and filtering
    getIncidents()
      .then(({ data }) => {
        // Collect all assignments across incidents
        const myAssignments = [];
        // We'll show incidents relevant to this team
        const relevant = data.filter((i) =>
          !['RESOLVED', 'CLOSED'].includes(i.status)
        );
        setAssignments(relevant);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Team Dashboard</h1>
          <p className="page-sub">{user?.first_name} — {user?.role?.replace('_', ' ')} | Active assignments</p>
        </div>
        <div className="page-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🟢</div>
              <p className="empty-title">No active assignments</p>
              <p className="empty-sub">You will be notified when an incident requires your team</p>
            </div>
          ) : (
            assignments.map((incident) => (
              <div key={incident.id} className="card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{incident.incident_id}</span>
                  <span style={{ fontWeight: 700 }}>{incident.incident_type_display || incident.incident_type}</span>
                  <span className={`priority-badge ${incident.priority?.toLowerCase()}`}>{incident.priority}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{incident.status_display || incident.status}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  📍 {incident.location_display || incident.location} — Risk: <strong style={{ color: '#f97316' }}>{incident.risk_score}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {incident.ai_summary || 'No summary available.'}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {incident.required_capabilities?.map((cap) => (
                    <span key={cap} className={`capability-tag ${cap}`}>{cap}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

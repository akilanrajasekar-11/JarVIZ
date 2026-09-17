import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getMyReports } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, MapPin, Plus } from 'lucide-react';

export default function ReporterDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyReports()
      .then(({ data }) => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">
            Welcome, {user?.first_name || user?.username}
          </h1>
          <p className="page-sub">Track your submitted emergency reports</p>
        </div>
        <div className="page-body">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Reports Submitted</div>
              <div className="stat-value">{reports.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Reports</div>
              <div className="stat-value success">
                {reports.filter((r) => r.incident_id).length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
            }}>
              Your Reports
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/reporter/report')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={14} /> Report Emergency
            </button>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : reports.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                <FileText size={36} strokeWidth={1.5} />
              </div>
              <p className="empty-title">No reports submitted yet</p>
              <p className="empty-sub">If you see an emergency, please report it immediately</p>
              <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/reporter/report')}>
                Report an Emergency
              </button>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      marginBottom: '0.3rem',
                      letterSpacing: '-0.01em',
                    }}>
                      {report.description?.slice(0, 100)}{report.description?.length > 100 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={13} style={{ flexShrink: 0 }} />
                      {report.location} {report.location_detail && `— ${report.location_detail}`}
                    </div>
                  </div>
                  {report.incident_id && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: '0',
                      padding: '0.2rem 0.5rem',
                    }}>
                      {report.incident_id}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  Submitted: {new Date(report.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

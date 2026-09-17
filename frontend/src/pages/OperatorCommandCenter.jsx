import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import OperatorReportsBoard from '../components/OperatorReportsBoard';
import { getAllReports } from '../services/api';
import { incidentSocket } from '../services/websocket';
import { RotateCw, Compass } from 'lucide-react';

export default function OperatorCommandCenter() {
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      const { data } = await getAllReports();
      setReports(data);
    } catch (e) {
      console.error('Failed to fetch reports for operator dashboard:', e);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    // Connect WebSocket for live updates
    incidentSocket.connect();
    setWsConnected(true);

    const unsub = incidentSocket.subscribe((msg) => {
      if (msg.type === 'incident_update' || msg.type === 'report_update') {
        setLastUpdate(new Date());
        fetchReports();
      }
    });

    return () => { unsub(); };
  }, [fetchReports]);

  const activeReports = reports.filter(
    (r) => r.status !== 'RESOLVED' && r.status !== 'DISMISSED'
  );
  const resolvedReportsCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const readyToResolveReportsCount = reports.filter(
    (r) => r.can_resolve || r.status === 'SECURITY_APPROVED'
  ).length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 className="page-title">Report Dashboard</h1>
              <p className="page-sub">Live emergency reports monitoring, triage & operational resolution</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {wsConnected && <span className="live-dot">Live</span>}
              {lastUpdate && (
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.05em',
                }}>
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={fetchReports}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCw size={12} /> Refresh
              </button>
              <button
                className="btn btn-sm"
                onClick={() => navigate('/operator/map')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'var(--navy)',
                  color: '#FFFFFF',
                  borderColor: 'var(--navy)',
                  fontWeight: 600,
                }}
              >
                <Compass size={13} color="var(--gold)" /> Live Tactical Map
              </button>
            </div>
          </div>
        </div>

        <div className="page-body">
          {/* Top Operational Stats */}
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-label">All Reports</div>
              <div className="stat-value">{reports.length}</div>
              <div className="stat-sub">{resolvedReportsCount} resolved logs</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #dc2626' }}>
              <div className="stat-label">Active Reports</div>
              <div className={`stat-value ${activeReports.length ? 'critical' : ''}`}>{activeReports.length}</div>
              <div className="stat-sub">
                {readyToResolveReportsCount} verified ready to resolve
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #16a34a' }}>
              <div className="stat-label">Ready to Resolve</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>{readyToResolveReportsCount}</div>
              <div className="stat-sub">Verified by security team</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #64748b' }}>
              <div className="stat-label">Resolved / Closed</div>
              <div className="stat-value" style={{ color: '#64748b' }}>{resolvedReportsCount}</div>
              <div className="stat-sub">Completed operational logs</div>
            </div>
          </div>

          {/* Emergency Reports Board */}
          <OperatorReportsBoard
            reports={reports}
            loading={reportsLoading}
            onRefresh={fetchReports}
          />
        </div>
      </main>
    </div>
  );
}

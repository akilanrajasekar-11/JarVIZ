import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import IncidentCard from '../components/IncidentCard';
import { getIncidents } from '../services/api';
import { incidentSocket } from '../services/websocket';

export default function OperatorCommandCenter() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const navigate = useNavigate();

  const fetchIncidents = useCallback(async () => {
    try {
      const { data } = await getIncidents();
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();

    // Connect WebSocket for live updates
    incidentSocket.connect();
    setWsConnected(true);

    const unsub = incidentSocket.subscribe((msg) => {
      if (msg.type === 'incident_update') {
        setLastUpdate(new Date());
        setIncidents((prev) => {
          const idx = prev.findIndex((i) => i.id === msg.incident.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = msg.incident;
            return updated.sort((a, b) => b.risk_score - a.risk_score);
          }
          return [msg.incident, ...prev].sort((a, b) => b.risk_score - a.risk_score);
        });
      }
    });

    return () => { unsub(); };
  }, [fetchIncidents]);

  const p0 = incidents.filter((i) => i.priority === 'P0');
  const p1 = incidents.filter((i) => i.priority === 'P1');
  const p2 = incidents.filter((i) => i.priority === 'P2');
  const p3 = incidents.filter((i) => i.priority === 'P3');
  const awaiting = incidents.filter((i) => i.status === 'AWAITING_APPROVAL');

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 className="page-title">Command Center</h1>
              <p className="page-sub">Live priority queue — ranked by contextual risk score</p>
            </div>
            <div style={{ display: 'flex', align: 'center', gap: '1rem' }}>
              {wsConnected && <span className="live-dot">LIVE</span>}
              {lastUpdate && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button className="btn btn-secondary btn-sm" onClick={fetchIncidents}>↻ Refresh</button>
            </div>
          </div>
        </div>

        <div className="page-body">
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">P0 Critical</div>
              <div className={`stat-value ${p0.length ? 'critical' : ''}`}>{p0.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">P1 Serious</div>
              <div className={`stat-value ${p1.length ? 'warning' : ''}`}>{p1.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Incidents</div>
              <div className="stat-value">{incidents.filter(i => !['RESOLVED','CLOSED'].includes(i.status)).length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Awaiting Approval</div>
              <div className={`stat-value ${awaiting.length ? 'warning' : 'success'}`}>{awaiting.length}</div>
              <div className="stat-sub">Needs your action</div>
            </div>
          </div>

          {/* Priority Queue */}
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p className="empty-title">All clear</p>
              <p className="empty-sub">No active incidents on campus</p>
            </div>
          ) : (
            <>
              {awaiting.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    ⚠️ Awaiting Your Approval ({awaiting.length})
                  </div>
                  {awaiting.map((inc) => (
                    <IncidentCard key={inc.id} incident={inc} onClick={(i) => navigate(`/operator/incidents/${i.id}`)} />
                  ))}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                All Incidents — Priority Queue
              </div>
              {incidents.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} onClick={(i) => navigate(`/operator/incidents/${i.id}`)} />
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

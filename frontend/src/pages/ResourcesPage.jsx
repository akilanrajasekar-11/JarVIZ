import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getResources } from '../services/api';
import { Phone, ExternalLink } from 'lucide-react';

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResources()
      .then(({ data }) => setResources(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const byType = resources.reduce((acc, r) => {
    if (!acc[r.resource_type]) acc[r.resource_type] = [];
    acc[r.resource_type].push(r);
    return acc;
  }, {});

  const totalAvailable = resources.filter((r) => r.status === 'AVAILABLE').length;
  const totalBusy = resources.filter((r) => r.status === 'BUSY').length;
  const totalOffline = resources.filter((r) => r.status === 'OFFLINE').length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '0.35rem' }}>
                Inventory & Readiness
              </div>
              <h1 className="page-title">Response Units</h1>
              <p className="page-sub">Campus emergency response detachments and real-time operational status</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-dot">Telemetry Active</span>
            </div>
          </div>
        </div>

        <div className="page-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Units</div>
                  <div className="stat-value">{resources.length}</div>
                  <div className="stat-sub">Registered campus response teams</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Deployable Now</div>
                  <div className="stat-value success">{totalAvailable}</div>
                  <div className="stat-sub">Ready for immediate dispatch</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Engaged on Scene</div>
                  <div className="stat-value warning">{totalBusy}</div>
                  <div className="stat-sub">Assigned to active incidents</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Standby / Off-Duty</div>
                  <div className="stat-value">{totalOffline}</div>
                  <div className="stat-sub">Not currently in operational rotation</div>
                </div>
              </div>

              {/* Resource Categories */}
              {Object.entries(byType).map(([type, res]) => (
                <div key={type} style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                      {type.replace('_', ' ')}
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {res.filter((r) => r.status === 'AVAILABLE').length}/{res.length} READY
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {res.map((r) => (
                      <div key={r.id} className="resource-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div className="resource-name">{r.name}</div>
                          <span className={`resource-status ${r.status?.toLowerCase()}`} style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.68rem', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '6px', height: '6px', background: r.status === 'AVAILABLE' ? '#16a34a' : r.status === 'BUSY' ? '#ea580c' : 'var(--text-muted)', display: 'inline-block' }} />
                            {r.status === 'AVAILABLE' ? 'Available' : r.status === 'BUSY' ? 'Active' : 'Standby'}
                          </span>
                        </div>
                        <div className="resource-type-tag">
                          {r.type_display} · {r.location}
                        </div>
                        {r.contact && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                            {r.contact}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                          {r.capabilities?.map((cap) => (
                            <span key={cap} className={`capability-tag ${cap}`}>{cap}</span>
                          ))}
                        </div>

                        {r.active_assignment && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.45rem 0.65rem',
                            background: 'rgba(31, 58, 95, 0.08)',
                            border: '1px solid rgba(31, 58, 95, 0.18)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.72rem',
                          }}>
                            <span style={{ color: 'var(--text-primary)' }}>
                              Mission: <strong>{r.active_assignment.incident_id}</strong>
                            </span>
                            <Link
                              to={`/incidents/${r.active_assignment.incident_pk}`}
                              style={{
                                color: 'var(--gold)',
                                textDecoration: 'none',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                            >
                              Manage <ExternalLink size={10} />
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            </>
          )}
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getResources } from '../services/api';

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResources().then(({ data }) => setResources(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const byType = resources.reduce((acc, r) => {
    if (!acc[r.resource_type]) acc[r.resource_type] = [];
    acc[r.resource_type].push(r);
    return acc;
  }, {});

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Response Resources</h1>
          <p className="page-sub">All campus response teams and their current availability</p>
        </div>
        <div className="page-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            Object.entries(byType).map(([type, res]) => (
              <div key={type} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  {type.replace('_', ' ')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {res.map((r) => (
                    <div key={r.id} className="resource-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="resource-name">{r.name}</div>
                        <span className={`resource-status ${r.status?.toLowerCase()}`}>
                          {r.status === 'AVAILABLE' ? '● Available' : r.status === 'BUSY' ? '● On Assignment' : '○ Offline'}
                        </span>
                      </div>
                      <div className="resource-type-tag">{r.type_display} — {r.location}</div>
                      {r.contact && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 {r.contact}</div>}
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {r.capabilities?.map((cap) => (
                          <span key={cap} className={`capability-tag ${cap}`}>{cap}</span>
                        ))}
                      </div>
                    </div>
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

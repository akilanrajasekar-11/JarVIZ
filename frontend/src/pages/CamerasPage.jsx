import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getCameras, getCctvEvents } from '../services/api';
import { formatDateTime } from '../utils/constants';

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCameras(), getCctvEvents()])
      .then(([camRes, evRes]) => { setCameras(camRes.data); setEvents(evRes.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">CCTV Feed</h1>
          <p className="page-sub">Campus camera network and recent detection events</p>
        </div>
        <div className="page-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
              {/* Camera Grid */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  Camera Network — {cameras.filter(c => c.status === 'ONLINE').length} / {cameras.length} Online
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {cameras.map((cam) => (
                    <div key={cam.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                      <div style={{ background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>📹</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#fff' }}>{cam.name}</div>
                        </div>
                        <div style={{
                          position: 'absolute', top: '0.5rem', right: '0.5rem',
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: cam.status === 'ONLINE' ? '#22c55e' : '#ef4444',
                          boxShadow: cam.status === 'ONLINE' ? '0 0 6px #22c55e' : 'none',
                        }} />
                      </div>
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cam.coverage_description}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{cam.location_block?.replace('_', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  Recent Detection Events
                </div>
                {events.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <div className="empty-icon">👁️</div>
                    <p className="empty-title">No events detected</p>
                    <p className="empty-sub">Detection events will appear here</p>
                  </div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="cctv-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <div className="cctv-cam">{ev.camera_name}</div>
                          <div className="cctv-event-type">{ev.event_type_display}</div>
                        </div>
                        <div className="cctv-desc">{ev.description}</div>
                        <div className="cctv-time">{formatDateTime(ev.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

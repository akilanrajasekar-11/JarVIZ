import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getCameras, getCctvEvents } from '../services/api';
import { formatDateTime } from '../utils/constants';
import { Video, Eye } from 'lucide-react';

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCameras(), getCctvEvents()])
      .then(([camRes, evRes]) => {
        setCameras(camRes.data);
        setEvents(evRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '0.35rem' }}>
                Surveillance Grid
              </div>
              <h1 className="page-title">Optical Surveillance</h1>
              <p className="page-sub">Direct feeds from campus security points and automated visual hazard detection</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-dot">Network Synced</span>
            </div>
          </div>
        </div>

        <div className="page-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
              {/* Camera Grid */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                    Active Cameras ({onlineCount} / {cameras.length} Online)
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {cameras.map((cam) => (
                    <div key={cam.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                      {/* Video Monitor Frame */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #101c2c 0%, #1F3A5F 100%)',
                          aspectRatio: '16/9',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {/* Live recording indicator */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '0.75rem',
                            left: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '0.2rem 0.5rem',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.65rem',
                            color: '#fff',
                            letterSpacing: '0.1em',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              background: cam.status === 'ONLINE' ? '#22c55e' : '#ef4444',
                              display: 'inline-block',
                            }}
                          />
                          {cam.status === 'ONLINE' ? 'REC' : 'OFF'}
                        </div>

                        {/* Camera Name watermark */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0.5rem',
                            right: '0.75rem',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.65rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          {cam.ip_address || 'SEC-NET-01'}
                        </div>

                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Video size={26} style={{ marginBottom: '0.35rem', opacity: 0.85 }} />
                          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
                            {cam.name}
                          </div>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '1rem' }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {cam.coverage_description}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          ZONE: {cam.location_block?.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events Column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                    Detection Telemetry
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                {events.length === 0 ? (
                  <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                      <Eye size={36} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                      No Automated Alerts
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Computer vision monitors report standard baseline conditions across all active feeds.
                    </div>
                  </div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="cctv-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                          <div className="cctv-cam">{ev.camera_name}</div>
                          <div
                            style={{
                              fontFamily: 'Outfit, sans-serif',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: 'var(--gold)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.15em',
                            }}
                          >
                            {ev.event_type_display}
                          </div>
                        </div>
                        <div className="cctv-desc" style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                          {ev.description}
                        </div>
                        <div className="cctv-time" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          {formatDateTime(ev.timestamp)}
                        </div>
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

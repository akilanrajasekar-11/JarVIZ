import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CampusTacticalMap from '../components/CampusTacticalMap';
import {
  getIncidents,
  getCameras,
  getResources,
  getAllSeparationTasks,
} from '../services/api';
import { incidentSocket } from '../services/websocket';
import {
  AlertTriangle,
  Video,
  Truck,
  RotateCw,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { CAMPUS_LOCATIONS } from '../utils/campusData';

export default function TacticalMapPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [resources, setResources] = useState([]);
  const [separationTasks, setSeparationTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Inspection Drawer State
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [incRes, camRes, resRes, sepRes] = await Promise.all([
        getIncidents().catch(() => ({ data: [] })),
        getCameras().catch(() => ({ data: [] })),
        getResources().catch(() => ({ data: [] })),
        getAllSeparationTasks().catch(() => ({ data: [] })),
      ]);
      setIncidents(incRes.data?.results || incRes.data || []);
      setCameras(camRes.data?.results || camRes.data || []);
      setResources(resRes.data?.results || resRes.data || []);
      setSeparationTasks(sepRes.data?.results || sepRes.data || []);
    } catch (err) {
      console.error('Failed to fetch tactical map data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    incidentSocket.connect();
    const unsub = incidentSocket.subscribe((msg) => {
      if (['incident_created', 'incident_updated', 'risk_updated', 'dispatch_assigned'].includes(msg.type)) {
        fetchData();
      }
    });
    return () => unsub();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectLocation = (loc, activeIncs) => {
    setSelectedCamera(null);
    setSelectedLocation({ ...loc, activeIncidents: activeIncs });
  };

  const handleSelectCamera = (camName, camMeta) => {
    setSelectedLocation(null);
    setSelectedCamera({ name: camName, ...camMeta });
  };

  // Stats
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const criticalCount = activeIncidents.filter((i) => i.priority === 'P0').length;
  const seriousCount = activeIncidents.filter((i) => i.priority === 'P1').length;

  return (
    <div className="app-shell">
      <Sidebar />

      <main
        className="main-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#0c0e12',
        }}
      >
        {/* Editorial Tactical Header Bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.9rem 1.5rem',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="label-uppercase" style={{ color: 'var(--gold)' }}>
                  SPATIAL INTELLIGENCE
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: '#10B981',
                    fontWeight: 600,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  ONLINE
                </span>
              </div>
              <h1 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                Campus Tactical Digital Twin
              </h1>
            </div>

            {/* Quick Metrics Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.65rem',
                  background: activeIncidents.length > 0 ? 'rgba(220,38,38,0.12)' : 'rgba(44,44,44,0.06)',
                  border: `1px solid ${activeIncidents.length > 0 ? 'rgba(220,38,38,0.3)' : 'var(--border)'}`,
                  fontSize: '0.75rem',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <AlertTriangle size={13} color={activeIncidents.length > 0 ? '#DC2626' : '#888'} />
                <span>
                  <strong>{activeIncidents.length}</strong> ACTIVE EMERGENCIES{' '}
                  {criticalCount > 0 && <span style={{ color: '#DC2626' }}>({criticalCount} P0)</span>}
                  {seriousCount > 0 && <span style={{ color: '#EA580C', marginLeft: '0.2rem' }}>({seriousCount} P1)</span>}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.65rem',
                  background: 'rgba(56,189,248,0.1)',
                  border: '1px solid rgba(56,189,248,0.25)',
                  fontSize: '0.75rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#0284C7',
                }}
              >
                <Video size={13} />
                <span>10 CCTV CAMERAS LINKED</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.65rem',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  fontSize: '0.75rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#059669',
                }}
              >
                <Truck size={13} />
                <span>7 DISPATCH UNITS STANDBY</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={handleRefresh}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                padding: '0.4rem 0.75rem',
              }}
              title="Refresh Tactical Telemetry"
            >
              <RotateCw size={13} className={refreshing ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {/* Map Container Area */}
        <div style={{ position: 'relative', flex: 1, width: '100%', overflow: 'hidden' }}>
          <CampusTacticalMap
            incidents={incidents}
            cameras={cameras}
            resources={resources}
            separationTasks={separationTasks}
            onSelectLocation={handleSelectLocation}
            onSelectCamera={handleSelectCamera}
            customHeight="100%"
          />

          {/* =======================================================
              SLIDING INSPECTOR DRAWER: BUILDING
             ======================================================= */}
          {selectedLocation && (
            <div className="tactical-inspector">
              <div className="inspector-header">
                <div>
                  <span
                    className="label-uppercase"
                    style={{ fontSize: '0.65rem', color: selectedLocation.color || 'var(--gold)' }}
                  >
                    {selectedLocation.category} ZONE
                  </span>
                  <h2 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0 0', color: '#FFFFFF' }}>
                    {selectedLocation.name}
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{selectedLocation.subtitle}</div>
                </div>
                <button
                  className="hud-action-btn"
                  onClick={() => setSelectedLocation(null)}
                  title="Close Inspector"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="inspector-body">
                {/* Hazard Level & Occupancy Info Card */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>
                        Typical Occupancy
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#E2E8F0', marginTop: '0.15rem' }}>
                        {selectedLocation.occupancy}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>
                        Inherent Hazard
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: selectedLocation.hazardRating === 'HIGH' ? '#EF4444' : '#10B981',
                          marginTop: '0.15rem',
                        }}
                      >
                        {selectedLocation.hazardRating} RATING
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.7rem', fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                    {selectedLocation.description}
                  </div>
                </div>

                {/* Active Incidents Section */}
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      letterSpacing: '0.1em',
                      color: 'var(--gold)',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <AlertTriangle size={13} />
                    Active Incidents in Zone ({selectedLocation.activeIncidents?.length || 0})
                  </div>

                  {(!selectedLocation.activeIncidents || selectedLocation.activeIncidents.length === 0) ? (
                    <div
                      style={{
                        padding: '0.8rem',
                        background: 'rgba(16,185,129,0.06)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        color: '#10B981',
                        fontSize: '0.75rem',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      ✓ ZONE SECURE — NO ACTIVE INCIDENTS REPORTED
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedLocation.activeIncidents.map((inc) => (
                        <div
                          key={inc.id}
                          style={{
                            background: 'rgba(220,38,38,0.1)',
                            border: '1px solid rgba(220,38,38,0.3)',
                            padding: '0.75rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/operator/incidents/${inc.id}`)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                color: '#EF4444',
                              }}
                            >
                              {inc.incident_id || `INC-${inc.id}`}
                            </span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                background: '#DC2626',
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {inc.priority} ({Math.round(inc.risk_score || 0)})
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#F8FAFC', margin: '0.3rem 0' }}>
                            {inc.incident_type?.replace(/_/g, ' ')}
                          </div>

                          <div style={{ fontSize: '0.7rem', color: '#CBD5E1', marginBottom: '0.4rem' }}>
                            {inc.ai_summary || inc.location_detail || 'Active emergency in progress'}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.65rem',
                              color: 'var(--gold)',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            <span>STATUS: {inc.status}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              Open Incident Dossier <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CCTV Cameras in this Location */}
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      letterSpacing: '0.1em',
                      color: '#38BDF8',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Video size={13} />
                    Associated CCTV Feeds ({selectedLocation.cameras?.length || 0})
                  </div>

                  {selectedLocation.cameras?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {selectedLocation.cameras.map((camId) => (
                        <div
                          key={camId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#10B981',
                              }}
                            />
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38BDF8' }}>
                              {camId}
                            </span>
                          </div>
                          <button
                            onClick={() => navigate('/operator/cameras')}
                            style={{
                              fontSize: '0.65rem',
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            Live Feed <ExternalLink size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      No direct fixed CCTV nodes assigned to this block.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}
                    onClick={() => navigate('/operator')}
                  >
                    Return to Command Center Queue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              SLIDING INSPECTOR DRAWER: CAMERA
             ======================================================= */}
          {selectedCamera && (
            <div className="tactical-inspector">
              <div className="inspector-header">
                <div>
                  <span className="label-uppercase" style={{ fontSize: '0.65rem', color: '#38BDF8' }}>
                    CCTV SURVEILLANCE NODE
                  </span>
                  <h2 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0 0', color: '#FFFFFF' }}>
                    {selectedCamera.name}
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{selectedCamera.label}</div>
                </div>
                <button
                  className="hud-action-btn"
                  onClick={() => setSelectedCamera(null)}
                  title="Close Inspector"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="inspector-body">
                {/* Simulated CCTV Camera Viewport */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '200px',
                    background: '#0a0d11',
                    border: '1px solid rgba(56,189,248,0.3)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '0.6rem',
                  }}
                >
                  {/* Scanline overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 51%)',
                      backgroundSize: '100% 4px',
                      pointerEvents: 'none',
                      opacity: 0.6,
                    }}
                  />

                  {/* Top HUD */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.65rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#10B981',
                      zIndex: 2,
                    }}
                  >
                    <span>● REC LIVE [FPS: 30]</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>

                  {/* Center simulated target box */}
                  <div
                    style={{
                      alignSelf: 'center',
                      border: '1px dashed rgba(56,189,248,0.6)',
                      padding: '1.2rem 2rem',
                      textAlign: 'center',
                      zIndex: 2,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>
                      SECTOR: {selectedCamera.block}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '0.2rem' }}>
                      AI MOTION DETECTION: NORMAL
                    </div>
                  </div>

                  {/* Bottom HUD */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.6rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#94A3B8',
                      zIndex: 2,
                    }}
                  >
                    <span>RTSP://NODE-0{selectedCamera.name.slice(-1)}</span>
                    <span>FOV: {selectedCamera.fov}° ARC</span>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '0.85rem',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                    color: '#CBD5E1',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Location: </strong>
                    {CAMPUS_LOCATIONS[selectedCamera.block]?.name || selectedCamera.block}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Coverage: </strong>
                    {selectedCamera.label}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Optical Sweep: </strong>
                    {selectedCamera.angle}° Heading, {selectedCamera.reach}m Range
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.75rem', justifyContent: 'center' }}
                  onClick={() => navigate('/operator/cameras')}
                >
                  Open Full CCTV Video Matrix
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

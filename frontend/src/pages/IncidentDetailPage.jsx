import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Timeline from '../components/Timeline';
import RiskBreakdown from '../components/RiskBreakdown';
import {
  getIncident,
  getIncidentCameras,
  getRecommendation,
  approveIncident,
} from '../services/api';
import { INCIDENT_TYPE_ICONS, PRIORITY_COLORS, CAPABILITY_LABELS, formatDateTime } from '../utils/constants';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const [incRes, camRes, recRes] = await Promise.all([
          getIncident(id),
          getIncidentCameras(id),
          getRecommendation(id),
        ]);
        setIncident(incRes.data);
        setCameras(camRes.data);
        setRecommendation(recRes.data);
        if (recRes.data?.recommendation) {
          setSelectedResources([recRes.data.recommendation.id]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const { data } = await approveIncident(id, selectedResources);
      setIncident(data);
    } catch (e) {
      alert(e.response?.data?.detail || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="loading-center"><div className="spinner" /></div>
      </main>
    </div>
  );

  if (!incident) return null;

  const p = incident.priority?.toLowerCase() || 'p3';
  const colors = PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.P3;
  const icon = INCIDENT_TYPE_ICONS[incident.incident_type] || '❓';
  const canApprove = incident.status === 'AWAITING_APPROVAL';

  const tabs = ['overview', 'ai analysis', 'risk', 'cameras', 'timeline'];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ borderLeft: `4px solid ${colors.badge}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 className="page-title" style={{ margin: 0 }}>
                  {incident.incident_type_display}
                </h1>
                <span className={`priority-badge ${p}`}>{incident.priority}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {incident.incident_id}
                </span>
              </div>
              <p className="page-sub" style={{ marginTop: '0.25rem' }}>
                {incident.location_display} — Risk: <strong style={{ color: colors.badge }}>{incident.risk_score}</strong> —
                Status: {incident.status_display || incident.status}
              </p>
            </div>
            {canApprove && (
              <button
                id="approve-btn"
                className="btn btn-success"
                onClick={handleApprove}
                disabled={approving || selectedResources.length === 0}
              >
                {approving ? 'Approving...' : '✓ Approve & Dispatch'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 2rem', background: 'var(--bg-surface)' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab(tab)}
              style={{
                borderRadius: 0,
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid var(--accent)` : '2px solid transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                padding: '0.75rem 1rem',
                textTransform: 'capitalize',
                fontWeight: activeTab === tab ? 700 : 400,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="page-body">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Incident Details</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    ['Type', incident.incident_type_display],
                    ['Location', incident.location_display],
                    ['Location Detail', incident.location_detail || '—'],
                    ['People Exposed', incident.people_exposed],
                    ['Spread Potential', incident.spread_potential || '—'],
                    ['Confidence', `${Math.round((incident.confidence || 0) * 100)}%`],
                    ['Reported', formatDateTime(incident.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource Recommendation */}
              <div className="card">
                <div className="card-header"><span className="card-title">Resource Recommendation</span></div>
                {recommendation?.recommendation ? (
                  <>
                    <div className="resource-card recommended" style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="resource-name">{recommendation.recommendation.name}</div>
                        <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>★ Recommended</span>
                      </div>
                      <div className="resource-type-tag">{recommendation.recommendation.type_display}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {recommendation.recommendation.capabilities.map((c) => (
                          <span key={c} className={`capability-tag ${c}`}>{c}</span>
                        ))}
                      </div>
                    </div>

                    {recommendation.alternatives?.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Alternatives
                        </div>
                        {recommendation.alternatives.map((r) => (
                          <div key={r.id} className="resource-card" style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="resource-name" style={{ fontSize: '0.85rem' }}>{r.name}</div>
                              <label style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedResources.includes(r.id)}
                                  onChange={() => setSelectedResources((prev) =>
                                    prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                                  )}
                                />
                                Include
                              </label>
                            </div>
                            <div className="resource-type-tag">{r.type_display}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '1rem' }}>
                    <p className="empty-sub">No resources available for required capabilities</p>
                  </div>
                )}
              </div>

              {/* Required Capabilities */}
              <div className="card">
                <div className="card-header"><span className="card-title">Required Capabilities</span></div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {incident.required_capabilities?.map((cap) => (
                    <span key={cap} className={`capability-tag ${cap}`}>
                      {CAPABILITY_LABELS[cap] || cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Camera Coverage */}
              <div className="card">
                <div className="card-header"><span className="card-title">CCTV Coverage</span></div>
                {cameras.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {cameras.map((cam) => (
                      <div key={cam.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: '0.4rem' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{cam.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{cam.coverage_description}</span>
                        <span style={{ color: cam.status === 'ONLINE' ? '#22c55e' : '#ef4444', fontSize: '0.72rem' }}>{cam.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No cameras covering this location</p>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'ai analysis' && (
            <div className="card">
              <div className="card-header"><span className="card-title">AI Incident Understanding</span></div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>AI Summary</div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                  {incident.ai_summary || 'No AI summary available.'}
                </p>
              </div>
              <hr className="section-divider" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Severity Factors</div>
                  {incident.severity_factors?.length > 0
                    ? incident.severity_factors.map((f, i) => (
                      <div key={i} style={{ fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        • {f}
                      </div>
                    ))
                    : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</p>
                  }
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Extraction Metadata</div>
                  {[
                    ['Model Confidence', `${Math.round((incident.confidence || 0) * 100)}%`],
                    ['Spread Potential', incident.spread_potential || '—'],
                    ['People Exposed', incident.people_exposed],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Risk Tab */}
          {activeTab === 'risk' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Risk Assessment Breakdown</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', fontWeight: 800, color: colors.badge }}>
                  {incident.risk_score} / 100
                </span>
              </div>
              <RiskBreakdown breakdown={incident.risk_breakdown} />
            </div>
          )}

          {/* Cameras Tab */}
          {activeTab === 'cameras' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Camera Coverage for {incident.location_display}</span></div>
              {cameras.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {cameras.map((cam) => (
                    <div key={cam.id} style={{ background: 'var(--bg-surface)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📹</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{cam.name}</div>
                          <div style={{ fontSize: '0.7rem' }}>{cam.status}</div>
                        </div>
                      </div>
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cam.coverage_description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{cam.location_block}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><div className="empty-icon">📹</div><p className="empty-title">No cameras at this location</p></div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Incident Timeline</span></div>
              <Timeline events={incident.timeline || []} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

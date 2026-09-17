import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { getAnalyticsSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import {
  BarChart2, TrendingUp, MapPin, AlertTriangle, Shield,
  Clock, Zap, Users, Brain, RotateCw, Activity, Layers, Truck,
} from 'lucide-react';

const OPERATOR_TEAM_FILTERS = [
  { key: '', label: 'Entire Campus (Full Command)' },
  { key: 'MEDICAL', label: 'Medical Team' },
  { key: 'FIRE', label: 'Fire Team' },
  { key: 'HAZMAT', label: 'Hazmat Team' },
  { key: 'SECURITY', label: 'Security Unit' },
  { key: 'FACILITIES', label: 'Facilities Team' },
];

// ── Colour palette consistent with JarVIZ design
const NAVY = '#1F3A5F';
const GOLD = '#C9A84C';
const COLORS = ['#1F3A5F', '#C9A84C', '#2563EB', '#16a34a', '#dc2626', '#7c3aed', '#0891b2'];

const TYPE_COLORS = {
  FIRE_SMOKE: '#ef4444',
  CHEMICAL: '#7c3aed',
  MEDICAL: '#16a34a',
  SECURITY_THREAT: '#1F3A5F',
  ELECTRICAL: '#f59e0b',
  VIOLENCE_CROWD: '#ec4899',
  UNKNOWN: '#6b7280',
};

const PRIORITY_COLORS = { P0: '#dc2626', P1: '#f59e0b', P2: '#2563EB', P3: '#6b7280' };

const CAP_LABEL = {
  fire: 'Fire', medical: 'Medical', hazmat: 'HAZMAT',
  security: 'Security', facilities: 'Facilities', isolation: 'Isolation',
};

// ── Tooltip style
const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '6px',
  color: '#f1f5f9',
  fontSize: '0.78rem',
  fontFamily: "'Outfit', sans-serif",
};

// ── Custom tick for long location labels
const ShortTick = ({ x, y, payload }) => {
  const label = payload.value.replace(/ —.*/, '').replace('Block ', 'B').trim();
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#64748b">{label}</text>;
};

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const isOperator = user?.role === 'OPERATOR';
  const [selectedTeam, setSelectedTeam] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async (teamOverride) => {
    try {
      setLoading(true);
      setError(null);
      const teamParam = isOperator ? (teamOverride !== undefined ? teamOverride : selectedTeam) : undefined;
      const { data: res } = await getAnalyticsSummary(teamParam ? { team: teamParam } : undefined);
      setData(res);
      setLastRefresh(new Date());
    } catch (e) {
      setError('Failed to load analytics data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isOperator, selectedTeam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectTeam = (teamKey) => {
    setSelectedTeam(teamKey);
    fetchData(teamKey);
  };

  // ── Capability Demand → Recharts radar format
  const capRadarData = data
    ? Object.entries(data.capability_demand).map(([key, val]) => ({
        cap: CAP_LABEL[key] || key,
        demand: val,
      }))
    : [];

  // ── Priority pie data
  const priorityPieData = data
    ? Object.entries(data.by_priority)
        .filter(([, v]) => v > 0)
        .map(([key, val]) => ({ name: key, value: val }))
    : [];

  const isTeamScoped = Boolean(data?.team_info?.is_team_scoped);
  const teamInfo = data?.team_info;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* ── Page Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: NAVY, background: 'rgba(31,58,95,0.08)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                  <BarChart2 size={18} strokeWidth={2.2} />
                </span>
                <h1 className="page-title">
                  {isTeamScoped
                    ? `${teamInfo.team_name} — Intelligence & Analytics`
                    : 'Campus Analytics & Intelligence'}
                </h1>
              </div>
              <p className="page-sub">
                {isTeamScoped
                  ? `${teamInfo.team_description} • Dedicated operational performance & incident history`
                  : 'Resource planning insights & precautionary risk intelligence — powered by historical incident data'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {lastRefresh && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchData()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCw size={12} /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="page-body">
          {/* Operator Command View Filter Switcher */}
          {isOperator && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              padding: '0.65rem 1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              marginBottom: '1.25rem',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Layers size={14} color={NAVY} /> Command Scope:
              </span>
              {OPERATOR_TEAM_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`btn btn-xs ${selectedTeam === f.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    fontWeight: selectedTeam === f.key ? 700 : 500,
                  }}
                  onClick={() => handleSelectTeam(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Dedicated Unit Scope Banner for Teams */}
          {isTeamScoped && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              marginBottom: '1.25rem',
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderLeft: '4px solid #2563EB',
              borderRadius: '4px',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Shield size={16} color="#2563EB" />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E3A8A' }}>
                    {teamInfo.team_name} — Dedicated Operational View
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>
                    {teamInfo.team_description}
                  </span>
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '0.2rem 0.5rem',
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#1E3A8A',
                borderRadius: '3px',
                letterSpacing: '0.05em',
              }}>
                UNIT SCOPE: {teamInfo.team_key}
              </span>
            </div>
          )}

          {loading && (
            <div className="loading-center" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          )}

          {error && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
              <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
              <p>{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* ── RAG Banner (Shown on campus view) */}
              {!isTeamScoped && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.7rem 1rem', marginBottom: '1.5rem',
                  background: 'linear-gradient(90deg, rgba(31,58,95,0.08) 0%, rgba(201,168,76,0.08) 100%)',
                  border: '1px solid rgba(31,58,95,0.2)',
                  borderLeft: `3px solid ${GOLD}`,
                  borderRadius: '4px',
                }}>
                  <Brain size={15} color={NAVY} strokeWidth={2} />
                  <span style={{ fontSize: '0.8rem', color: NAVY, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                    RAG Intelligence Active
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    FAISS vector index contains{' '}
                    <strong style={{ color: NAVY }}>{data.rag_index_size}</strong>{' '}
                    resolved incident embedding{data.rag_index_size !== 1 ? 's' : ''} —
                    new classifications are enriched with this historical context.
                  </span>
                </div>
              )}

              {/* ── Unit Fleet & Staging Locations (Team Scoped View) */}
              {isTeamScoped && teamInfo.resources?.length > 0 && (
                <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <SectionTitle icon={<Truck size={14} />} title={`${teamInfo.team_name} Units & Staging`} sub="Real-time staging location and deployment readiness" />
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {teamInfo.available_units} of {teamInfo.total_units} units available
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    {teamInfo.resources.map(r => (
                      <div key={r.id} style={{
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            <MapPin size={11} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: '-1px' }} />
                            {r.location?.replace(/ —.*/, '')} {r.contact ? `• ${r.contact}` : ''}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '3px',
                          background: r.status === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                          color: r.status === 'AVAILABLE' ? '#16a34a' : '#ca8a04',
                          border: `1px solid ${r.status === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                        }}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── KPI Cards */}
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                {isTeamScoped ? (
                  <>
                    <KPICard icon={<Activity size={16} />} label="Incidents Involved" value={data.overview.total_incidents} sub="Assigned & domain incidents" />
                    <KPICard icon={<AlertTriangle size={16} />} label="Active Missions" value={teamInfo.active_missions} sub="Deployments in progress" valueClass="warning" />
                    <KPICard icon={<Shield size={16} />} label="Completed Missions" value={teamInfo.completed_missions} sub="Successfully closed" valueClass="success" />
                    <KPICard icon={<TrendingUp size={16} />} label="Avg Mission Risk" value={data.overview.avg_risk_score.toFixed(1)} sub="Across unit missions" />
                    <KPICard icon={<Users size={16} />} label="Unit Readiness" value={`${teamInfo.available_units} / ${teamInfo.total_units}`} sub={`${teamInfo.busy_units} Busy, ${teamInfo.offline_units} Offline`} />
                  </>
                ) : (
                  <>
                    <KPICard icon={<Activity size={16} />} label="Total Incidents" value={data.overview.total_incidents} sub="All time campus-wide" />
                    <KPICard icon={<AlertTriangle size={16} />} label="Active" value={data.overview.active} sub="In progress" valueClass="warning" />
                    <KPICard icon={<Shield size={16} />} label="Resolved" value={data.overview.resolved} sub="Closed + resolved" valueClass="success" />
                    <KPICard icon={<TrendingUp size={16} />} label="Avg Risk Score" value={data.overview.avg_risk_score.toFixed(1)} sub="Across all incidents" />
                    <KPICard icon={<Users size={16} />} label="Total Reports" value={data.overview.total_reports} sub="Submissions received" />
                  </>
                )}
              </div>

              {/* ── Row 1: Risk Trend + Priority Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Risk Trend */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle
                    icon={<TrendingUp size={14} />}
                    title={isTeamScoped ? `${teamInfo.team_name} Risk Trend` : "Risk Score Trend"}
                    sub={isTeamScoped ? "Daily average incident risk involving this unit" : "Daily average over last 30 days"}
                  />
                  {data.risk_trend.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={data.risk_trend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <defs>
                          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={NAVY} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="avg_risk" stroke={NAVY} fill="url(#riskGrad)" strokeWidth={2} dot={false} name="Avg Risk" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Priority Breakdown */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle
                    icon={<Zap size={14} />}
                    title={isTeamScoped ? `${teamInfo.team_name} Priority Breakdown` : "Priority Breakdown"}
                    sub={isTeamScoped ? "Incidents involving this unit" : "All incidents"}
                  />
                  {priorityPieData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={priorityPieData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={75} innerRadius={42}
                          paddingAngle={3}
                        >
                          {priorityPieData.map((entry) => (
                            <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#6b7280'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
                        <Legend
                          formatter={(val) => <span style={{ fontSize: '0.75rem', color: '#475569' }}>{val}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* ── Row 2: Incident Heatmap by Location + Incident Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* By Location */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle
                    icon={<MapPin size={14} />}
                    title={isTeamScoped ? "Unit Deployments by Location" : "Incidents by Location"}
                    sub={isTeamScoped ? "Locations with unit involvement" : "Count & avg risk score"}
                  />
                  {data.by_location.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={data.by_location.slice(0, 8).map(l => ({
                          name: l.location_display,
                          count: l.count,
                          avg_risk: l.avg_risk,
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis type="category" dataKey="name" width={100} tick={<ShortTick />} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="Incidents" fill={NAVY} radius={[0, 3, 3, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* By Incident Type */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle
                    icon={<AlertTriangle size={14} />}
                    title={isTeamScoped ? "Unit Domain Incident Types" : "Incident Types"}
                    sub="Frequency distribution"
                  />
                  {data.by_type.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={data.by_type.map(t => ({ name: t.display.split(' /')[0].split(' &')[0], count: t.count, avg_risk: t.avg_risk }))}
                        margin={{ top: 5, right: 10, bottom: 30, left: -10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', angle: -30, textAnchor: 'end' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="Count" radius={[3, 3, 0, 0]} barSize={28}>
                          {data.by_type.map((t) => (
                            <Cell key={t.incident_type} fill={TYPE_COLORS[t.incident_type] || NAVY} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* ── Row 3: Peak Hours + Capability Demand */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Peak Hours */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle
                    icon={<Clock size={14} />}
                    title={isTeamScoped ? "Unit Operational Peak Hours" : "Peak Incident Hours"}
                    sub={isTeamScoped ? "Hour-of-day activity for unit incidents" : "Hour-of-day activity (24h)"}
                  />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.peak_hours} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={h => `${h}:00`} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={h => `${h}:00`} />
                      <Bar dataKey="count" name="Incidents" fill={GOLD} radius={[2, 2, 0, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Capability Demand Radar */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle icon={<Zap size={14} />} title="Capability Demand" sub="Team deployment frequency" />
                  {capRadarData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={capRadarData} cx="50%" cy="50%" outerRadius={70}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="cap" tick={{ fontSize: 11, fill: '#475569' }} />
                        <PolarRadiusAxis tick={false} axisLine={false} />
                        <Radar name="Demand" dataKey="demand" stroke={NAVY} fill={NAVY} fillOpacity={0.25} strokeWidth={2} />
                        <Tooltip contentStyle={tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* ── Row 4: Response Times */}
              {data.response_times.length > 0 && (
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <SectionTitle icon={<Clock size={14} />} title="Avg Response Time by Location" sub="Minutes from incident creation to resolution (resolved incidents only)" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={data.response_times}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" min" />
                      <YAxis type="category" dataKey="location_display" width={120} tick={<ShortTick />} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} min`, 'Avg Response']} />
                      <Bar dataKey="avg_minutes" name="Avg Response" fill="#2563EB" radius={[0, 3, 3, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Precautionary Measures Panel */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderLeft: `3px solid ${GOLD}` }}>
                <SectionTitle
                  icon={<Shield size={14} color={GOLD} />}
                  title={isTeamScoped ? `${teamInfo.team_name} Precautionary Recommendations` : "Precautionary Resource Recommendations"}
                  sub={isTeamScoped ? "Targeted guidance for this specialized unit's operations" : "Top high-risk locations in last 30 days — proactive deployment suggestions"}
                  accent
                />
                {data.location_precaution_scores.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No incident data from the last 30 days. Campus is clear.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.75rem' }}>
                    {data.location_precaution_scores.map((loc, i) => (
                      <PrecautionCard key={loc.location} rank={i + 1} loc={loc} />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Recent High-Risk Incidents */}
              {data.recent_high_risk.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <SectionTitle
                    icon={<AlertTriangle size={14} />}
                    title={isTeamScoped ? "Recent High-Risk Missions" : "Recent High-Risk Incidents"}
                    sub={isTeamScoped ? `P0 & P1 incidents handled by or relevant to ${teamInfo.team_name}` : "P0 & P1 incidents from last 7 days"}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {data.recent_high_risk.map(inc => (
                      <div key={inc.incident_id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.6rem 0.9rem', background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)', borderRadius: '4px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 700,
                            padding: '0.15rem 0.4rem', background: PRIORITY_COLORS[inc.priority] + '20',
                            color: PRIORITY_COLORS[inc.priority], border: `1px solid ${PRIORITY_COLORS[inc.priority]}40`,
                          }}>
                            {inc.priority}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {inc.incident_id}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {inc.incident_type.replace('_', ' ')} — {inc.location_display?.replace(/ —.*/, '')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem',
                            fontWeight: 700, color: NAVY,
                          }}>
                            Risk {inc.risk_score.toFixed(1)}
                          </span>
                          <span style={{
                            fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {inc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}


// ── Sub-components

function KPICard({ icon, label, value, sub, valueClass }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <div className="stat-label">{label}</div>
      </div>
      <div className={`stat-value ${valueClass || ''}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function SectionTitle({ icon, title, sub, accent }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
        <span style={{ color: accent ? GOLD : NAVY }}>{icon}</span>
        <span style={{
          fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: "'Outfit', sans-serif",
          color: accent ? GOLD : 'var(--text-primary)',
        }}>
          {title}
        </span>
      </div>
      {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
      No data available yet
    </div>
  );
}

const SCORE_COLOR = (score) => {
  if (score >= 50) return '#dc2626';
  if (score >= 30) return '#f59e0b';
  return '#16a34a';
};

function PrecautionCard({ rank, loc }) {
  const color = SCORE_COLOR(loc.score);
  return (
    <div style={{
      padding: '1rem 1.1rem',
      background: rank === 1 ? 'rgba(220,38,38,0.04)' : 'var(--bg-secondary)',
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: color, color: '#fff', fontSize: '0.7rem',
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {rank}
          </span>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {loc.location_display}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {loc.recent_incidents} incident{loc.recent_incidents !== 1 ? 's' : ''} in last 30 days &nbsp;·&nbsp;
              Avg Risk: <strong style={{ color: NAVY }}>{loc.avg_risk}</strong>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color,
          }}>
            Score {loc.score}
          </span>
          <span style={{
            fontSize: '0.65rem', padding: '0.1rem 0.4rem',
            background: `${color}15`, color, border: `1px solid ${color}40`,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {loc.dominant_type.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div style={{
        fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5,
        padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.6)',
        border: '1px solid var(--border)', borderRadius: '3px',
      }}>
        <strong style={{ color: NAVY }}>⚡ Recommended Action: </strong>{loc.recommendation}
      </div>
    </div>
  );
}

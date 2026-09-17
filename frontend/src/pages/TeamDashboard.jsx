import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import IncidentIcon from '../components/IncidentIcon';
import { getIncidents, updateAssignmentStatus, completeAssignment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/constants';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Radio,
  Navigation,
  CheckCircle2,
  FileText,
  AlertTriangle,
  X,
  Send,
  Users,
} from 'lucide-react';

const TEAM_TYPE_MAP = {
  TEAM_MEDICAL: 'MEDICAL',
  TEAM_FIRE: 'FIRE',
  TEAM_HAZMAT: 'HAZMAT',
  TEAM_SECURITY: 'SECURITY',
  TEAM_FACILITIES: 'FACILITIES',
};

export default function TeamDashboard() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'

  // Completion modal state
  const [completingAssignment, setCompletingAssignment] = useState(null); // { assignmentId, unitName, incident }
  const [completionReport, setCompletionReport] = useState('');
  const [casualtiesTreated, setCasualtiesTreated] = useState(0);
  const [hazardCleared, setHazardCleared] = useState(true);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const teamType = TEAM_TYPE_MAP[user?.role] || null;
  const teamName = teamType || user?.role?.replace('TEAM_', '') || 'SPECIALIZED UNIT';

  const loadIncidents = async () => {
    try {
      const { data } = await getIncidents();
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Filter incidents for this unit
  const filterByUnit = (incList) => {
    return incList.filter((incident) => {
      if (!teamType) return true; // operator / admin gets all
      const assignedUnits = incident.assignments || [];
      return assignedUnits.some(
        (a) => a.resource?.resource_type === teamType || a.resource?.name?.toLowerCase().includes(teamName.toLowerCase())
      );
    });
  };

  const unitIncidents = filterByUnit(incidents);

  // Active missions: incident has an assignment for this team that is active
  const activeMissions = unitIncidents.filter((incident) => {
    if (['CLOSED'].includes(incident.status)) return false;
    const teamAssignments = incident.assignments?.filter(
      (a) => !teamType || a.resource?.resource_type === teamType
    ) || [];
    // Has at least one assignment not revoked and not completed
    return teamAssignments.some((a) =>
      ['ASSIGNED', 'DISPATCHED', 'RESPONDING', 'ON_SCENE'].includes(a.status)
    );
  });

  // Completed missions: incident has a completed assignment for this team
  const completedMissions = unitIncidents.filter((incident) => {
    const teamAssignments = incident.assignments?.filter(
      (a) => !teamType || a.resource?.resource_type === teamType
    ) || [];
    return teamAssignments.some((a) => a.status === 'COMPLETED');
  });

  const displayedIncidents = activeTab === 'active' ? activeMissions : completedMissions;

  // Handle tactical status change: DISPATCHED -> RESPONDING -> ON_SCENE
  const handleStatusProgression = async (assignmentId, newStatus) => {
    setUpdatingStatusId(assignmentId);
    try {
      await updateAssignmentStatus(assignmentId, { status: newStatus });
      await loadIncidents();
    } catch (e) {
      alert(e.response?.data?.detail || 'Status update failed');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Open completion modal
  const openCompletionModal = (assignment, incident) => {
    setCompletingAssignment({
      assignmentId: assignment.id,
      unitName: assignment.resource?.name || teamName,
      incident,
    });
    setCompletionReport('');
    setCasualtiesTreated(0);
    setHazardCleared(true);
    setCompletionNotes('');
  };

  // Submit completion report
  const handleCompleteMission = async (e) => {
    e?.preventDefault();
    if (!completingAssignment) return;
    if (!completionReport.trim()) {
      alert('Please provide a summary report of rescue actions taken.');
      return;
    }

    setSubmittingCompletion(true);
    try {
      await completeAssignment(completingAssignment.assignmentId, {
        completion_report: completionReport.trim(),
        casualties_treated: parseInt(casualtiesTreated, 10) || 0,
        hazard_cleared: hazardCleared,
        notes: completionNotes.trim(),
      });
      setCompletingAssignment(null);
      await loadIncidents();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to submit completion report');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '0.35rem' }}>
                Tactical Operations · {teamName}
              </div>
              <h1 className="page-title">Unit Command Console</h1>
              <p className="page-sub">
                Officer {user?.first_name || user?.username} — Live rescue mission execution and report acknowledgment
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-dot">Field Link Secure</span>
            </div>
          </div>
        </div>

        <div className="page-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <>
              {/* Tactical Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Active Missions</div>
                  <div className={`stat-value ${activeMissions.length > 0 ? 'critical' : 'success'}`}>
                    {activeMissions.length}
                  </div>
                  <div className="stat-sub">Deployments awaiting or undergoing response</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Completed & Acknowledged</div>
                  <div className="stat-value success">
                    {completedMissions.length}
                  </div>
                  <div className="stat-sub">Missions successfully finished & filed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Unit Assignment</div>
                  <div className="stat-value" style={{ fontSize: '1.35rem', textTransform: 'uppercase' }}>
                    {teamName}
                  </div>
                  <div className="stat-sub">Designated operational detachment</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Field Readiness</div>
                  <div className="stat-value success" style={{ fontSize: '1.35rem' }}>
                    {activeMissions.length > 0 ? 'ENGAGED' : 'READY'}
                  </div>
                  <div className="stat-sub">Direct link to Central Emergency Operations</div>
                </div>
              </div>

              {/* Tabs: Active vs Completed */}
              <div style={{
                display: 'flex',
                gap: 0,
                borderBottom: '1px solid var(--border)',
                marginBottom: '1.5rem',
                background: 'var(--bg-surface)',
              }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'active' ? '2px solid #D4AF37' : '2px solid transparent',
                    color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '0.85rem 1.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: activeTab === 'active' ? 700 : 500,
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Active Orders ({activeMissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'completed' ? '2px solid #D4AF37' : '2px solid transparent',
                    color: activeTab === 'completed' ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '0.85rem 1.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: activeTab === 'completed' ? 700 : 500,
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Completed Missions ({completedMissions.length})
                </button>
              </div>

              {displayedIncidents.length === 0 ? (
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#16a34a' }}>
                    <ShieldCheck size={48} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    {activeTab === 'active' ? 'Sector Clear — No Active Orders' : 'No Completed Missions on Record'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto' }}>
                    {activeTab === 'active'
                      ? 'All sectors within your operational detachment are currently stabilized. Stand by for operator dispatch.'
                      : 'Completed rescue reports and debrief acknowledgments filed by your unit will appear here.'}
                  </p>
                </div>
              ) : (
                displayedIncidents.map((incident) => {
                  const p = incident.priority?.toLowerCase() || 'p3';
                  const badgeColor = p === 'p0' ? '#dc2626' : p === 'p1' ? '#ea580c' : p === 'p2' ? '#D4AF37' : '#1F3A5F';

                  // Get this team's assignments for this incident
                  const myAssignments = incident.assignments?.filter(
                    (a) => !teamType || a.resource?.resource_type === teamType
                  ) || [];

                  return (
                    <div
                      key={incident.id}
                      className="card"
                      style={{
                        marginBottom: '1.25rem',
                        position: 'relative',
                        borderLeft: `4px solid ${badgeColor}`,
                        padding: '1.5rem',
                      }}
                    >
                      {/* Top Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {incident.incident_id}
                          </span>
                          <div style={{ color: badgeColor, display: 'flex', alignItems: 'center' }}>
                            <IncidentIcon type={incident.incident_type} size={20} />
                          </div>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                            {incident.incident_type_display || incident.incident_type}
                          </span>
                          <span className={`priority-badge ${p}`}>{incident.priority}</span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-base)',
                            padding: '0.2rem 0.6rem',
                            border: '1px solid var(--border)',
                          }}
                        >
                          Incident: {incident.status_display || incident.status}
                        </span>
                      </div>

                      {/* Location & Risk */}
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>LOCATION: </span>
                          <strong>{incident.location_display || incident.location}</strong>
                        </div>
                        <div>
                          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>RISK INDEX: </span>
                          <strong style={{ color: badgeColor, fontFamily: 'JetBrains Mono, monospace' }}>
                            {incident.risk_score} / 100
                          </strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>REPORTED: </span>
                          <span>{formatDateTime(incident.created_at)}</span>
                        </div>
                      </div>

                      {/* AI Summary / Description */}
                      <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1.25rem', background: 'var(--bg-base)', padding: '0.85rem 1.1rem', borderLeft: '3px solid var(--border-bright)' }}>
                        {incident.ai_summary || incident.description || 'No summary available.'}
                      </div>

                      {/* Unit Deployments & Rescue Acknowledgment Actions */}
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '1rem',
                        marginTop: '0.5rem',
                      }}>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.75rem' }}>
                          Unit Deployments & Operational Actions
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {myAssignments.map((assignment) => {
                            const isCompleted = assignment.status === 'COMPLETED';
                            const isRevoked = assignment.status === 'REVOKED';

                            let statusBadgeColor = '#d97706';
                            if (assignment.status === 'DISPATCHED') statusBadgeColor = '#0284c7';
                            if (assignment.status === 'RESPONDING') statusBadgeColor = '#4f46e5';
                            if (assignment.status === 'ON_SCENE') statusBadgeColor = '#16a34a';
                            if (isCompleted) statusBadgeColor = '#16a34a';
                            if (isRevoked) statusBadgeColor = '#dc2626';

                            return (
                              <div
                                key={assignment.id}
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border)',
                                  padding: '1rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.75rem',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.95rem' }}>
                                      {assignment.resource?.name || teamName}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                      ({assignment.resource?.type_display || teamName})
                                    </span>
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      padding: '0.2rem 0.6rem',
                                      color: statusBadgeColor,
                                      border: `1px solid ${statusBadgeColor}`,
                                      background: 'var(--bg-base)',
                                    }}
                                  >
                                    Status: {assignment.status_display || assignment.status}
                                  </span>
                                </div>

                                {/* Completed Debrief Report View */}
                                {isCompleted && (
                                  <div style={{
                                    background: 'rgba(22, 163, 74, 0.05)',
                                    borderLeft: '3px solid #16a34a',
                                    padding: '0.75rem 1rem',
                                    fontSize: '0.85rem',
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                                      <strong style={{ color: '#16a34a', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <CheckCircle2 size={13} /> Rescue Completed & Debrief Filed
                                      </strong>
                                      {assignment.completed_at && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                          Filed: {formatDateTime(assignment.completed_at)}
                                        </span>
                                      )}
                                    </div>
                                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                      "{assignment.completion_report}"
                                    </p>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      <span>Casualties Assisted: <strong>{assignment.casualties_treated}</strong></span>
                                      <span>Hazard Status: <strong>{assignment.hazard_cleared ? 'Cleared & Neutralized' : 'Monitoring Required'}</strong></span>
                                    </div>
                                  </div>
                                )}

                                {/* Tactical Action Buttons for Active Units */}
                                {!isCompleted && !isRevoked && (
                                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '0.35rem' }}>
                                    {/* Dispatched -> Confirm Responding */}
                                    {['ASSIGNED', 'DISPATCHED'].includes(assignment.status) && (
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleStatusProgression(assignment.id, 'RESPONDING')}
                                        disabled={updatingStatusId === assignment.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                                      >
                                        <Navigation size={13} /> Confirm En Route (Responding)
                                      </button>
                                    )}

                                    {/* Responding -> Mark On Scene */}
                                    {assignment.status === 'RESPONDING' && (
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleStatusProgression(assignment.id, 'ON_SCENE')}
                                        disabled={updatingStatusId === assignment.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#16a34a', borderColor: 'rgba(22,163,74,0.4)' }}
                                      >
                                        <Radio size={13} /> Mark Arrived On Scene
                                      </button>
                                    )}

                                    {/* Any active status can finish rescue and file report */}
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => openCompletionModal(assignment, incident)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        fontSize: '0.75rem',
                                        background: '#16a34a',
                                        borderColor: '#16a34a',
                                      }}
                                    >
                                      <CheckCircle2 size={13} /> Finish Rescue & File Acknowledgment
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Modal: Rescue Completion & Acknowledgment Report */}
        {completingAssignment && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}>
            <div className="card" style={{ maxWidth: '580px', width: '100%', border: '1px solid #16a34a', backgroundColor: '#FFFFFF', background: '#FFFFFF', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                  <CheckCircle2 size={20} />
                  <span className="card-title" style={{ color: '#16a34a' }}>Finish Rescue & File Report</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletingAssignment(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0.85rem 0' }}>
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Incident:</span>
                    <strong>{completingAssignment.incident.incident_id} — {completingAssignment.incident.incident_type_display}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Location:</span>
                    <span>{completingAssignment.incident.location_display}</span>
                  </div>
                </div>

                <form onSubmit={handleCompleteMission}>
                  {/* Debrief / Actions Taken */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.45rem',
                    }}>
                      Tactical Actions Taken & Rescue Debrief <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      required
                      placeholder="Detail actions taken, victim triage, equipment utilized, and current status of the site..."
                      value={completionReport}
                      onChange={(e) => setCompletionReport(e.target.value)}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                      {[
                        'Hazard contained; area secured and ventilated.',
                        'Victim stabilized, first aid administered, transported to medical center.',
                        'Perimeter locked down and crowd safely dispersed.',
                        'Infrastructure isolated; verified safe for entry.',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCompletionReport(preset)}
                          style={{
                            background: 'var(--bg-base)',
                            border: '1px solid var(--border)',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          + {preset.split(';')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Casualties / Individuals Assisted */}
                  <div style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.45rem',
                      }}>
                        Casualties / Individuals Assisted
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input"
                        value={casualtiesTreated}
                        onChange={(e) => setCasualtiesTreated(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.45rem',
                      }}>
                        Readiness Handover Notes
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Unit returned to station"
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Site Clearance Certification Checkbox */}
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '0.75rem',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                  }}>
                    <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={hazardCleared}
                        onChange={(e) => setHazardCleared(e.target.checked)}
                        style={{ marginTop: '0.2rem' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        <strong>Site Clearance Acknowledgment:</strong> I certify that field rescue operations for this unit are complete, the immediate threat is contained, and this report represents official operational acknowledgment.
                      </span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCompletingAssignment(null)}
                      disabled={submittingCompletion}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn"
                      disabled={submittingCompletion || !completionReport.trim()}
                      style={{
                        background: '#16a34a',
                        color: '#fff',
                        border: '1px solid #16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Send size={14} /> {submittingCompletion ? 'Submitting...' : 'Submit Report & Acknowledge'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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
  assignResource,
  revokeAssignment,
  closeIncident,
  getResources,
  createSeparationTask,
  updateSeparationTaskStatus,
} from '../services/api';
import IncidentIcon from '../components/IncidentIcon';
import {
  ArrowLeft,
  Check,
  Star,
  Video,
  VideoOff,
  Plus,
  RotateCcw,
  AlertTriangle,
  X,
  Shield,
  Clock,
  Send,
  CheckCircle2,
  Archive,
  ListTodo,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import CampusTacticalMap from '../components/CampusTacticalMap';
import { PRIORITY_COLORS, CAPABILITY_LABELS, formatDateTime } from '../utils/constants';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedNewResourceId, setSelectedNewResourceId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Revoke modal state
  const [revokingAssignment, setRevokingAssignment] = useState(null); // { id, unitName }
  const [revocationReason, setRevocationReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Close incident modal state
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closingIncident, setClosingIncident] = useState(false);

  // Separation Task state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('PERIMETER_CORDON');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskRole, setTaskRole] = useState('Security Staff');
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [taskDescription, setTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);


  const reloadData = async () => {
    try {
      const [incRes, camRes, recRes, resList] = await Promise.all([
        getIncident(id),
        getIncidentCameras(id),
        getRecommendation(id),
        getResources(),
      ]);
      setIncident(incRes.data);
      setCameras(camRes.data);
      setRecommendation(recRes.data);
      setAllResources(resList.data || []);
      if (recRes.data?.recommendation && selectedResources.length === 0) {
        setSelectedResources([recRes.data.recommendation.id]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await reloadData();
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
      await reloadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleAssignResource = async (e) => {
    e?.preventDefault();
    if (!selectedNewResourceId) return;
    setAssigning(true);
    try {
      const { data } = await assignResource(id, {
        resource_id: parseInt(selectedNewResourceId, 10),
        notes: assignmentNotes,
      });
      setIncident(data);
      setAssignModalOpen(false);
      setSelectedNewResourceId('');
      setAssignmentNotes('');
      await reloadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Dispatch failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeAssignment = async (e) => {
    e?.preventDefault();
    if (!revokingAssignment) return;
    setRevoking(true);
    try {
      const { data } = await revokeAssignment(revokingAssignment.id, {
        reason: revocationReason,
      });
      setIncident(data);
      setRevokingAssignment(null);
      setRevocationReason('');
      await reloadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Revocation failed');
    } finally {
      setRevoking(false);
    }
  };

  const handleCloseIncident = async (e) => {
    e?.preventDefault();
    setClosingIncident(true);
    try {
      const { data } = await closeIncident(id, { notes: closureNotes });
      setIncident(data);
      setCloseModalOpen(false);
      setClosureNotes('');
      await reloadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to close incident');
    } finally {
      setClosingIncident(false);
    }
  };

  const handleCreateSeparationTask = async (e) => {
    e?.preventDefault();
    if (!taskTitle.trim()) return;
    setCreatingTask(true);
    try {
      await createSeparationTask(id, {
        title: taskTitle.trim(),
        category: taskCategory,
        target_location: taskLocation.trim() || incident.location_display || incident.location,
        assigned_role: taskRole.trim(),
        priority: taskPriority,
        description: taskDescription.trim(),
      });
      setTaskModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      await reloadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to deploy separation task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateSeparationTaskStatus = async (taskId, newStatus, notes = '') => {
    setUpdatingTask(true);
    try {
      await updateSeparationTaskStatus(taskId, {
        status: newStatus,
        completion_notes: notes,
      });
      setCompletingTask(null);
      setCompletionNotes('');
      await reloadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to update task status');
    } finally {
      setUpdatingTask(false);
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
  const canApprove = incident.status === 'AWAITING_APPROVAL';
  const isResolved = incident.status === 'RESOLVED';
  const isClosed = incident.status === 'CLOSED';
  const assignments = incident.assignments || [];
  const activeAssignments = assignments.filter((a) =>
    ['ASSIGNED', 'DISPATCHED', 'RESPONDING', 'ON_SCENE'].includes(a.status)
  );

  const separationTasks = incident.separation_tasks || [];
  const reports = incident.reports || [];
  const approvedReports = reports.filter((r) => r.can_resolve);

  const tabs = ['overview', 'tactical map', 'assigned units', 'separation tasks', 'ai analysis', 'risk', 'cameras', 'timeline'];


  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return { color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.3)', background: 'rgba(217, 119, 6, 0.08)' };
      case 'DISPATCHED':
        return { color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)', background: 'rgba(2, 132, 199, 0.08)' };
      case 'RESPONDING':
        return { color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.3)', background: 'rgba(79, 70, 229, 0.08)' };
      case 'ON_SCENE':
        return { color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.3)', background: 'rgba(22, 163, 74, 0.08)' };
      case 'COMPLETED':
        return { color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.3)', background: 'rgba(22, 163, 74, 0.08)' };
      case 'REVOKED':
        return { color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.08)' };
      default:
        return { color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-base)' };
    }
  };

  const renderAssignmentCard = (assignment) => {
    const isActive = ['ASSIGNED', 'DISPATCHED', 'RESPONDING', 'ON_SCENE'].includes(assignment.status);
    const isRevoked = assignment.status === 'REVOKED';
    const isCompleted = assignment.status === 'COMPLETED';
    const badgeStyle = getStatusBadgeStyle(assignment.status);

    return (
      <div
        key={assignment.id}
        style={{
          background: 'var(--bg-base)',
          border: `1px solid ${isRevoked ? 'rgba(220, 38, 38, 0.25)' : isCompleted ? 'rgba(22, 163, 74, 0.3)' : 'var(--border)'}`,
          opacity: isRevoked ? 0.78 : 1,
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem',
          position: 'relative',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {assignment.resource.name}
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.2rem 0.55rem',
                ...badgeStyle,
              }}
            >
              {assignment.status_display || assignment.status}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {assignment.resource.type_display} · Base: {assignment.resource.location}
          </div>

          {assignment.notes && (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '0.6rem',
              background: 'var(--bg-surface)',
              padding: '0.4rem 0.6rem',
              borderLeft: '2px solid var(--accent)',
              fontStyle: 'italic',
            }}>
              "{assignment.notes}"
            </div>
          )}

          {/* Completed Rescue Acknowledgment Report */}
          {isCompleted && (
            <div style={{
              marginTop: '0.65rem',
              padding: '0.65rem 0.85rem',
              background: 'rgba(22, 163, 74, 0.05)',
              borderLeft: '3px solid #16a34a',
              fontSize: '0.8rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                <strong style={{ color: '#16a34a', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={13} /> Rescue Completed & Debrief Filed
                </strong>
                {assignment.completed_at && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    At: {formatDateTime(assignment.completed_at)}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 0.45rem 0', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{assignment.completion_report || 'Operations completed.'}"
              </p>
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span>Casualties Assisted: <strong>{assignment.casualties_treated}</strong></span>
                <span>Hazard Status: <strong>{assignment.hazard_cleared ? 'Cleared & Neutralized' : 'Monitoring Required'}</strong></span>
              </div>
            </div>
          )}

          {isRevoked && (
            <div style={{
              marginTop: '0.6rem',
              padding: '0.5rem 0.7rem',
              background: 'rgba(220, 38, 38, 0.06)',
              borderLeft: '3px solid #dc2626',
              fontSize: '0.78rem',
              color: '#dc2626',
            }}>
              <strong>Revoked:</strong> {assignment.revocation_reason || 'Recalled by operator'}
              {assignment.revoked_at && (
                <span style={{ display: 'block', fontSize: '0.68rem', opacity: 0.8, marginTop: '0.2rem' }}>
                  At: {formatDateTime(assignment.revoked_at)}
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.65rem' }}>
            {assignment.resource.capabilities?.map((cap) => (
              <span key={cap} className={`capability-tag ${cap}`} style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem' }}>
                {CAPABILITY_LABELS[cap] || cap}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '0.7rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Assigned by <strong>{assignment.assigned_by_name}</strong> · {formatDateTime(assignment.assigned_at)}
          </span>

          {isActive && !isResolved && !isClosed && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRevokingAssignment({ id: assignment.id, unitName: assignment.resource.name });
                setRevocationReason('');
              }}
              style={{
                color: '#dc2626',
                borderColor: 'rgba(220, 38, 38, 0.3)',
                fontSize: '0.72rem',
                padding: '0.25rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Revoke and recall this response unit"
            >
              <RotateCcw size={12} /> Revoke Unit
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ borderLeft: `4px solid ${colors.badge}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ color: colors.badge, display: 'flex', alignItems: 'center' }}>
              <IncidentIcon type={incident.incident_type} size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 className="page-title" style={{ margin: 0 }}>
                  {incident.incident_type_display}
                </h1>
                <span className={`priority-badge ${p}`}>{incident.priority}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                }}>
                  {incident.incident_id}
                </span>
              </div>
              <p className="page-sub" style={{ marginTop: '0.35rem' }}>
                {incident.location_display} — Risk: <strong style={{ color: colors.badge, fontFamily: "'Outfit', sans-serif" }}>{incident.risk_score}</strong> —
                Status: <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.78rem' }}>{incident.status_display || incident.status}</span>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {!isResolved && !isClosed && (
                <button
                  type="button"
                  id="header-dispatch-btn"
                  className="btn btn-secondary"
                  onClick={() => setAssignModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  <Plus size={14} /> Dispatch Unit
                </button>
              )}

              {canApprove && (
                <button
                  id="approve-btn"
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={approving || selectedResources.length === 0}
                >
                  {approving ? 'Approving...' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Check size={14} /> Approve & Dispatch
                    </span>
                  )}
                </button>
              )}

              {isResolved && (
                <button
                  id="close-incident-btn"
                  className="btn"
                  onClick={() => setCloseModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    background: '#1F3A5F',
                    color: '#fff',
                    border: '1px solid #1F3A5F',
                  }}
                >
                  <Archive size={14} /> Close Incident (Sign-Off)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--border)',
          padding: '0 2.5rem',
          background: 'var(--bg-surface)',
          overflowX: 'auto',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #D4AF37' : '2px solid transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '0.85rem 1.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: activeTab === tab ? 700 : 400,
                fontFamily: activeTab === tab ? "'Outfit', sans-serif" : "'Inter', sans-serif",
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                whiteSpace: 'nowrap',
              }}
            >
              {tab === 'tactical map'
                ? 'Tactical Map'
                : tab === 'assigned units'
                ? `Assigned Units (${activeAssignments.length})`
                : tab === 'separation tasks'
                ? `Separation Tasks (${separationTasks.length})`
                : tab}
            </button>
          ))}
        </div>

        <div className="page-body">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Assigned Units Card (Full width on overview) */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="card-title">Assigned Response Units</span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.6rem',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}>
                      {activeAssignments.length} ACTIVE / {assignments.length} TOTAL
                    </span>
                  </div>
                  {!isResolved && !isClosed && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAssignModalOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                    >
                      <Plus size={14} /> Dispatch Additional Unit
                    </button>
                  )}
                </div>

                {assignments.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {assignments.map((assignment) => renderAssignmentCard(assignment))}
                  </div>
                ) : (
                  <div style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-base)',
                    border: '1px dashed var(--border)',
                  }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      No response units are currently assigned to this incident.
                    </div>
                    {canApprove ? (
                      <p style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Review the recommendation below and click "Approve & Dispatch" or assign units manually.
                      </p>
                    ) : !isResolved && !isClosed ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setAssignModalOpen(true)}
                        style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Plus size={14} /> Dispatch Response Unit
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Incident Details */}
              <div className="card">
                <div className="card-header"><span className="card-title">Incident Details</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {[
                    ['Type', incident.incident_type_display],
                    ['Location', incident.location_display],
                    ['Location Detail', incident.location_detail || '—'],
                    ['People Exposed', incident.people_exposed],
                    ['Spread Potential', incident.spread_potential || '—'],
                    ['Confidence', `${Math.round((incident.confidence || 0) * 100)}%`],
                    ['Reported', formatDateTime(incident.created_at)],
                    ...(incident.resolved_at ? [['Resolved', formatDateTime(incident.resolved_at)]] : []),
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.72rem' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource Recommendation */}
              <div className="card">
                <div className="card-header"><span className="card-title">Resource Recommendation</span></div>
                {recommendation?.recommendation ? (
                  <>
                    <div className="resource-card recommended" style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="resource-name">{recommendation.recommendation.name}</div>
                        <span style={{
                          fontSize: '0.68rem',
                          color: '#D4AF37',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.15em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}>
                          <Star size={11} fill="#D4AF37" /> Recommended
                        </span>
                      </div>
                      <div className="resource-type-tag">{recommendation.recommendation.type_display}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                        {recommendation.recommendation.capabilities?.map((c) => (
                          <span key={c} className={`capability-tag ${c}`}>{c}</span>
                        ))}
                      </div>
                    </div>

                    {recommendation.alternatives?.length > 0 && (
                      <>
                        <div style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginBottom: '0.6rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.2em',
                        }}>
                          Alternatives
                        </div>
                        {recommendation.alternatives.map((r) => (
                          <div key={r.id} className="resource-card" style={{ marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="resource-name" style={{ fontSize: '0.88rem' }}>{r.name}</div>
                              {canApprove && (
                                <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', fontSize: '0.72rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedResources.includes(r.id)}
                                    onChange={() => setSelectedResources((prev) =>
                                      prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                                    )}
                                  />
                                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Include</span>
                                </label>
                              )}
                            </div>
                            <div className="resource-type-tag">{r.type_display}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '1.5rem' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {cameras.map((cam) => (
                      <div key={cam.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        padding: '0.6rem',
                        background: 'var(--bg-base)',
                        borderRadius: '0',
                        border: '1px solid var(--border)',
                      }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{cam.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{cam.coverage_description}</span>
                        <span style={{
                          color: cam.status === 'ONLINE' ? '#16a34a' : '#dc2626',
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          fontWeight: 600,
                        }}>{cam.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No cameras covering this location</p>
                )}
              </div>

              {/* Tactical Zone & Perimeter Overview Card */}
              <div className="card" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
                <div
                  className="card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1.25rem',
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Compass size={16} color="var(--gold)" />
                    <span className="card-title">Tactical Zone & Spatial Perimeter</span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.7rem',
                        color: 'var(--gold)',
                        padding: '0.15rem 0.4rem',
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid rgba(212,175,55,0.25)',
                      }}
                    >
                      SECTOR: {incident.location}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('tactical map')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                  >
                    Expand Interactive Map Tab
                  </button>
                </div>
                <div style={{ height: '320px', width: '100%', position: 'relative' }}>
                  <CampusTacticalMap
                    incidents={[incident]}
                    cameras={cameras}
                    resources={allResources}
                    separationTasks={separationTasks}
                    focusedLocation={incident.location}
                    selectedIncidentId={incident.id}
                    compactMode={true}
                    customHeight="320px"
                  />
                </div>
              </div>

              {/* Ground Verification & Security Guard Sign-Off Card */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldCheck size={18} color={approvedReports.length > 0 ? '#16a34a' : 'var(--navy)'} />
                    <span className="card-title">Ground Verification & Security Guard Sign-Off</span>
                  </div>
                  {approvedReports.length > 0 ? (
                    <span style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#16a34a',
                      background: 'rgba(22, 163, 74, 0.08)',
                      padding: '0.2rem 0.6rem',
                      border: '1px solid rgba(22, 163, 74, 0.3)',
                    }}>
                      ✓ Verified Safe to Resolve ({approvedReports.length}/{reports.length} Reports)
                    </span>
                  ) : (
                    <span style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#d97706',
                      background: 'rgba(245, 158, 11, 0.08)',
                      padding: '0.2rem 0.6rem',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}>
                      ⏳ Pending Security Ground Check
                    </span>
                  )}
                </div>

                {reports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reports.map((rep) => (
                      <div
                        key={rep.id}
                        style={{
                          background: rep.can_resolve ? 'rgba(22, 163, 74, 0.03)' : 'var(--bg-base)',
                          border: `1px solid ${rep.can_resolve ? 'rgba(22, 163, 74, 0.25)' : 'var(--border)'}`,
                          borderLeft: `4px solid ${rep.can_resolve ? '#16a34a' : '#f59e0b'}`,
                          padding: '0.9rem 1.1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700 }}>
                              Report #{rep.id} ({rep.source})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>
                              by {rep.reporter_name} · {formatDateTime(rep.created_at)}
                            </span>
                          </div>
                          {rep.can_resolve ? (
                            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={13} /> Approved by {rep.security_approved_by_name}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                              Awaiting Guard Patrol Check
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                          {rep.description}
                        </div>

                        {rep.can_resolve && rep.security_approval_notes && (
                          <div style={{
                            background: 'rgba(22, 163, 74, 0.06)',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid rgba(22, 163, 74, 0.2)',
                            fontSize: '0.78rem',
                            color: '#15803d',
                            fontStyle: 'italic',
                          }}>
                            <strong>Officer Inspection Notes:</strong> "{rep.security_approval_notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No individual intake reports attached to this incident.</p>
                )}
              </div>

              {/* Perimeter Separation & Containment Card */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ListTodo size={18} color="var(--navy)" />
                    <span className="card-title">Perimeter Separation & Containment Tasks</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.6rem',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                    }}>
                      {separationTasks.filter((t) => t.status === 'COMPLETED').length}/{separationTasks.length} COMPLETED
                    </span>
                    {!isResolved && !isClosed && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setTaskLocation(incident.location_display || incident.location);
                          setTaskModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                      >
                        <Plus size={13} /> Deploy Task
                      </button>
                    )}
                  </div>
                </div>

                {separationTasks.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
                    {separationTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border)',
                          borderLeft: `4px solid ${
                            task.status === 'COMPLETED' ? '#16a34a' : task.status === 'IN_PROGRESS' ? '#f59e0b' : '#ef4444'
                          }`,
                          padding: '0.9rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{task.title}</div>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.45rem',
                              background: task.status === 'COMPLETED' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: task.status === 'COMPLETED' ? '#16a34a' : '#ef4444',
                            }}>
                              {task.status_display || task.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                            {task.category_display} · Sector: {task.target_location || 'Perimeter'} · Role: {task.assigned_role}
                          </div>
                          {task.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              {task.description}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {task.priority_display}
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {task.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setCompletingTask(task)}
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                              >
                                Complete
                              </button>
                            )}
                            {task.status === 'COMPLETED' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleUpdateSeparationTaskStatus(task.id, 'IN_PROGRESS')}
                                style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No separation or perimeter isolation tasks deployed for this incident.</p>
                )}
              </div>
            </div>
          )}

          {/* Separation Tasks Dedicated Tab */}
          {activeTab === 'separation tasks' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="card-title">Incident Separation & Perimeter Containment Tasks</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Active cordons, zone isolation, and building lockdowns protecting campus sectors
                  </div>
                </div>
                {!isResolved && !isClosed && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setTaskLocation(incident.location_display || incident.location);
                      setTaskModalOpen(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={14} /> Deploy Separation Task
                  </button>
                )}
              </div>

              {separationTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {separationTasks.map((task) => (
                    <div
                      key={task.id}
                      className="card"
                      style={{
                        padding: '1rem 1.25rem',
                        borderLeft: `4px solid ${
                          task.status === 'COMPLETED' ? '#16a34a' : task.status === 'IN_PROGRESS' ? '#f59e0b' : '#ef4444'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{task.title}</span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.45rem',
                              background: 'var(--bg-secondary)',
                            }}>
                              {task.category_display}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                            Sector: <strong>{task.target_location || 'Perimeter'}</strong> · Assigned Role: <strong>{task.assigned_role}</strong> · Priority: <strong>{task.priority_display}</strong>
                          </div>
                          {task.description && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: '0.3rem 0', lineHeight: 1.4 }}>
                              {task.description}
                            </p>
                          )}
                          {task.status === 'COMPLETED' && task.completion_notes && (
                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontStyle: 'italic', marginTop: '0.3rem' }}>
                              Debrief: "{task.completion_notes}"
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.2rem 0.55rem',
                            background: task.status === 'COMPLETED' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: task.status === 'COMPLETED' ? '#16a34a' : '#d97706',
                          }}>
                            {task.status_display || task.status}
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {task.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setCompletingTask(task)}
                                style={{ fontSize: '0.72rem' }}
                              >
                                Mark Completed
                              </button>
                            )}
                            {task.status === 'COMPLETED' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleUpdateSeparationTaskStatus(task.id, 'IN_PROGRESS')}
                                style={{ fontSize: '0.72rem' }}
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <ListTodo size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <p className="empty-title">No Separation Tasks Deployed</p>
                  <p className="empty-sub" style={{ maxWidth: '420px', margin: '0.5rem auto 1rem auto' }}>
                    Isolate sectors, set up perimeter cordons, and secure access gates to contain the hazard.
                  </p>
                  {!isResolved && !isClosed && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setTaskLocation(incident.location_display || incident.location);
                        setTaskModalOpen(true);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={14} /> Deploy Separation Task
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tactical Map Tab */}
          {activeTab === 'tactical map' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <span className="card-title">Zone Tactical Geometry & Spatial Perimeter</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Incident Location: <strong>{incident.location_display || incident.location}</strong> — Active cordon containment, CCTV coverage, and arriving units
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/operator/map')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                >
                  <Compass size={13} color="var(--gold)" /> Full Campus View
                </button>
              </div>
              <div style={{ height: '640px', width: '100%', position: 'relative' }}>
                <CampusTacticalMap
                  incidents={[incident]}
                  cameras={cameras}
                  resources={allResources}
                  separationTasks={separationTasks}
                  focusedLocation={incident.location}
                  selectedIncidentId={incident.id}
                  customHeight="640px"
                />
              </div>
            </div>
          )}

          {/* Assigned Units Dedicated Tab */}
          {activeTab === 'assigned units' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="card-title">Mission Deployments & Operational Status</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Live tracking, debrief acknowledgments, and operational revocations for this incident
                  </div>
                </div>
                {!isResolved && !isClosed && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setAssignModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={14} /> Dispatch Unit
                  </button>
                )}
              </div>

              {assignments.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {assignments.map((assignment) => renderAssignmentCard(assignment))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <Shield size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <p className="empty-title">No Units Dispatched</p>
                  <p className="empty-sub" style={{ maxWidth: '420px', margin: '0.5rem auto 1rem auto' }}>
                    This incident does not currently have any active field units assigned. Dispatch available response teams as needed.
                  </p>
                  {!isResolved && !isClosed && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setAssignModalOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={14} /> Dispatch Response Unit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'ai analysis' && (
            <div className="card">
              <div className="card-header"><span className="card-title">AI Incident Understanding</span></div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                }}>AI Summary</div>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>
                  {incident.ai_summary || 'No AI summary available.'}
                </p>
              </div>
              <hr className="section-divider" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                  }}>Severity Factors</div>
                  {incident.severity_factors?.length > 0
                    ? incident.severity_factors.map((f, i) => (
                      <div key={i} style={{
                        fontSize: '0.85rem',
                        padding: '0.5rem 0',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontWeight: 300,
                      }}>
                        • {f}
                      </div>
                    ))
                    : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</p>
                  }
                </div>
                <div>
                  <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                  }}>Extraction Metadata</div>
                  {[
                    ['Model Confidence', `${Math.round((incident.confidence || 0) * 100)}%`],
                    ['Spread Potential', incident.spread_potential || '—'],
                    ['People Exposed', incident.people_exposed],
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{value}</span>
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
                <span style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: colors.badge,
                  letterSpacing: '-0.02em',
                }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {cameras.map((cam) => (
                    <div key={cam.id} style={{
                      background: 'var(--bg-base)',
                      borderRadius: '0',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        background: 'var(--navy)',
                        aspectRatio: '16/9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.8rem',
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', opacity: 0.8 }}>
                            <Video size={32} />
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#fff' }}>{cam.name}</div>
                          <div style={{
                            fontSize: '0.68rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            marginTop: '0.25rem',
                            color: cam.status === 'ONLINE' ? '#86efac' : '#fca5a5',
                          }}>{cam.status}</div>
                        </div>
                      </div>
                      <div style={{ padding: '1rem' }}>
                        <div style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}>{cam.coverage_description}</div>
                        <div style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.25rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}>{cam.location_block}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                    <VideoOff size={32} strokeWidth={1.5} />
                  </div>
                  <p className="empty-title">No cameras at this location</p>
                </div>
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

        {/* Modal: Revoke Unit Assignment */}
        {revokingAssignment && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', border: '1px solid #dc2626', backgroundColor: '#FFFFFF', background: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                  <AlertTriangle size={18} />
                  <span className="card-title" style={{ color: '#dc2626' }}>Revoke Unit Assignment</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRevokingAssignment(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0.75rem 0' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  You are recalling <strong>{revokingAssignment.unitName}</strong> from this mission. The unit's operational status will return to Available (if not on other active missions) and this action will be logged on the permanent audit timeline.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.45rem',
                  }}>
                    Quick Reason Selection
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      'Incident Downgraded',
                      'Higher Priority Reallocation',
                      'False Alarm / Situation Contained',
                      'Assigned in Error',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRevocationReason(preset)}
                        style={{
                          background: revocationReason === preset ? '#D4AF37' : 'var(--bg-base)',
                          color: revocationReason === preset ? '#fff' : 'var(--text-primary)',
                          border: '1px solid var(--border)',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

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
                    Revocation Reason / Operational Note
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Specify why this response unit is being revoked..."
                    value={revocationReason}
                    onChange={(e) => setRevocationReason(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRevokingAssignment(null)}
                    disabled={revoking}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleRevokeAssignment}
                    disabled={revoking}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: '1px solid #dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <RotateCcw size={14} /> {revoking ? 'Revoking...' : 'Confirm Revocation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Dispatch Additional Unit */}
        {assignModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}>
            <div className="card" style={{ maxWidth: '520px', width: '100%', border: '1px solid var(--border-bright)', backgroundColor: '#FFFFFF', background: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Dispatch Response Unit</span>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0.75rem 0' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Deploy a response team to <strong>{incident.incident_id}</strong> ({incident.incident_type_display} at {incident.location_display}).
                </p>

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
                    Select Unit
                  </label>
                  <select
                    className="input"
                    value={selectedNewResourceId}
                    onChange={(e) => setSelectedNewResourceId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Choose a response unit --</option>
                    {allResources
                      .filter((r) => !activeAssignments.some((a) => a.resource?.id === r.id))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.type_display}) — [{r.status}] — Base: {r.location}
                        </option>
                      ))
                    }
                  </select>
                </div>

                {selectedNewResourceId && (() => {
                  const selected = allResources.find((r) => String(r.id) === String(selectedNewResourceId));
                  if (!selected) return null;
                  return (
                    <div style={{
                      marginBottom: '1.25rem',
                      padding: '0.85rem',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selected.name}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: selected.status === 'AVAILABLE' ? '#16a34a' : '#ea580c',
                        }}>
                          {selected.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {selected.type_display} · {selected.contact || 'No direct phone'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {selected.capabilities?.map((c) => (
                          <span key={c} className={`capability-tag ${c}`} style={{ fontSize: '0.65rem' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.45rem',
                  }}>
                    Operational Notes / Directives (Optional)
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Provide staging location, route, or specific directives..."
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAssignModalOpen(false)}
                    disabled={assigning}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAssignResource}
                    disabled={assigning || !selectedNewResourceId}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send size={14} /> {assigning ? 'Dispatching...' : 'Dispatch Unit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Administrative Incident Closure */}
        {closeModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', border: '1px solid var(--border-bright)', backgroundColor: '#FFFFFF', background: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Administrative Incident Closure</span>
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0.75rem 0' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  All field response units have completed rescue and filed operational acknowledgments. Perform final operator sign-off to archive <strong>{incident.incident_id}</strong>.
                </p>

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
                    Closure Summary / Archive Directives (Optional)
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Official incident closure assessment..."
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCloseModalOpen(false)}
                    disabled={closingIncident}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCloseIncident}
                    disabled={closingIncident}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1F3A5F', borderColor: '#1F3A5F' }}
                  >
                    <Archive size={14} /> {closingIncident ? 'Closing...' : 'Confirm Closure & Archive'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Deploy Separation Task */}
        {taskModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}>
            <div className="card" style={{ maxWidth: '580px', width: '100%', border: '1px solid var(--border)', backgroundColor: '#FFFFFF', background: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="var(--navy)" />
                  <span className="card-title">Deploy Incident Separation Task</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSeparationTask} style={{ padding: '0.75rem 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Category
                    </label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    >
                      <option value="PERIMETER_CORDON">Perimeter Cordon & Boundary</option>
                      <option value="ACCESS_LOCKDOWN">Access Point Lockdown</option>
                      <option value="SECTOR_ISOLATION">Sector & Zone Isolation</option>
                      <option value="CROWD_DIVERSION">Crowd & Traffic Diversion</option>
                      <option value="HVAC_VENTILATION">HVAC & Ventilation Shutoff</option>
                      <option value="UTILITY_ISOLATION">Utility / Power Cutoff</option>
                      <option value="EVACUATION_CLEARANCE">Evacuation Clearance</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Priority
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    >
                      <option value="URGENT">Urgent / Immediate</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Set up 100m cordon at East Entrance"
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.82rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Target Sector
                    </label>
                    <input
                      type="text"
                      value={taskLocation}
                      onChange={(e) => setTaskLocation(e.target.value)}
                      placeholder="e.g. Block 2 West Wing"
                      style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Assigned Role
                    </label>
                    <select
                      value={taskRole}
                      onChange={(e) => setTaskRole(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    >
                      <option value="Security Staff">Security Staff</option>
                      <option value="Fire Team">Fire Team</option>
                      <option value="Facilities Team">Facilities Team</option>
                      <option value="Hazmat / EHS Team">Hazmat / EHS Team</option>
                      <option value="Medical Team">Medical Team</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Tactical Directives
                  </label>
                  <textarea
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Instructions for positioning, isolation barriers, pedestrian control..."
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', lineHeight: 1.4 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTaskModalOpen(false)}
                    disabled={creatingTask}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingTask}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={14} />
                    {creatingTask ? 'Deploying...' : 'Deploy Separation Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Complete Separation Task */}
        {completingTask && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}>
            <div className="card" style={{ maxWidth: '460px', width: '100%', border: '1px solid var(--border)', backgroundColor: '#FFFFFF', background: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Complete Separation Task</span>
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0.75rem 0' }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Completing: <strong>{completingTask.title}</strong>
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Debrief Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="e.g. Cordon secure, gates locked, guards in position..."
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCompletingTask(null)}
                    disabled={updatingTask}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleUpdateSeparationTaskStatus(completingTask.id, 'COMPLETED', completionNotes)}
                    disabled={updatingTask}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check size={14} />
                    {updatingTask ? 'Saving...' : 'Confirm Completed'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

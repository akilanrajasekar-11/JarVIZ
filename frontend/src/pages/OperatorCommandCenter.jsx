import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import IncidentCard from '../components/IncidentCard';
import OperatorReportsBoard from '../components/OperatorReportsBoard';
import {
  getIncidents,
  getAllReports,
  getAllSeparationTasks,
  createSeparationTask,
  updateSeparationTaskStatus,
} from '../services/api';
import { incidentSocket } from '../services/websocket';
import {
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Plus,
  Shield,
  Clock,
  Layers,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  ListTodo,
  FileText,
} from 'lucide-react';

const SEPARATION_PRESETS = [
  {
    title: 'Establish 100m Perimeter Cordon',
    category: 'PERIMETER_CORDON',
    priority: 'URGENT',
    assigned_role: 'Security Staff',
    description: 'Deploy boundary caution tape and cones at 100m radius. Keep all students and unauthorized staff out.',
  },
  {
    title: 'Lock Down Entry / Exit Access Gates',
    category: 'ACCESS_LOCKDOWN',
    priority: 'HIGH',
    assigned_role: 'Security Staff',
    description: 'Secure exterior doorways and station guards at primary ingress points to prevent entry.',
  },
  {
    title: 'HVAC & Air Duct Isolation Shutoff',
    category: 'HVAC_VENTILATION',
    priority: 'URGENT',
    assigned_role: 'Facilities Team',
    description: 'Shut down ventilation fans and seal air intake dampers to prevent smoke/chemical migration.',
  },
  {
    title: 'Pedestrian & Foot Traffic Diversion',
    category: 'CROWD_DIVERSION',
    priority: 'HIGH',
    assigned_role: 'Security Staff',
    description: 'Reroute student walkways toward open sports ground and establish designated emergency vehicle lane.',
  },
  {
    title: 'Utility & Main Electrical Substation Cutoff',
    category: 'UTILITY_ISOLATION',
    priority: 'URGENT',
    assigned_role: 'Facilities Team',
    description: 'Isolate main breaker panels and confirm gas shutoff valves are turned off.',
  },
  {
    title: 'Adjacent Wing Evacuation Clearance',
    category: 'EVACUATION_CLEARANCE',
    priority: 'HIGH',
    assigned_role: 'Security Staff',
    description: 'Sweep adjacent classrooms, restrooms, and offices to confirm complete non-affected zone separation.',
  },
];

export default function OperatorCommandCenter() {
  const [incidents, setIncidents] = useState([]);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'incidents' | 'separation'
  const [selectedIncidentFilter, setSelectedIncidentFilter] = useState('ALL');
  const navigate = useNavigate();

  // Create Task Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('PERIMETER_CORDON');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskRole, setTaskRole] = useState('Security Staff');
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [taskDescription, setTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Complete Task Modal state
  const [completingTask, setCompletingTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);

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

  const fetchReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      const { data } = await getAllReports();
      setReports(data);
    } catch (e) {
      console.error('Failed to fetch reports for operator dashboard:', e);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      const { data } = await getAllSeparationTasks({ active_only: true });
      setTasks(data);
    } catch (e) {
      console.error('Failed to fetch separation tasks:', e);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchTasks();
    fetchReports();

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
        fetchTasks();
        fetchReports();
      }
    });

    return () => { unsub(); };
  }, [fetchIncidents, fetchTasks, fetchReports]);

  const activeIncidents = incidents.filter(
    (i) => !['RESOLVED', 'CLOSED'].includes(i.status)
  );

  const handleOpenCreateTaskModal = (defaultIncidentId = null) => {
    const incId = defaultIncidentId || (activeIncidents[0] ? String(activeIncidents[0].id) : '');
    setSelectedIncidentId(incId);
    const inc = activeIncidents.find((i) => String(i.id) === String(incId));
    setTaskLocation(inc ? inc.location_display || inc.location : '');
    setTaskTitle('');
    setTaskCategory('PERIMETER_CORDON');
    setTaskRole('Security Staff');
    setTaskPriority('HIGH');
    setTaskDescription('');
    setTaskModalOpen(true);
  };

  const applyPreset = (preset) => {
    setTaskTitle(preset.title);
    setTaskCategory(preset.category);
    setTaskRole(preset.assigned_role);
    setTaskPriority(preset.priority);
    setTaskDescription(preset.description);
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncidentId || !taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      await createSeparationTask(selectedIncidentId, {
        title: taskTitle.trim(),
        category: taskCategory,
        target_location: taskLocation.trim(),
        assigned_role: taskRole.trim(),
        priority: taskPriority,
        description: taskDescription.trim(),
      });
      setTaskModalOpen(false);
      await fetchTasks();
      await fetchIncidents();
    } catch (err) {
      console.error('Failed to create separation task:', err);
      alert('Failed to deploy separation task. Please try again.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus, notes = '') => {
    try {
      setUpdatingTask(true);
      await updateSeparationTaskStatus(taskId, {
        status: newStatus,
        completion_notes: notes,
      });
      setCompletingTask(null);
      setCompletionNotes('');
      await fetchTasks();
      await fetchIncidents();
    } catch (err) {
      console.error('Failed to update task status:', err);
      alert('Failed to update task status.');
    } finally {
      setUpdatingTask(false);
    }
  };

  const p0 = activeIncidents.filter((i) => i.priority === 'P0');
  const p1 = activeIncidents.filter((i) => i.priority === 'P1');
  const awaiting = incidents.filter((i) => i.status === 'AWAITING_APPROVAL');

  const activeReports = reports.filter(
    (r) => r.status !== 'RESOLVED' && r.status !== 'DISMISSED'
  );
  const resolvedReportsCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const readyToResolveReportsCount = reports.filter(
    (r) => r.can_resolve || r.status === 'SECURITY_APPROVED'
  ).length;

  const pendingTasksCount = tasks.filter((t) => t.status === 'PENDING').length;
  const inProgressTasksCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const filteredTasks = tasks.filter((t) => {
    if (selectedIncidentFilter === 'ALL') return true;
    return String(t.incident) === String(selectedIncidentFilter);
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 className="page-title">Command Center</h1>
              <p className="page-sub">Live emergency queue, reports monitoring & active containment separation</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {wsConnected && <span className="live-dot">Live</span>}
              {lastUpdate && (
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.05em',
                }}>
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { fetchIncidents(); fetchTasks(); fetchReports(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCw size={12} /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="page-body">
          {/* Top Operational Stats */}
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-label">All Reports</div>
              <div className="stat-value">{reports.length}</div>
              <div className="stat-sub">{resolvedReportsCount} resolved logs</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #dc2626' }}>
              <div className="stat-label">Active Reports</div>
              <div className={`stat-value ${activeReports.length ? 'critical' : ''}`}>{activeReports.length}</div>
              <div className="stat-sub">
                {readyToResolveReportsCount} verified ready to resolve
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Incidents</div>
              <div className="stat-value">{activeIncidents.length}</div>
              <div className="stat-sub">{p0.length} P0 · {p1.length} P1 critical</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid var(--navy)' }}>
              <div className="stat-label">Separation Tasks</div>
              <div className="stat-value" style={{ color: 'var(--navy)' }}>
                {tasks.length}
              </div>
              <div className="stat-sub">
                {completedTasksCount} completed · {inProgressTasksCount + pendingTasksCount} active
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.75rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('reports')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={14} /> Emergency Reports (All & Active Columns) ({reports.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'incidents' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('incidents')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Layers size={14} /> Live Incidents Queue ({incidents.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'separation' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('separation')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ListTodo size={14} /> Active Incident Separation Tasks ({tasks.length})
              </button>
            </div>

            {activeIncidents.length > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenCreateTaskModal()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} /> Deploy Separation Task
              </button>
            )}
          </div>

          {/* TAB 0: Emergency Reports 2-Column Board */}
          {activeTab === 'reports' && (
            <OperatorReportsBoard
              reports={reports}
              loading={reportsLoading}
              onRefresh={fetchReports}
            />
          )}

          {/* TAB 1: Incidents Priority Queue */}
          {activeTab === 'incidents' && (
            <>
              {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : incidents.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#16a34a' }}>
                    <CheckCircle2 size={40} strokeWidth={1.5} />
                  </div>
                  <p className="empty-title">All clear</p>
                  <p className="empty-sub">No active incidents on campus</p>
                </div>
              ) : (
                <>
                  {awaiting.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <div style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#b45309',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <AlertCircle size={14} color="#b45309" />
                        <span>Awaiting Your Approval ({awaiting.length})</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(180, 83, 9, 0.2)' }} />
                      </div>
                      {awaiting.map((inc) => (
                        <IncidentCard key={inc.id} incident={inc} onClick={(i) => navigate(`/operator/incidents/${i.id}`)} />
                      ))}
                    </div>
                  )}

                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3em',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}>
                    <span>All Incidents — Priority Queue</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  </div>
                  {incidents.map((inc) => (
                    <IncidentCard key={inc.id} incident={inc} onClick={(i) => navigate(`/operator/incidents/${i.id}`)} />
                  ))}
                </>
              )}
            </>
          )}

          {/* TAB 2: Active Incident Separation Tasks */}
          {activeTab === 'separation' && (
            <div>
              {/* Filter bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border)',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.8rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                  }}>
                    Filter by Active Incident:
                  </span>
                  <select
                    value={selectedIncidentFilter}
                    onChange={(e) => setSelectedIncidentFilter(e.target.value)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.8rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="ALL">All Active Incidents ({tasks.length} tasks)</option>
                    {activeIncidents.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        {inc.incident_id} — {inc.incident_type_display} ({inc.location_display})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontWeight: 600 }}>
                    {pendingTasksCount} Pending
                  </span>
                  <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.08)', color: '#d97706', fontWeight: 600 }}>
                    {inProgressTasksCount} In Progress
                  </span>
                  <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', fontWeight: 600 }}>
                    {completedTasksCount} Completed
                  </span>
                </div>
              </div>

              {tasksLoading ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : filteredTasks.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--navy)' }}>
                    <Shield size={40} strokeWidth={1.5} />
                  </div>
                  <p className="empty-title">No separation tasks active</p>
                  <p className="empty-sub">Deploy perimeter cordons, access lockdowns, or sector isolations to protect campus sectors.</p>
                  {activeIncidents.length > 0 && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenCreateTaskModal()}
                      style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={15} /> Add Separation Task
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {filteredTasks.map((task) => {
                    const isCompleted = task.status === 'COMPLETED';
                    const isInProgress = task.status === 'IN_PROGRESS';
                    return (
                      <div
                        key={task.id}
                        className="card"
                        style={{
                          padding: '1.15rem 1.35rem',
                          borderLeft: isCompleted
                            ? '3px solid #16a34a'
                            : isInProgress
                            ? '3px solid #f59e0b'
                            : '3px solid #ef4444',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <span style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'rgba(31,58,95,0.08)',
                                color: 'var(--navy)',
                                padding: '0.15rem 0.45rem',
                                border: '1px solid rgba(31,58,95,0.25)',
                              }}>
                                {task.incident_id_str}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.45rem',
                                background: task.priority === 'URGENT' ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
                                color: task.priority === 'URGENT' ? '#dc2626' : 'var(--text-muted)',
                              }}>
                                {task.priority_display || task.priority}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                background: 'var(--bg-secondary)',
                                padding: '0.15rem 0.45rem',
                              }}>
                                {task.category_display}
                              </span>
                            </div>

                            <div style={{
                              fontFamily: "'Outfit', sans-serif",
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              marginBottom: '0.25rem',
                            }}>
                              {task.title}
                            </div>

                            {task.description && (
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.45 }}>
                                {task.description}
                              </div>
                            )}

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Sector / Target: <strong>{task.target_location || 'Campus Perimeter'}</strong></span>
                              <span>Assigned: <strong>{task.assigned_role || 'Emergency Personnel'}</strong></span>
                              <span>Deployed by: <strong>{task.created_by_name}</strong></span>
                              <span>Time: {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Action Status Controls */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.2rem 0.55rem',
                              background: isCompleted
                                ? 'rgba(22, 163, 74, 0.1)'
                                : isInProgress
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                              color: isCompleted ? '#16a34a' : isInProgress ? '#d97706' : '#dc2626',
                              border: isCompleted
                                ? '1px solid rgba(22, 163, 74, 0.25)'
                                : isInProgress
                                ? '1px solid rgba(245, 158, 11, 0.25)'
                                : '1px solid rgba(239, 68, 68, 0.25)',
                            }}>
                              {task.status_display || task.status}
                            </span>

                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                              {!isCompleted && !isInProgress && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                                  disabled={updatingTask}
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  Start Task
                                </button>
                              )}
                              {!isCompleted && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setCompletingTask(task)}
                                  disabled={updatingTask}
                                  style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Check size={12} /> Complete
                                </button>
                              )}
                              {isCompleted && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                                  disabled={updatingTask}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Completion Details if Completed */}
                        {isCompleted && (
                          <div style={{
                            marginTop: '0.6rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(22, 163, 74, 0.04)',
                            border: '1px solid rgba(22, 163, 74, 0.2)',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <span style={{ color: '#15803d', fontWeight: 600 }}>
                              ✓ Completed by {task.completed_by_name || 'Personnel'}
                              {task.completion_notes ? `: "${task.completion_notes}"` : ''}
                            </span>
                            {task.completed_at && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                                {new Date(task.completed_at).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Deploy Separation Task */}
        {taskModalOpen && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}>
            <div className="modal-card" style={{
              backgroundColor: '#FFFFFF',
              background: '#FFFFFF',
              border: '1px solid var(--border-bright)',
              width: '90%',
              maxWidth: '620px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} color="var(--navy)" />
                  <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700 }}>
                    Deploy Active Incident Separation Task
                  </h3>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setTaskModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 1-Click Tactical Separation Presets */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                }}>
                  1-Click Tactical Separation Presets:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                  {SEPARATION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        lineHeight: 1.3,
                      }}
                    >
                      <strong style={{ display: 'block', color: 'var(--navy)' }}>{preset.title}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{preset.assigned_role} · {preset.priority}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCreateTaskSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Target Incident *
                    </label>
                    <select
                      value={selectedIncidentId}
                      onChange={(e) => {
                        setSelectedIncidentId(e.target.value);
                        const inc = activeIncidents.find((i) => String(i.id) === e.target.value);
                        if (inc) setTaskLocation(inc.location_display || inc.location);
                      }}
                      required
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      {activeIncidents.map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          {inc.incident_id} — {inc.incident_type_display} ({inc.priority})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Separation Category
                    </label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="PERIMETER_CORDON">Perimeter Cordon & Barrier</option>
                      <option value="ACCESS_LOCKDOWN">Access Point Lockdown</option>
                      <option value="SECTOR_ISOLATION">Sector & Zone Isolation</option>
                      <option value="CROWD_DIVERSION">Crowd & Traffic Diversion</option>
                      <option value="HVAC_VENTILATION">HVAC & Ventilation Shutoff</option>
                      <option value="UTILITY_ISOLATION">Utility / Power / Gas Cutoff</option>
                      <option value="EVACUATION_CLEARANCE">Evacuation Clearance</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Cordon 100m perimeter around Block 2 East Gate"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Target Sector / Zone
                    </label>
                    <input
                      type="text"
                      value={taskLocation}
                      onChange={(e) => setTaskLocation(e.target.value)}
                      placeholder="e.g. Block 2 West Corridor"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Assigned Role / Unit
                    </label>
                    <select
                      value={taskRole}
                      onChange={(e) => setTaskRole(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="Security Staff">Security Staff</option>
                      <option value="Fire Team">Fire Team</option>
                      <option value="Facilities Team">Facilities Team</option>
                      <option value="Medical Team">Medical Team</option>
                      <option value="Hazmat / EHS Team">Hazmat / EHS Team</option>
                      <option value="Command Operator">Command Operator</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Priority
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="URGENT">Urgent / Immediate</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Tactical Directives & Containment Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Specific instructions for barrier placement, security checkpoints, evacuation paths, or utility shutdowns..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', lineHeight: 1.4 }}
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
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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
          <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}>
            <div className="modal-card" style={{
              backgroundColor: '#FFFFFF',
              background: '#FFFFFF',
              border: '1px solid var(--border-bright)',
              width: '90%',
              maxWidth: '480px',
              padding: '1.5rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700 }}>
                  Mark Task as Completed
                </h3>
                <button
                  className="btn-icon"
                  onClick={() => setCompletingTask(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Completing: <strong>{completingTask.title}</strong>
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                  Execution Debrief / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Cordon confirmed secure. 2 officers positioned at gate. Non-affected rooms cleared."
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem', border: '1px solid var(--border)', backgroundColor: '#FFFFFF', background: '#FFFFFF', color: 'var(--text-primary)' }}
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
                  onClick={() => handleStatusChange(completingTask.id, 'COMPLETED', completionNotes)}
                  disabled={updatingTask}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Check size={14} />
                  {updatingTask ? 'Saving...' : 'Confirm Completed'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

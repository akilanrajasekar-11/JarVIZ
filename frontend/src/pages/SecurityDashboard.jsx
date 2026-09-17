import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, securityApproveReport } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  FileText,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved'
  const [selectedReport, setSelectedReport] = useState(null);

  // Modal state
  const [approvalNotes, setApprovalNotes] = useState('');
  const [certifyResolved, setCertifyResolved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getAllReports();
      setReports(data);
    } catch (e) {
      console.error('Failed to fetch reports for security portal:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openApproveModal = (report) => {
    setSelectedReport(report);
    setApprovalNotes(
      report.security_approval_notes ||
        `On-scene patrol inspection conducted at ${report.location}. Area verified secure and contained.`
    );
    setCertifyResolved(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      setSubmitting(true);
      await securityApproveReport(selectedReport.id, {
        notes: approvalNotes,
        mark_resolved: certifyResolved,
        can_resolve: true,
      });
      setSelectedReport(null);
      await fetchReports();
    } catch (err) {
      console.error('Failed to approve report:', err);
      alert('Failed to submit security approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = reports.filter((r) => !r.can_resolve).length;
  const approvedCount = reports.filter((r) => r.can_resolve).length;

  const filteredReports = reports.filter((r) => {
    if (filter === 'pending') return !r.can_resolve;
    if (filter === 'approved') return r.can_resolve;
    return true;
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: 'var(--navy)', background: 'rgba(31,58,95,0.08)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                  <Shield size={18} strokeWidth={2.2} />
                </span>
                <h1 className="page-title">Security Guard Command Portal</h1>
              </div>
              <p className="page-sub">
                Ground verification & response sign-off — inspect reports and authorize incident resolution
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchReports}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RotateCw size={12} /> Refresh Reports
            </button>
          </div>
        </div>

        <div className="page-body">
          {/* Top Operational Metrics */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-label">Total Campus Reports</div>
              <div className="stat-value">{reports.length}</div>
              <div className="stat-sub">Across all sectors</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Ground Check</div>
              <div className={`stat-value ${pendingCount > 0 ? 'warning' : 'success'}`}>
                {pendingCount}
              </div>
              <div className="stat-sub">Requires security sign-off</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approved for Resolution</div>
              <div className="stat-value success">{approvedCount}</div>
              <div className="stat-sub">Verified safe on-scene</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Guard On Duty</div>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--navy)',
                marginTop: '0.25rem',
              }}>
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </div>
              <div className="stat-sub">Campus Patrol Division</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.8rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('pending')}
              >
                Pending Verification ({pendingCount})
              </button>
              <button
                className={`btn btn-sm ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('approved')}
              >
                Approved to Resolve ({approvedCount})
              </button>
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('all')}
              >
                All Reports ({reports.length})
              </button>
            </div>
          </div>

          {/* Reports Feed */}
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#16a34a' }}>
                <CheckCircle2 size={40} strokeWidth={1.5} />
              </div>
              <p className="empty-title">
                {filter === 'pending' ? 'All clear — No reports pending verification' : 'No reports found'}
              </p>
              <p className="empty-sub">All active report responses have been inspected and signed off.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {filteredReports.map((report) => {
                const isApproved = report.can_resolve;
                return (
                  <div
                    key={report.id}
                    className="card"
                    style={{
                      borderLeft: isApproved
                        ? '3px solid #16a34a'
                        : '3px solid #f59e0b',
                      padding: '1.2rem 1.4rem',
                      backgroundColor: '#FFFFFF',
                      background: isApproved
                        ? '#F4FAF5'
                        : '#FFFFFF',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                          }}>
                            REPORT #{report.id}
                          </span>
                          {report.incident_id && (
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              background: 'rgba(31,58,95,0.08)',
                              color: 'var(--navy)',
                              border: '1px solid rgba(31,58,95,0.25)',
                            }}>
                              INCIDENT: {report.incident_id}
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            background: report.source === 'SECURITY' ? 'rgba(31,58,95,0.1)' : 'var(--bg-secondary)',
                            color: report.source === 'SECURITY' ? 'var(--navy)' : 'var(--text-muted)',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            SOURCE: {report.source}
                          </span>
                        </div>

                        <div style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          lineHeight: 1.4,
                          marginBottom: '0.4rem',
                          color: 'var(--text-primary)',
                        }}>
                          {report.description}
                        </div>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '1.2rem',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={13} />
                            <strong>{report.location_display || report.location}</strong>
                            {report.location_detail && ` (${report.location_detail})`}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <User size={13} />
                            Reported by: <strong>{report.reporter_name}</strong>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={13} />
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action / Status */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        {isApproved ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            background: 'rgba(22, 163, 74, 0.1)',
                            border: '1px solid rgba(22, 163, 74, 0.3)',
                            color: '#16a34a',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: "'Outfit', sans-serif",
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}>
                            <ShieldCheck size={14} /> Approved to Resolve
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#d97706',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: "'Outfit', sans-serif",
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}>
                            <AlertTriangle size={14} /> Pending Ground Verification
                          </div>
                        )}

                        <button
                          className={`btn btn-sm ${isApproved ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => openApproveModal(report)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}
                        >
                          <Shield size={13} />
                          {isApproved ? 'Update Verification' : 'Approve Response'}
                        </button>
                      </div>
                    </div>

                    {/* Security Approval Record Details */}
                    {isApproved && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem 0.9rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderLeft: '3px solid #16a34a',
                        fontSize: '0.8rem',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.3rem',
                        }}>
                          <span style={{ fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <CheckCircle2 size={13} /> Security Officer Sign-Off: {report.security_approved_by_name}
                          </span>
                          {report.security_approved_at && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                              {new Date(report.security_approved_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                          "{report.security_approval_notes || 'Physical inspection verified. Site safe to resolve.'}"
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security Approval Modal */}
        {selectedReport && (
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
              maxWidth: '560px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} color="var(--navy)" />
                  <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700 }}>
                    Security Response Sign-Off
                  </h3>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setSelectedReport(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{
                backgroundColor: '#F8F7F4',
                background: '#F8F7F4',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border)',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    REPORT #{selectedReport.id}
                  </strong>
                  {selectedReport.incident_id && (
                    <span style={{ color: 'var(--navy)', fontWeight: 600 }}>
                      Linked: {selectedReport.incident_id}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                  {selectedReport.description}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Location: <strong>{selectedReport.location_display || selectedReport.location}</strong>
                </div>
              </div>

              <form onSubmit={handleApproveSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.4rem',
                    color: 'var(--text-primary)',
                  }}>
                    On-Scene Ground Inspection Findings
                  </label>
                  <textarea
                    rows={4}
                    className="form-input"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    required
                    placeholder="Document perimeter status, hazard mitigation, crowd evacuation, and physical safety observations..."
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: '0.82rem',
                      padding: '0.6rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                <div style={{
                  background: 'rgba(22, 163, 74, 0.06)',
                  border: '1px solid rgba(22, 163, 74, 0.25)',
                  padding: '0.75rem',
                  marginBottom: '1.5rem',
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                  }}>
                    <input
                      type="checkbox"
                      checked={certifyResolved}
                      onChange={(e) => setCertifyResolved(e.target.checked)}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong>Authorize Report Resolution</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        I certify as an authorized Campus Security Officer that physical on-scene verification was executed, hazards are contained, and this report response is safe to be resolved.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedReport(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Check size={14} />
                    {submitting ? 'Submitting...' : 'Approve Response & Authorize Resolution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

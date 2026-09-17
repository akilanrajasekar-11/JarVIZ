import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  Search,
  Check,
  X,
  ExternalLink,
  Camera,
  ArrowRight,
  Shield,
  Eye,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { updateReportStatus } from '../services/api';

export default function OperatorReportsBoard({
  reports = [],
  loading = false,
  onRefresh,
}) {
  const navigate = useNavigate();

  // Search & Filter state for ALL REPORTS (Column 1)
  const [allSearch, setAllSearch] = useState('');
  const [allStatusFilter, setAllStatusFilter] = useState('ALL');
  const [allSourceFilter, setAllSourceFilter] = useState('ALL');

  // Search & Filter state for ACTIVE REPORTS (Column 2)
  const [activeSearch, setActiveSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');

  // Inspect / Resolve Modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvingStatus, setResolvingStatus] = useState('RESOLVED');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Active reports criteria: not resolved and not dismissed
  const activeReports = useMemo(() => {
    return reports.filter(
      (r) => r.status !== 'RESOLVED' && r.status !== 'DISMISSED'
    );
  }, [reports]);

  // Filtered All Reports
  const filteredAllReports = useMemo(() => {
    return reports.filter((r) => {
      if (allStatusFilter !== 'ALL' && r.status !== allStatusFilter) return false;
      if (allSourceFilter !== 'ALL' && r.source !== allSourceFilter) return false;
      if (allSearch.trim()) {
        const q = allSearch.toLowerCase();
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesLoc = (r.location_display || r.location || '').toLowerCase().includes(q);
        const matchesDetail = (r.location_detail || '').toLowerCase().includes(q);
        const matchesReporter = (r.reporter_name || '').toLowerCase().includes(q);
        const matchesInc = (r.incident_id || '').toLowerCase().includes(q);
        const matchesId = String(r.id).includes(q);
        if (!matchesDesc && !matchesLoc && !matchesDetail && !matchesReporter && !matchesInc && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [reports, allStatusFilter, allSourceFilter, allSearch]);

  // Filtered Active Reports
  const filteredActiveReports = useMemo(() => {
    return activeReports.filter((r) => {
      if (activeStatusFilter === 'PENDING' && r.status !== 'PENDING_REVIEW') return false;
      if (activeStatusFilter === 'INVESTIGATING' && r.status !== 'INVESTIGATING') return false;
      if (activeStatusFilter === 'SECURITY_APPROVED' && !r.can_resolve && r.status !== 'SECURITY_APPROVED') return false;
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase();
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesLoc = (r.location_display || r.location || '').toLowerCase().includes(q);
        const matchesDetail = (r.location_detail || '').toLowerCase().includes(q);
        const matchesReporter = (r.reporter_name || '').toLowerCase().includes(q);
        const matchesInc = (r.incident_id || '').toLowerCase().includes(q);
        const matchesId = String(r.id).includes(q);
        if (!matchesDesc && !matchesLoc && !matchesDetail && !matchesReporter && !matchesInc && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [activeReports, activeStatusFilter, activeSearch]);

  // Format relative time
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Open inspection modal
  const handleInspect = (report) => {
    setSelectedReport(report);
    setResolvingStatus('RESOLVED');
    setOperatorNotes(report.response_notes || '');
    setResolveModalOpen(true);
  };

  // Submit report status update (e.g. resolve)
  const handleUpdateStatus = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReport) return;

    try {
      setUpdating(true);
      await updateReportStatus(selectedReport.id, {
        status: resolvingStatus,
        notes: operatorNotes.trim(),
      });
      setResolveModalOpen(false);
      setSelectedReport(null);
      setOperatorNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update report status:', err);
      alert('Failed to update report status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Render individual report card
  const renderReportCard = (report, isActiveColumn = false) => {
    const isSecurityApproved = report.can_resolve || report.status === 'SECURITY_APPROVED';
    const isResolved = report.status === 'RESOLVED';
    const isInvestigating = report.status === 'INVESTIGATING';
    const isPending = report.status === 'PENDING_REVIEW';

    let borderLeftColor = '#94a3b8'; // default
    let statusBadgeColor = 'var(--text-muted)';
    let statusBadgeBg = 'var(--bg-secondary)';
    let statusText = report.status_display || report.status;

    if (isResolved) {
      borderLeftColor = '#64748b';
      statusBadgeColor = '#64748b';
      statusBadgeBg = 'rgba(100, 116, 139, 0.1)';
      statusText = 'Resolved';
    } else if (isSecurityApproved) {
      borderLeftColor = '#16a34a';
      statusBadgeColor = '#16a34a';
      statusBadgeBg = 'rgba(22, 163, 74, 0.1)';
      statusText = 'Security Approved';
    } else if (isInvestigating) {
      borderLeftColor = '#2563eb';
      statusBadgeColor = '#2563eb';
      statusBadgeBg = 'rgba(37, 99, 235, 0.1)';
      statusText = 'Investigating';
    } else if (isPending) {
      borderLeftColor = '#f59e0b';
      statusBadgeColor = '#d97706';
      statusBadgeBg = 'rgba(245, 158, 11, 0.1)';
      statusText = 'Pending Review';
    }

    return (
      <div
        key={report.id}
        className="card"
        style={{
          borderLeft: `4px solid ${borderLeftColor}`,
          padding: '1.1rem 1.25rem',
          marginBottom: '0.85rem',
          backgroundColor: '#FFFFFF',
          background: isActiveColumn && isSecurityApproved
            ? '#F4FAF5'
            : '#FFFFFF',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {/* Top Meta Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.12rem 0.45rem',
              backgroundColor: '#F4F2EE',
              background: 'var(--bg-secondary, #F4F2EE)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}>
              #RPT-{report.id}
            </span>

            <span style={{
              fontSize: '0.68rem',
              padding: '0.12rem 0.45rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              background: report.source === 'SECURITY' ? 'rgba(31,58,95,0.08)' : 'var(--bg-secondary, #F4F2EE)',
              color: report.source === 'SECURITY' ? 'var(--navy)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}>
              {report.source}
            </span>

            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.12rem 0.5rem',
              borderRadius: '999px',
              color: statusBadgeColor,
              background: statusBadgeBg,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}>
              {isSecurityApproved && <ShieldCheck size={11} />}
              {isResolved && <Check size={11} />}
              {statusText}
            </span>
          </div>

          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <Clock size={11} />
            {formatTimeAgo(report.created_at)}
          </div>
        </div>

        {/* Description */}
        <div style={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.45,
          marginBottom: '0.5rem',
        }}>
          {report.description}
        </div>

        {/* Location & Reporter Info */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.85rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '0.65rem',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
            <MapPin size={12} color="var(--navy)" />
            <strong>{report.location_display || report.location}</strong>
            {report.location_detail && (
              <span style={{ color: 'var(--text-muted)' }}>({report.location_detail})</span>
            )}
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <User size={12} />
            {report.reporter_name}
          </span>

          {report.evidence && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: 'var(--navy)',
              fontWeight: 600,
            }}>
              <Camera size={12} /> Photo Attached
            </span>
          )}
        </div>

        {/* Linked Incident Badge if attached */}
        {report.incident_id && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(31,58,95,0.04)',
            border: '1px solid rgba(31,58,95,0.15)',
            padding: '0.4rem 0.65rem',
            marginBottom: '0.65rem',
            fontSize: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--navy)', fontFamily: "'JetBrains Mono', monospace" }}>
                Incident {report.incident_id}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>· Linked Live Incident</span>
            </div>
            {report.incident_pk && (
              <button
                type="button"
                onClick={() => navigate(`/operator/incidents/${report.incident_pk}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--navy)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  padding: 0,
                }}
              >
                Command View <ExternalLink size={11} />
              </button>
            )}
          </div>
        )}

        {/* Security Guard Inspection Status Note */}
        {isSecurityApproved ? (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
            background: 'rgba(22, 163, 74, 0.07)',
            border: '1px solid rgba(22, 163, 74, 0.25)',
            padding: '0.45rem 0.65rem',
            marginBottom: '0.65rem',
            fontSize: '0.74rem',
            color: '#15803d',
          }}>
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <div style={{ fontWeight: 700 }}>
                Security Verified by {report.security_approved_by_name || 'Ground Officer'}
              </div>
              {report.security_approval_notes && (
                <div style={{ fontSize: '0.72rem', marginTop: '0.15rem', color: '#166534' }}>
                  "{report.security_approval_notes}"
                </div>
              )}
            </div>
          </div>
        ) : isPending ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(245, 158, 11, 0.06)',
            padding: '0.35rem 0.6rem',
            marginBottom: '0.65rem',
            fontSize: '0.72rem',
            color: '#b45309',
          }}>
            <Shield size={12} />
            <span>Awaiting Security Guard on-scene patrol verification</span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleInspect(report)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              padding: '0.25rem 0.65rem',
            }}
          >
            <Eye size={12} /> Inspect Report
          </button>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {!isResolved && (
              <button
                type="button"
                className={isSecurityApproved ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => handleInspect(report)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  background: isSecurityApproved ? '#16a34a' : undefined,
                  borderColor: isSecurityApproved ? '#16a34a' : undefined,
                }}
              >
                <Check size={12} /> Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 2-COLUMN BOARD CONTAINER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* =========================================================================
            COLUMN 1: ALL REPORTS
           ========================================================================= */}
        <div className="card" style={{
          padding: '1.25rem',
          minHeight: '650px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {/* Column Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                background: 'rgba(31, 58, 95, 0.08)',
                color: 'var(--navy)',
                padding: '0.45rem',
                borderRadius: '6px',
                display: 'flex',
              }}>
                <FileText size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                    color: 'var(--text-primary)',
                  }}>
                    All Reports
                  </h2>
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    padding: '0.12rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: '#F4F2EE',
                    background: 'var(--bg-secondary, #F4F2EE)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    {filteredAllReports.length} / {reports.length}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Complete registry of submitted campus incident reports
                </div>
              </div>
            </div>

            {onRefresh && (
              <button
                type="button"
                className="btn-icon"
                onClick={onRefresh}
                title="Refresh reports"
                style={{
                  background: '#FFFFFF',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border)',
                  padding: '0.35rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          {/* Search & Filter Controls for All Reports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={allSearch}
                onChange={(e) => setAllSearch(e.target.value)}
                placeholder="Search reports by keyword, location, or reporter..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem 0.45rem 2rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  background: '#FFFFFF',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={allStatusFilter}
                onChange={(e) => setAllStatusFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.78rem',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  background: '#FFFFFF',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Statuses ({reports.length})</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="SECURITY_APPROVED">Security Approved</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>

              <select
                value={allSourceFilter}
                onChange={(e) => setAllSourceFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.78rem',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  background: '#FFFFFF',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Sources</option>
                <option value="STUDENT">Student Reports</option>
                <option value="FACULTY">Faculty Reports</option>
                <option value="SECURITY">Security Reports</option>
                <option value="CCTV">CCTV Automated</option>
                <option value="OPERATOR">Operator Logs</option>
              </select>
            </div>
          </div>

          {/* Reports List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '0.2rem' }}>
            {loading ? (
              <div className="loading-center" style={{ padding: '2.5rem' }}>
                <div className="spinner" />
              </div>
            ) : filteredAllReports.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
                  <FileText size={34} strokeWidth={1.5} />
                </div>
                <p className="empty-title">No reports found</p>
                <p className="empty-sub">Try changing search keywords or filters</p>
              </div>
            ) : (
              filteredAllReports.map((report) => renderReportCard(report, false))
            )}
          </div>
        </div>

        {/* =========================================================================
            COLUMN 2: ACTIVE REPORTS
           ========================================================================= */}
        <div className="card" style={{
          padding: '1.25rem',
          minHeight: '650px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          background: '#FFFFFF',
          borderTop: '3px solid #dc2626',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {/* Column Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                color: '#dc2626',
                padding: '0.45rem',
                borderRadius: '6px',
                display: 'flex',
              }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                    color: 'var(--text-primary)',
                  }}>
                    Active Reports
                  </h2>
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    padding: '0.12rem 0.5rem',
                    borderRadius: '999px',
                    background: activeReports.length > 0 ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-secondary)',
                    color: activeReports.length > 0 ? '#dc2626' : 'var(--text-secondary)',
                    border: activeReports.length > 0 ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid var(--border)',
                  }}>
                    {filteredActiveReports.length} Active
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Ongoing emergency reports requiring monitoring or resolution
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {activeReports.some((r) => r.can_resolve || r.status === 'SECURITY_APPROVED') && (
                <span style={{
                  fontSize: '0.68rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  padding: '0.15rem 0.45rem',
                  background: 'rgba(22, 163, 74, 0.12)',
                  color: '#16a34a',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                }}>
                  {activeReports.filter((r) => r.can_resolve || r.status === 'SECURITY_APPROVED').length} Ready to Resolve
                </span>
              )}
            </div>
          </div>

          {/* Search & Filter Controls for Active Reports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                placeholder="Search active reports..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem 0.45rem 2rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  background: '#FFFFFF',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Quick Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('ALL')}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  border: '1px solid var(--border)',
                  backgroundColor: activeStatusFilter === 'ALL' ? 'var(--navy)' : '#F4F2EE',
                  background: activeStatusFilter === 'ALL' ? 'var(--navy)' : '#F4F2EE',
                  color: activeStatusFilter === 'ALL' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: activeStatusFilter === 'ALL' ? 700 : 400,
                }}
              >
                All Active ({activeReports.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('SECURITY_APPROVED')}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  backgroundColor: activeStatusFilter === 'SECURITY_APPROVED' ? '#16a34a' : 'rgba(22, 163, 74, 0.12)',
                  background: activeStatusFilter === 'SECURITY_APPROVED' ? '#16a34a' : 'rgba(22, 163, 74, 0.12)',
                  color: activeStatusFilter === 'SECURITY_APPROVED' ? '#ffffff' : '#15803d',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Security Verified ({activeReports.filter((r) => r.can_resolve || r.status === 'SECURITY_APPROVED').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('PENDING')}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  backgroundColor: activeStatusFilter === 'PENDING' ? '#d97706' : 'rgba(245, 158, 11, 0.12)',
                  background: activeStatusFilter === 'PENDING' ? '#d97706' : 'rgba(245, 158, 11, 0.12)',
                  color: activeStatusFilter === 'PENDING' ? '#ffffff' : '#b45309',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Pending ({activeReports.filter((r) => r.status === 'PENDING_REVIEW').length})
              </button>
            </div>
          </div>

          {/* Active Reports List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '0.2rem' }}>
            {loading ? (
              <div className="loading-center" style={{ padding: '2.5rem' }}>
                <div className="spinner" />
              </div>
            ) : filteredActiveReports.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', color: '#16a34a' }}>
                  <CheckCircle2 size={36} strokeWidth={1.5} />
                </div>
                <p className="empty-title">No active reports</p>
                <p className="empty-sub">All emergency reports have been reviewed and resolved</p>
              </div>
            ) : (
              filteredActiveReports.map((report) => renderReportCard(report, true))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: INSPECT & RESOLVE REPORT
         ========================================================================= */}
      {resolveModalOpen && selectedReport && (
        <div
          className="modal-overlay"
          style={{
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
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#FFFFFF',
              background: '#FFFFFF',
              border: '1px solid var(--border-bright)',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700 }}>
                    Report #{selectedReport.id} Details
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '0.12rem 0.45rem',
                    backgroundColor: '#F4F2EE',
                    background: '#F4F2EE',
                    border: '1px solid var(--border)',
                  }}>
                    {selectedReport.status_display || selectedReport.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Submitted on {new Date(selectedReport.created_at).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setResolveModalOpen(false); setSelectedReport(null); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Report Description */}
              <div style={{ backgroundColor: '#F8F7F4', background: '#F8F7F4', padding: '0.85rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Emergency Description
                </div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedReport.description}
                </div>
                {selectedReport.additional_info && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Additional Info:</strong> {selectedReport.additional_info}
                  </div>
                )}
              </div>

              {/* Location & Reporter info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#F8F7F4', background: '#F8F7F4', padding: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Location
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedReport.location_display || selectedReport.location}
                  </div>
                  {selectedReport.location_detail && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {selectedReport.location_detail}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#F8F7F4', background: '#F8F7F4', padding: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Reporter / Source
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedReport.reporter_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Source: {selectedReport.source}
                  </div>
                </div>
              </div>

              {/* Photo Evidence if uploaded */}
              {selectedReport.evidence && (
                <div style={{ backgroundColor: '#F8F7F4', background: '#F8F7F4', padding: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Camera size={13} /> Attached Photo Evidence
                  </div>
                  <a href={selectedReport.evidence} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedReport.evidence}
                      alt="Incident Evidence"
                      style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'cover', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                    />
                  </a>
                </div>
              )}

              {/* Linked Incident */}
              {selectedReport.incident_id && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#F3F6FA',
                  background: '#F3F6FA',
                  border: '1px solid rgba(31,58,95,0.2)',
                  padding: '0.75rem 1rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)' }}>
                      Attached to Incident
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--navy)' }}>
                      {selectedReport.incident_id}
                    </div>
                  </div>
                  {selectedReport.incident_pk && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setResolveModalOpen(false);
                        navigate(`/operator/incidents/${selectedReport.incident_pk}`);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#FFFFFF', background: '#FFFFFF' }}
                    >
                      Open Incident <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Security Guard Verification Findings */}
              {selectedReport.security_approved_by_name ? (
                <div style={{
                  backgroundColor: '#F0FDF4',
                  background: '#F0FDF4',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  padding: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                    <ShieldCheck size={16} /> Verified on Ground by {selectedReport.security_approved_by_name}
                  </div>
                  {selectedReport.security_approved_at && (
                    <div style={{ fontSize: '0.72rem', color: '#166534', marginBottom: '0.4rem' }}>
                      Certified at: {new Date(selectedReport.security_approved_at).toLocaleString()}
                    </div>
                  )}
                  {selectedReport.security_approval_notes && (
                    <div style={{ fontSize: '0.8rem', color: '#14532d', backgroundColor: '#FFFFFF', background: '#FFFFFF', padding: '0.5rem', borderLeft: '3px solid #16a34a' }}>
                      "{selectedReport.security_approval_notes}"
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#FEFCE8',
                  background: '#FEFCE8',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <Shield size={14} />
                  <span>On-scene physical security patrol verification is still pending.</span>
                </div>
              )}

              {/* Operator Action / Resolution Form */}
              <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Operator Action & Resolution
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Target Status:
                  </label>
                  <select
                    value={resolvingStatus}
                    onChange={(e) => setResolvingStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.82rem',
                      border: '1px solid var(--border)',
                      backgroundColor: '#FFFFFF',
                      background: '#FFFFFF',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="RESOLVED">RESOLVED (Close and certify report)</option>
                    <option value="INVESTIGATING">INVESTIGATING (Keep under check)</option>
                    <option value="DISMISSED">DISMISSED (False alarm / duplicate)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Operator Notes & Closure Rationale:
                  </label>
                  <textarea
                    rows={3}
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Enter resolution notes, containment confirmation, or operational closure remarks..."
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      fontSize: '0.82rem',
                      border: '1px solid var(--border)',
                      backgroundColor: '#FFFFFF',
                      background: '#FFFFFF',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setResolveModalOpen(false); setSelectedReport(null); }}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: resolvingStatus === 'RESOLVED' ? '#16a34a' : undefined,
                      borderColor: resolvingStatus === 'RESOLVED' ? '#16a34a' : undefined,
                    }}
                  >
                    <Check size={14} />
                    {updating ? 'Saving...' : `Save as ${resolvingStatus}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

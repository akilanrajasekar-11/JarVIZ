import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { submitReport } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertTriangle, Send } from 'lucide-react';

const LOCATIONS = [
  { value: 'BLOCK_1', label: 'Block 1 — Library / Academic' },
  { value: 'BLOCK_2', label: 'Block 2 — Chemistry Labs' },
  { value: 'BLOCK_3', label: 'Block 3 — Mechanical Workshop' },
  { value: 'BLOCK_4', label: 'Block 4 — Computer Science' },
  { value: 'BLOCK_5', label: 'Block 5 — Administration' },
  { value: 'HOSTEL_A', label: 'Hostel A — Residential' },
  { value: 'HOSTEL_B', label: 'Hostel B — Residential' },
  { value: 'MAIN_GATE', label: 'Main Gate — Campus Entrance' },
  { value: 'CAFETERIA', label: 'Cafeteria' },
  { value: 'AUDITORIUM', label: 'Auditorium' },
  { value: 'SPORTS_GROUND', label: 'Sports Ground' },
  { value: 'HEALTH_CENTRE', label: 'Health Centre' },
  { value: 'SECURITY_ROOM', label: 'Security Room' },
  { value: 'SUBSTATION', label: 'Electrical Substation' },
  { value: 'OTHER', label: 'Other' },
];

export default function SubmitReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    description: '',
    location: 'BLOCK_1',
    location_detail: '',
    additional_info: '',
    evidence: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const fd = new FormData();
    fd.append('description', form.description);
    fd.append('location', form.location);
    fd.append('location_detail', form.location_detail);
    fd.append('additional_info', form.additional_info);
    fd.append('source', user?.role === 'SECURITY' ? 'SECURITY' : user?.role || 'STUDENT');
    if (form.evidence) fd.append('evidence', form.evidence);

    try {
      await submitReport(fd);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#16a34a' }}>
                <CheckCircle2 size={56} strokeWidth={1.5} />
              </div>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                color: '#16a34a',
                margin: '0 0 0.5rem',
                fontSize: '1.75rem',
                letterSpacing: '-0.02em',
              }}>Report Submitted</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', lineHeight: '1.6', fontWeight: 300 }}>
                Your report has been received. Our AI engine is analyzing it and will notify the Emergency Operator.
              </p>
              {/* Gold accent line */}
              <div style={{ width: '48px', height: '2px', background: '#D4AF37', margin: '0 auto 2rem' }} />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setSuccess(false)}>
                  Report Another
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/reporter')}>
                  View My Reports
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--gold)' }}>
              <AlertTriangle size={24} />
            </div>
            <h1 className="page-title">Report an Emergency</h1>
          </div>
          <p className="page-sub">Provide as much detail as possible — this will help the AI classify and prioritize your report</p>
        </div>

        <div className="page-body" style={{ maxWidth: '640px' }}>
          <div className="card">
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label>Emergency Description *</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Describe what you see in detail. Include: what is happening, who is affected, how severe it appears."
                  value={form.description}
                  onChange={set('description')}
                  rows={5}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location *</label>
                  <select className="form-input" value={form.location} onChange={set('location')} required>
                    {LOCATIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Specific Location</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Room 204, Lab 4, 2nd Floor"
                    value={form.location_detail}
                    onChange={set('location_detail')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Additional Information</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Any extra context: number of people affected, injuries, hazardous materials, etc."
                  value={form.additional_info}
                  onChange={set('additional_info')}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Evidence Photo / Video (Optional)</label>
                <input
                  type="file"
                  className="form-input"
                  accept="image/*,video/*"
                  style={{ paddingTop: '0.5rem' }}
                  onChange={(e) => setForm({ ...form, evidence: e.target.files[0] })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  id="submit-report-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !form.description || !form.location}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={14} />
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/reporter')}>
                  Cancel
                </button>
              </div>

              <div className="alert alert-info" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                <strong>How it works:</strong> Your report will be instantly analyzed by AI to extract the incident type, severity, and required response. An Emergency Operator will review and dispatch the appropriate teams.
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

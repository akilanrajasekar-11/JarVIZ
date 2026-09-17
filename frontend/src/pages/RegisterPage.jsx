import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';
import { Shield } from 'lucide-react';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'SECURITY', label: 'Security Staff' },
  { value: 'OPERATOR', label: 'Emergency Operator' },
  { value: 'TEAM_MEDICAL', label: 'Medical Team' },
  { value: 'TEAM_FIRE', label: 'Fire Team' },
  { value: 'TEAM_HAZMAT', label: 'Hazmat / EHS Team' },
  { value: 'TEAM_SECURITY', label: 'Security Response Team' },
  { value: 'TEAM_FACILITIES', label: 'Facilities Team' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    role: 'STUDENT', department: '', phone: '', password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="login-page">
      <div className="login-card login-card-wide">
        <div className="login-logo">
          <div style={{ color: 'var(--gold)', display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Shield size={38} strokeWidth={2} />
          </div>
          <h1 className="logo-title">JarVIZ</h1>
          <p className="logo-sub">Create your account</p>
        </div>

        {/* Decorative gold accent line */}
        <div style={{ width: '48px', height: '2px', background: '#D4AF37', margin: '0 auto 2.5rem' }} />

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input className="form-input" value={form.first_name} onChange={set('first_name')} placeholder="First name" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input className="form-input" value={form.last_name} onChange={set('last_name')} placeholder="Last name" />
            </div>
          </div>

          <div className="form-group">
            <label>Username *</label>
            <input className="form-input" value={form.username} onChange={set('username')} required placeholder="Choose a username" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-input" value={form.email} onChange={set('email')} placeholder="you@university.edu" />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select className="form-input" value={form.role} onChange={set('role')} required>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input className="form-input" value={form.department} onChange={set('department')} placeholder="e.g. Computer Science" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" className="form-input" value={form.password} onChange={set('password')} required placeholder="At least 8 characters" minLength={8} />
          </div>

          <button id="register-submit" type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login" className="link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

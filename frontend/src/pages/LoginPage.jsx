import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.username, form.password);
      if (user.role === 'OPERATOR') navigate('/operator');
      else if (user.role.startsWith('TEAM_')) navigate('/team');
      else navigate('/reporter');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ color: 'var(--gold)', display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Shield size={38} strokeWidth={2} />
          </div>
          <h1 className="logo-title">JarVIZ</h1>
          <p className="logo-sub">Campus Emergency Intelligence</p>
        </div>

        {/* Decorative gold accent line */}
        <div style={{ width: '48px', height: '2px', background: '#D4AF37', margin: '0 auto 2.5rem' }} />

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">
          New here?{' '}
          <Link to="/register" className="link">Create an account</Link>
        </p>

        <div className="demo-creds">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p className="demo-title" style={{ margin: 0 }}>Click to Auto-fill Demo Account</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace' }}>
              pwd: JarVIZ@123
            </span>
          </div>
          <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <button
              type="button"
              className="demo-badge operator"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'operator' ? 'rgba(212,175,55,0.25)' : undefined }}
              onClick={() => setForm({ username: 'operator', password: 'JarVIZ@123' })}
            >
              👑 Operator (Command)
            </button>
            <button
              type="button"
              className="demo-badge reporter"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'student' ? 'rgba(31,58,95,0.25)' : undefined }}
              onClick={() => setForm({ username: 'student', password: 'JarVIZ@123' })}
            >
              🎓 Student (Reporter)
            </button>
            <button
              type="button"
              className="demo-badge reporter"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'faculty' ? 'rgba(31,58,95,0.25)' : undefined }}
              onClick={() => setForm({ username: 'faculty', password: 'JarVIZ@123' })}
            >
              🔬 Faculty (Reporter)
            </button>
            <button
              type="button"
              className="demo-badge reporter"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'security_staff' ? 'rgba(31,58,95,0.25)' : undefined }}
              onClick={() => setForm({ username: 'security_staff', password: 'JarVIZ@123' })}
            >
              🛡️ Security Guard
            </button>
            <button
              type="button"
              className="demo-badge team"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'team_fire' ? 'rgba(34,197,94,0.25)' : undefined }}
              onClick={() => setForm({ username: 'team_fire', password: 'JarVIZ@123' })}
            >
              🚒 Fire Team
            </button>
            <button
              type="button"
              className="demo-badge team"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'team_medical' ? 'rgba(34,197,94,0.25)' : undefined }}
              onClick={() => setForm({ username: 'team_medical', password: 'JarVIZ@123' })}
            >
              🚑 Medical Team
            </button>
            <button
              type="button"
              className="demo-badge team"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'team_hazmat' ? 'rgba(34,197,94,0.25)' : undefined }}
              onClick={() => setForm({ username: 'team_hazmat', password: 'JarVIZ@123' })}
            >
              ☣️ Hazmat / EHS Team
            </button>
            <button
              type="button"
              className="demo-badge team"
              style={{ cursor: 'pointer', textAlign: 'left', background: form.username === 'team_facilities' ? 'rgba(34,197,94,0.25)' : undefined }}
              onClick={() => setForm({ username: 'team_facilities', password: 'JarVIZ@123' })}
            >
              ⚡ Facilities Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

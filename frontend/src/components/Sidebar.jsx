import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getNavItems = (role) => {
  if (role === 'OPERATOR') return [
    { to: '/operator', icon: '📊', label: 'Command Center', end: true },
    { to: '/operator/incidents', icon: '🚨', label: 'Incidents' },
    { to: '/operator/resources', icon: '🚒', label: 'Resources' },
    { to: '/operator/cameras', icon: '📹', label: 'CCTV Feed' },
  ];
  if (role?.startsWith('TEAM_')) return [
    { to: '/team', icon: '📋', label: 'My Assignments', end: true },
  ];
  return [
    { to: '/reporter', icon: '🏠', label: 'Dashboard', end: true },
    { to: '/reporter/report', icon: '📝', label: 'Report Emergency' },
    { to: '/reporter/my-reports', icon: '📂', label: 'My Reports' },
  ];
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNavItems(user?.role);

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🛡️</span>
        <div>
          <div className="logo-text">JarVIZ</div>
          <div className="logo-sub">Emergency Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</div>
            <div className="user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
          ← Sign out
        </button>
      </div>
    </aside>
  );
}

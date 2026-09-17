import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Truck,
  Video,
  ClipboardList,
  FilePlus2,
  FolderArchive,
  LogOut,
} from 'lucide-react';

const getNavItems = (role) => {
  if (role === 'OPERATOR') return [
    { to: '/operator', icon: LayoutDashboard, label: 'Command Center', end: true },
    { to: '/security', icon: Shield, label: 'Security Verification' },
    { to: '/operator/incidents', icon: AlertTriangle, label: 'Incidents' },
    { to: '/operator/resources', icon: Truck, label: 'Resources' },
    { to: '/operator/cameras', icon: Video, label: 'CCTV Feed' },
  ];
  if (role === 'SECURITY') return [
    { to: '/security', icon: Shield, label: 'Security Portal', end: true },
    { to: '/reporter/report', icon: FilePlus2, label: 'Submit Report' },
    { to: '/reporter/my-reports', icon: FolderArchive, label: 'My Reports' },
  ];
  if (role?.startsWith('TEAM_')) return [
    { to: '/team', icon: ClipboardList, label: 'Assignments', end: true },
  ];
  return [
    { to: '/reporter', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/reporter/report', icon: FilePlus2, label: 'Report' },
    { to: '/reporter/my-reports', icon: FolderArchive, label: 'My Reports' },
  ];
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNavItems(user?.role);

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase()
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center' }}>
          <Shield size={24} strokeWidth={2.2} />
        </div>
        <div>
          <div className="logo-text">JarVIZ</div>
          <div className="logo-sub">Emergency Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} strokeWidth={2} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</div>
            <div className="user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          className="logout-btn"
          onClick={() => { logout(); navigate('/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

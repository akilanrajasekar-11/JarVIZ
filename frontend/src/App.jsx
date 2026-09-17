import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ReporterDashboard from './pages/ReporterDashboard';
import SubmitReportPage from './pages/SubmitReportPage';
import OperatorCommandCenter from './pages/OperatorCommandCenter';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import CamerasPage from './pages/CamerasPage';
import TeamDashboard from './pages/TeamDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import TacticalMapPage from './pages/TacticalMapPage';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'OPERATOR') return <Navigate to="/operator" replace />;
  if (user.role === 'SECURITY') return <Navigate to="/security" replace />;
  if (user.role?.startsWith('TEAM_')) return <Navigate to="/team" replace />;
  return <Navigate to="/reporter" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Security Guard routes */}
          <Route path="/security" element={
            <RequireAuth roles={['SECURITY', 'OPERATOR']}>
              <SecurityDashboard />
            </RequireAuth>
          } />

          {/* Reporter routes */}
          <Route path="/reporter" element={
            <RequireAuth roles={['STUDENT', 'FACULTY', 'SECURITY']}>
              <ReporterDashboard />
            </RequireAuth>
          } />
          <Route path="/reporter/report" element={
            <RequireAuth roles={['STUDENT', 'FACULTY', 'SECURITY']}>
              <SubmitReportPage />
            </RequireAuth>
          } />
          <Route path="/reporter/my-reports" element={
            <RequireAuth roles={['STUDENT', 'FACULTY', 'SECURITY']}>
              <ReporterDashboard />
            </RequireAuth>
          } />

          {/* Operator routes */}
          <Route path="/operator" element={
            <RequireAuth roles={['OPERATOR']}>
              <OperatorCommandCenter />
            </RequireAuth>
          } />
          <Route path="/operator/map" element={
            <RequireAuth roles={['OPERATOR']}>
              <TacticalMapPage />
            </RequireAuth>
          } />
          <Route path="/operator/incidents" element={
            <RequireAuth roles={['OPERATOR']}>
              <OperatorCommandCenter />
            </RequireAuth>
          } />
          <Route path="/operator/incidents/:id" element={
            <RequireAuth roles={['OPERATOR']}>
              <IncidentDetailPage />
            </RequireAuth>
          } />
          <Route path="/operator/resources" element={
            <RequireAuth roles={['OPERATOR']}>
              <ResourcesPage />
            </RequireAuth>
          } />
          <Route path="/operator/cameras" element={
            <RequireAuth roles={['OPERATOR']}>
              <CamerasPage />
            </RequireAuth>
          } />

          {/* Team routes */}
          <Route path="/team" element={
            <RequireAuth roles={['TEAM_MEDICAL', 'TEAM_FIRE', 'TEAM_HAZMAT', 'TEAM_SECURITY', 'TEAM_FACILITIES']}>
              <TeamDashboard />
            </RequireAuth>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

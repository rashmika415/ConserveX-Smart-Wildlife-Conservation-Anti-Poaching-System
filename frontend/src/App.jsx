import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingSpinner } from './components/UI';
import { AppLayout, PublicLayout } from './layouts/AppLayout';
import Login from './pages/auth/Login';
import CommunityHome from './pages/community/CommunityHome';
import ReportElephantSighting from './pages/community/ReportElephantSighting';
import ReportConfirmation from './pages/community/ReportConfirmation';
import Dashboard from './pages/shared/Dashboard';
import Profile from './pages/shared/Profile';
import NotFound from './pages/shared/NotFound';
import ReportIncident from './modules/incidents/ReportIncident';
import IncidentManagement, {
  IncidentDetails,
} from './modules/incidents/IncidentManagement';
import PatrolManagement, {
  CreatePatrol,
} from './modules/patrols/PatrolManagement';
import ActivePatrol from './modules/patrols/ActivePatrol';
import AnimalTracking from './modules/collars/AnimalTracking';
import Alerts, { AlertDetails } from './modules/collars/Alerts';
import CommunityReports, {
  CommunityReportDetails,
} from './modules/community/CommunityReports';
import { useIncidentOutbox } from './hooks/useIncidentOutbox';

function IncidentSyncAgent() {
  const { user } = useAuth();
  useIncidentOutbox(user?.role === 'RANGER' ? user._id : null);
  return null;
}
export function Protected({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/app" replace />;
  return <Outlet />;
}
export function App() {
  return (
    <>
      <IncidentSyncAgent />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<CommunityHome />} />
          <Route path="login" element={<Login />} />
          <Route path="report" element={<ReportElephantSighting />} />
          <Route path="report/confirmation" element={<ReportConfirmation />} />
        </Route>
        <Route element={<Protected />}>
          <Route path="app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="alerts/:id" element={<AlertDetails />} />
            <Route element={<Protected roles={['MANAGER', 'RANGER']} />}>
              <Route path="incidents" element={<IncidentManagement />} />
              <Route path="incidents/:id" element={<IncidentDetails />} />
              <Route path="patrols" element={<PatrolManagement />} />
              <Route path="patrols/:id" element={<ActivePatrol />} />
            </Route>
            <Route element={<Protected roles={['RANGER']} />}>
              <Route path="incidents/new" element={<ReportIncident />} />
            </Route>
            <Route element={<Protected roles={['MANAGER']} />}>
              <Route path="patrols/new" element={<CreatePatrol />} />
              <Route path="tracking" element={<AnimalTracking />} />
            </Route>
            <Route element={<Protected roles={['MANAGER', 'LIAISON', 'RANGER']} />}>
              <Route path="community" element={<CommunityReports />} />
            </Route>
            <Route element={<Protected roles={['MANAGER', 'LIAISON']} />}>
              <Route
                path="community/:id"
                element={<CommunityReportDetails />}
              />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

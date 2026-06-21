import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { CircleProvider } from './lib/CircleContext';
import { EntryScreen } from './screens/EntryScreen';
import { MembersInvite } from './screens/MembersInvite';
import { TodaySenior } from './screens/TodaySenior';
import { DashboardFamily } from './screens/DashboardFamily';
import { Onboard } from './screens/Onboard';
import { HistoryView } from './screens/HistoryView';
import { Radar } from './screens/Radar';
import { AlertDetail } from './screens/AlertDetail';
import { More } from './screens/More';
import { DevPanel } from './components/DevPanel';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authReady } = useAuth();
  // In live mode authReady flips true once the initial getCurrentUser()
  // check resolves — wait rather than bouncing to "/" on a flash of false.
  if (!authReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <CircleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<EntryScreen />} />
            <Route
              path="/onboard"
              element={
                <RequireAuth>
                  <Onboard />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardFamily />
                </RequireAuth>
              }
            />
            <Route
              path="/members"
              element={
                <RequireAuth>
                  <MembersInvite />
                </RequireAuth>
              }
            />
            <Route
              path="/today"
              element={
                <RequireAuth>
                  <TodaySenior />
                </RequireAuth>
              }
            />
            <Route
              path="/history"
              element={
                <RequireAuth>
                  <HistoryView />
                </RequireAuth>
              }
            />
            <Route
              path="/radar"
              element={
                <RequireAuth>
                  <Radar />
                </RequireAuth>
              }
            />
            <Route
              path="/alert/:id"
              element={
                <RequireAuth>
                  <AlertDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/more"
              element={
                <RequireAuth>
                  <More />
                </RequireAuth>
              }
            />
          </Routes>
          <DevPanel />
        </BrowserRouter>
      </CircleProvider>
    </AuthProvider>
  );
}

export default App;

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { CircleProvider } from './lib/CircleContext';
import { EntryScreen } from './screens/EntryScreen';
import { MembersInvite } from './screens/MembersInvite';
import { TodaySenior } from './screens/TodaySenior';
import { DashboardFamily } from './screens/DashboardFamily';
import { Onboard } from './screens/Onboard';
import { HistoryView } from './screens/HistoryView';
import { DevPanel } from './components/DevPanel';
import { BottomTabBar } from './components/BottomTabBar';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authReady } = useAuth();
  // In live mode authReady flips true once the initial getCurrentUser()
  // check resolves — wait rather than bouncing to "/" on a flash of false.
  if (!authReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 16,
        }}
      >
        {title} — not in this design bundle yet.
      </div>
      <BottomTabBar />
    </div>
  );
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
              path="/more"
              element={
                <RequireAuth>
                  <ComingSoon title="More" />
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

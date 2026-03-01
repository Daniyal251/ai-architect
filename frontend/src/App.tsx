import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MarketingLanding } from './components/MarketingLanding';
import { Auth } from './components/Auth';
import { AppShell } from './components/AppShell';
import { NewAgentPage } from './pages/NewAgentPage';
import { MyAgentsPage } from './pages/MyAgentsPage';
import { AgentPage } from './pages/AgentPage';
import { PricingPage } from './pages/PricingPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { BillingPage } from './pages/BillingPage';
import { OAuthCallback } from './pages/OAuthCallback';

function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { isAuthenticated, login, isInitializing } = useAuth();
  const navigate = useNavigate();
  if (isInitializing) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/app/new" replace />;

  const handleAuthSuccess = (token: string, username: string, plan: string) => {
    login(token, username, plan);
    navigate('/app/new');
  };
  return <Auth onAuthSuccess={handleAuthSuccess} />;
}

function AdminRoute() {
  const { isAuthenticated, plan, usage, isInitializing } = useAuth();
  if (isInitializing) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!usage) return <PageLoader />;
  if (plan !== 'admin') return <Navigate to="/app/new" replace />;
  return <AdminPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MarketingLanding />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/billing" element={<BillingPage />} />
      <Route path="/admin" element={<AdminRoute />} />

      {/* Protected app routes inside AppShell (sidebar layout) */}
      <Route path="/app" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="new" replace />} />
        <Route path="new" element={<NewAgentPage />} />
        <Route path="agents" element={<MyAgentsPage />} />
        <Route path="agent/:id" element={<AgentPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

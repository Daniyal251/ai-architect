import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MarketingLanding } from './components/MarketingLanding';
import { Auth } from './components/Auth';
import { NewAgentPage } from './pages/NewAgentPage';
import { MyAgentsPage } from './pages/MyAgentsPage';
import { AgentPage } from './pages/AgentPage';
import { PricingPage } from './pages/PricingPage';
import { AdminPage } from './pages/AdminPage';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

function AuthRoute() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/app/new" replace />;

  const handleAuthSuccess = (token: string, username: string, plan: string) => {
    login(token, username, plan);
    navigate('/app/new');
  };

  return <Auth onAuthSuccess={handleAuthSuccess} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MarketingLanding />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/app" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="new" replace />} />
        <Route path="new" element={<NewAgentPage />} />
        <Route path="agents" element={<MyAgentsPage />} />
        <Route path="agent/:id" element={<AgentPage />} />
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

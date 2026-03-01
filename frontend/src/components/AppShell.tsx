import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = '';

interface AgentItem {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  free:    { label: 'Free',    cls: 'bg-gray-500/20 text-gray-400' },
  starter: { label: 'Starter', cls: 'bg-purple-500/20 text-purple-400' },
  pro:     { label: 'Pro',     cls: 'bg-cyan-500/20 text-cyan-400' },
  admin:   { label: 'Admin',   cls: 'bg-yellow-500/20 text-yellow-400' },
};

export function AppShell() {
  const { username, plan, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setAgents)
      .catch(() => {});
  }, [token, location.pathname]);

  const badge = PLAN_BADGE[plan] || PLAN_BADGE.free;

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
     ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:static z-30 flex flex-col h-full w-64 bg-gray-900 border-r border-white/8
                    transition-transform duration-200 flex-shrink-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            A
          </div>
          <span className="font-semibold text-white text-sm">AI Architect</span>
        </div>

        {/* New agent button */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={() => { navigate('/app/new'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                       border border-cyan-500/30 rounded-xl text-sm text-cyan-400 hover:from-cyan-500/30
                       hover:to-purple-500/30 transition font-medium"
          >
            <span className="text-base leading-none">+</span>
            Новый агент
          </button>
        </div>

        {/* Agent history */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {agents.length > 0 && (
            <>
              <p className="text-xs text-gray-600 px-1 py-2 font-medium uppercase tracking-wide">
                Мои агенты
              </p>
              <div className="space-y-0.5">
                {agents.slice(0, 20).map(a => (
                  <button
                    key={a.id}
                    onClick={() => { navigate(`/app/agent/${a.id}`); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-left
                                transition-colors hover:bg-white/5 group
                                ${location.pathname === `/app/agent/${a.id}` ? 'bg-white/8 text-white' : 'text-gray-400'}`}
                  >
                    <span className="text-base flex-shrink-0">{a.avatar || '🤖'}</span>
                    <span className="truncate text-xs">{a.name}</span>
                  </button>
                ))}
                {agents.length > 20 && (
                  <button
                    onClick={() => { navigate('/app/agents'); setSidebarOpen(false); }}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 text-left transition"
                  >
                    Ещё {agents.length - 20} агентов →
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Nav links */}
        <div className="px-3 py-2 border-t border-white/8 space-y-0.5">
          <NavLink to="/app/agents" className={navCls} onClick={() => setSidebarOpen(false)}>
            <span>🤖</span> Все агенты
          </NavLink>
          <NavLink to="/pricing" className={navCls} onClick={() => setSidebarOpen(false)}>
            <span>💳</span> Тарифы
          </NavLink>
          {plan === 'admin' && (
            <NavLink to="/admin" className={navCls} onClick={() => setSidebarOpen(false)}>
              <span>⚙️</span> Админ-панель
            </NavLink>
          )}
        </div>

        {/* User section */}
        <div className="px-3 py-3 border-t border-white/8 relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition text-left"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{username}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>
            </div>
            <span className="text-gray-500 text-xs">▾</span>
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-gray-800 border border-white/10 rounded-xl shadow-xl overflow-hidden">
              <button
                onClick={() => { navigate('/app/profile'); setShowUserMenu(false); setSidebarOpen(false); }}
                className="w-full px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 text-left transition"
              >
                👤 Профиль
              </button>
              <div className="border-t border-white/5" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 text-left transition"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex md:hidden items-center gap-3 px-4 py-3 bg-gray-900 border-b border-white/8 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-white">AI Architect</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

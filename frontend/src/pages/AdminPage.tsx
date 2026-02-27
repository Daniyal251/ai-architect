import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AdminStats {
  total_users: number;
  paid_users: number;
  free_users: number;
  total_agents: number;
  generations_this_month: number;
}

interface AdminUser {
  username: string;
  email: string | null;
  plan: string;
  disabled: boolean;
  created_at: string;
  generations_this_month: number;
  agents_count: number;
}

const PLAN_COLORS: Record<string, string> = {
  free:    'bg-gray-500/20 text-gray-300',
  starter: 'bg-purple-500/20 text-purple-300',
  pro:     'bg-cyan-500/20 text-cyan-300',
  admin:   'bg-yellow-500/20 text-yellow-300',
};

export function AdminPage() {
  const navigate = useNavigate();
  const { plan, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // usage может загружаться асинхронно — ждём пока plan не 'free' или usage не загружен
  const { usage } = useAuth();

  useEffect(() => {
    // Если usage ещё не загружен — не редиректим (plan = 'free' по умолчанию)
    if (!usage) return;
    if (plan !== 'admin') {
      navigate('/app/new');
      return;
    }
    loadData();
  }, [plan, usage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const changePlan = async (username: string, newPlan: string) => {
    setActionLoading(username);
    try {
      await fetch(`${API_URL}/api/admin/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, plan: newPlan }),
      });
      setUsers((prev) => prev.map((u) => u.username === username ? { ...u, plan: newPlan } : u));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleDisable = async (username: string, disabled: boolean) => {
    setActionLoading(username);
    try {
      await fetch(`${API_URL}/api/admin/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, disabled }),
      });
      setUsers((prev) => prev.map((u) => u.username === username ? { ...u, disabled } : u));
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (plan !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">👑 Админ-панель</h1>
            <p className="text-gray-400 text-sm mt-1">AI Architect — управление платформой</p>
          </div>
          <button
            onClick={() => navigate('/app/new')}
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
          >
            ← В приложение
          </button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Загрузка...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Всего пользователей', value: stats?.total_users ?? 0, icon: '👥', color: 'cyan' },
                { label: 'Платящих', value: stats?.paid_users ?? 0, icon: '💳', color: 'green' },
                { label: 'Бесплатных', value: stats?.free_users ?? 0, icon: '🆓', color: 'gray' },
                { label: 'Агентов создано', value: stats?.total_agents ?? 0, icon: '🤖', color: 'purple' },
                { label: 'Генераций в месяце', value: stats?.generations_this_month ?? 0, icon: '⚡', color: 'yellow' },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Users Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                <h2 className="text-lg font-semibold">Пользователи</h2>
                <div className="flex gap-3 items-center">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по username / email..."
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm
                               text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-56"
                  />
                  <button
                    onClick={loadData}
                    className="px-3 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
                  >
                    ↻ Обновить
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/10">
                      <th className="pb-3 pr-4">Пользователь</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Тариф</th>
                      <th className="pb-3 pr-4 text-right">Ген/мес</th>
                      <th className="pb-3 pr-4 text-right">Агентов</th>
                      <th className="pb-3 pr-4">Регистрация</th>
                      <th className="pb-3">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((u) => (
                      <tr key={u.username} className={`${u.disabled ? 'opacity-50' : ''}`}>
                        <td className="py-3 pr-4 font-medium">
                          {u.username}
                          {u.disabled && <span className="ml-2 text-xs text-red-400">[заблок.]</span>}
                        </td>
                        <td className="py-3 pr-4 text-gray-400 text-xs">{u.email || '—'}</td>
                        <td className="py-3 pr-4">
                          <select
                            value={u.plan}
                            onChange={(e) => changePlan(u.username, e.target.value)}
                            disabled={actionLoading === u.username}
                            className={`text-xs px-2 py-1 rounded-md border-0 cursor-pointer
                              ${PLAN_COLORS[u.plan] || 'bg-gray-500/20 text-gray-300'}
                              focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-300">{u.generations_this_month}</td>
                        <td className="py-3 pr-4 text-right text-gray-300">{u.agents_count}</td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => toggleDisable(u.username, !u.disabled)}
                            disabled={actionLoading === u.username || u.username === 'admin'}
                            className={`text-xs px-3 py-1 rounded-lg transition
                              ${u.disabled
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              }
                              disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {u.disabled ? 'Разблокировать' : 'Заблокировать'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Пользователей не найдено</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

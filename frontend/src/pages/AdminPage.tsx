import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = '';

interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  api_key: string;
  models: Array<{id: string; priority: number; cost: string}>;
  timeout: number;
  max_retries: number;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { token, plan, usage } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerStats] = useState<Record<string, any>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');

  useEffect(() => {
    if (usage && plan !== 'admin') {
      navigate('/app/new');
      return;
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, providersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/providers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setProviders(await providersRes.json());
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (username: string, newPlan: string) => {
    try {
      await fetch(`${API_URL}/api/admin/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, plan: newPlan }),
      });
      setUsers(users.map(u => u.username === username ? { ...u, plan: newPlan } : u));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleDisable = async (username: string, disabled: boolean) => {
    try {
      await fetch(`${API_URL}/api/admin/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, disabled }),
      });
      setUsers(users.map(u => u.username === username ? { ...u, disabled } : u));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleToggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      const updated = providers.map(p => 
        p.id === providerId ? { ...p, enabled } : p
      );
      await fetch(`${API_URL}/api/admin/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      setProviders(updated);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleSaveApiKey = async (providerId: string, apiKey: string) => {
    try {
      const updated = providers.map(p => 
        p.id === providerId ? { ...p, api_key: apiKey } : p
      );
      await fetch(`${API_URL}/api/admin/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      setEditingProvider(null);
      setTempKey('');
      setProviders(updated);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">👑 Админ-панель</h1>
            <p className="text-gray-400 text-sm mt-1">Управление AI провайдерами и пользователями</p>
          </div>
          <button
            onClick={() => navigate('/app/new')}
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
          >
            ← В приложение
          </button>
        </div>

        {/* AI Providers Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🤖 AI Провайдеры</h2>
            <button
              onClick={fetchAll}
              className="px-3 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
            >
              ↻ Обновить
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(provider => {
              const stats = providerStats[provider.id];
              const errorRate = stats ? (stats.errors / stats.requests * 100) : 0;

              return (
                <div
                  key={provider.id}
                  className={`border rounded-xl p-4 ${
                    provider.enabled 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-gray-500/30 bg-gray-500/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{provider.name}</h3>
                      <p className="text-xs text-gray-400">
                        Моделей: {provider.models.length} | 
                        Таймаут: {provider.timeout}с | 
                        Попыток: {provider.max_retries}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(e) => handleToggleProvider(provider.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>

                  {/* API Key */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">API Key:</p>
                    {editingProvider === provider.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempKey}
                          onChange={(e) => setTempKey(e.target.value)}
                          placeholder="Введите API ключ"
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                        />
                        <button
                          onClick={() => handleSaveApiKey(provider.id, tempKey)}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm"
                        >
                          Сохранить
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <code className="text-xs bg-black/30 px-2 py-1 rounded">
                          {provider.api_key ? '••••••••' + provider.api_key.slice(-4) : 'Не указан'}
                        </code>
                        <button
                          onClick={() => {
                            setEditingProvider(provider.id);
                            setTempKey(provider.api_key || '');
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Изменить
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Models */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Модели:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.map((model, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            model.cost === 'free' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {model.id} (#{model.priority})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  {stats && (
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Запросов: {stats.requests}</span>
                      <span>Ошибок: {stats.errors}</span>
                      <span className={errorRate > 50 ? 'text-red-400' : 'text-green-400'}>
                        Ошибки: {errorRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Всего пользователей', value: stats?.total_users ?? 0, icon: '👥', color: 'cyan' },
            { label: 'Платящих', value: stats?.paid_users ?? 0, icon: '💳', color: 'green' },
            { label: 'Бесплатных', value: stats?.free_users ?? 0, icon: '🆓', color: 'gray' },
            { label: 'Агентов создано', value: stats?.total_agents ?? 0, icon: '🤖', color: 'purple' },
            { label: 'Генераций в месяце', value: stats?.generations_this_month ?? 0, icon: '⚡', color: 'yellow' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
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
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-56"
              />
              <button
                onClick={fetchAll}
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
                {filteredUsers.map(user => (
                  <tr key={user.username} className={user.disabled ? 'opacity-50' : ''}>
                    <td className="py-3 pr-4 font-medium">
                      {user.username}
                      {user.disabled && <span className="ml-2 text-xs text-red-400">[заблок.]</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{user.email || '—'}</td>
                    <td className="py-3 pr-4">
                      <select
                        value={user.plan}
                        onChange={(e) => handleUpgrade(user.username, e.target.value)}
                        disabled={user.username === 'admin'}
                        className={`text-xs px-2 py-1 rounded-md border-0 cursor-pointer
                          ${user.plan === 'free' ? 'bg-gray-500/20 text-gray-300' : 
                            user.plan === 'starter' ? 'bg-purple-500/20 text-purple-300' :
                            user.plan === 'pro' ? 'bg-cyan-500/20 text-cyan-300' :
                            'bg-yellow-500/20 text-yellow-300'}
                          focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-300">{user.generations_this_month}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{user.agents_count}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDisable(user.username, !user.disabled)}
                        disabled={user.username === 'admin'}
                        className={`text-xs px-3 py-1 rounded-lg transition
                          ${user.disabled 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}
                          disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {user.disabled ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <p className="text-center text-gray-500 py-8">Пользователей не найдено</p>
          )}
        </div>
      </div>
    </div>
  );
}

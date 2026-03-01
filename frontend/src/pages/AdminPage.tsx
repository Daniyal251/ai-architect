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

interface PlatformSettings {
  yookassa_shop_id: string;
  yookassa_secret_key: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  google_client_id: string;
  google_client_secret: string;
  github_client_id: string;
  github_client_secret: string;
  yandex_client_id: string;
  yandex_client_secret: string;
  sms_api_key: string;
  backend_url: string;
  claude_api_key: string;
  [key: string]: string;
}

type Tab = 'providers' | 'users' | 'oauth' | 'email' | 'payments' | 'analytics';

const EMPTY_SETTINGS: PlatformSettings = {
  yookassa_shop_id: '', yookassa_secret_key: '',
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '',
  google_client_id: '', google_client_secret: '',
  github_client_id: '', github_client_secret: '',
  yandex_client_id: '', yandex_client_secret: '',
  sms_api_key: '',
  backend_url: 'https://aiarchi.ru',
  claude_api_key: '',
};

function SettingField({
  label, hint, value, onChange, type = 'text', placeholder = ''
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isMasked = type === 'password';
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={isMasked && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                     placeholder-gray-600 focus:outline-none focus:border-cyan-500 pr-10"
        />
        {isMasked && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
          >
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { token, plan, usage, username: me } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('providers');

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [settings, setSettings] = useState<PlatformSettings>(EMPTY_SETTINGS);
  const [analyticsData, setAnalyticsData] = useState<{analysis: string; stats: any; agents_analyzed: number} | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    if (usage && plan !== 'admin') {
      navigate('/app/new');
      return;
    }
    fetchAll();
  }, []);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, providersRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers: authHeaders }),
        fetch(`${API_URL}/api/admin/users`, { headers: authHeaders }),
        fetch(`${API_URL}/api/admin/providers`, { headers: authHeaders }),
        fetch(`${API_URL}/api/admin/settings`, { headers: authHeaders }),
      ]);
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setProviders(await providersRes.json());
      const s = await settingsRes.json();
      setSettings({ ...EMPTY_SETTINGS, ...(s.settings || {}) });
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (username: string, newPlan: string) => {
    await fetch(`${API_URL}/api/admin/upgrade`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ username, plan: newPlan }),
    });
    setUsers(users.map(u => u.username === username ? { ...u, plan: newPlan } : u));
  };

  const handleDisable = async (username: string, disabled: boolean) => {
    await fetch(`${API_URL}/api/admin/disable`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ username, disabled }),
    });
    setUsers(users.map(u => u.username === username ? { ...u, disabled } : u));
  };

  const handleToggleProvider = async (providerId: string, enabled: boolean) => {
    const updated = providers.map(p => p.id === providerId ? { ...p, enabled } : p);
    await fetch(`${API_URL}/api/admin/providers`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify(updated),
    });
    setProviders(updated);
  };

  const handleSaveApiKey = async (providerId: string, apiKey: string) => {
    const updated = providers.map(p => p.id === providerId ? { ...p, api_key: apiKey } : p);
    const r = await fetch(`${API_URL}/api/admin/providers`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify(updated),
    });
    if (r.ok) {
      setEditingProvider(null);
      setTempKey('');
      setProviders(updated);
      showSaved('Ключ сохранён — будет использован сразу');
    }
  };

  const handleSaveSettings = async (keys: string[]) => {
    setSaving(true);
    const patch: Record<string, string> = {};
    keys.forEach(k => { if (settings[k]) patch[k] = settings[k]; });
    const r = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ settings: patch }),
    });
    setSaving(false);
    if (r.ok) showSaved('Сохранено!');
  };

  const showSaved = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const setPatch = (patch: Partial<PlatformSettings>) =>
    setSettings(p => ({ ...p, ...patch } as PlatformSettings));

  const runAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const r = await fetch(`${API_URL}/api/admin/analytics`, { headers: authHeaders });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: 'Ошибка запроса' }));
        setAnalyticsError(err.detail || 'Ошибка запроса');
        return;
      }
      const data = await r.json();
      setAnalyticsData(data);
    } catch (e) {
      setAnalyticsError('Сетевая ошибка. Проверьте соединение.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const TABS: {id: Tab; label: string; icon: string}[] = [
    { id: 'providers',  label: 'AI Провайдеры', icon: '🤖' },
    { id: 'users',      label: 'Пользователи',  icon: '👥' },
    { id: 'oauth',      label: 'OAuth / SMS',   icon: '🔐' },
    { id: 'email',      label: 'Email / SMTP',  icon: '📧' },
    { id: 'payments',   label: 'Оплата',        icon: '💳' },
    { id: 'analytics',  label: 'Аналитика ИИ',  icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">👑 Админ-панель</h1>
            <p className="text-gray-500 text-sm mt-0.5">Управление платформой AI Architect</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className="text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-lg">
                ✓ {saveMsg}
              </span>
            )}
            <button onClick={fetchAll} className="px-3 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition">
              ↻ Обновить
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Пользователей', value: stats?.total_users ?? 0, icon: '👥' },
            { label: 'Платящих', value: stats?.paid_users ?? 0, icon: '💳' },
            { label: 'Бесплатных', value: stats?.free_users ?? 0, icon: '🆓' },
            { label: 'Агентов', value: stats?.total_agents ?? 0, icon: '🤖' },
            { label: 'Генераций/мес', value: stats?.generations_this_month ?? 0, icon: '⚡' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 border border-white/10 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-max px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
                ${activeTab === t.id ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab: AI Providers */}
        {activeTab === 'providers' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-sm text-gray-400 mb-4">
              API-ключи применяются <strong className="text-cyan-400">сразу</strong> без перезапуска сервера.
              Включённые провайдеры чередуются в режиме round-robin.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(provider => (
                <div
                  key={provider.id || provider.name}
                  className={`border rounded-xl p-4 ${
                    provider.enabled
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-gray-500/30 bg-gray-500/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{provider.name}</h3>
                      <p className="text-xs text-gray-500">
                        {provider.models?.length ?? 0} моделей · таймаут {provider.timeout}с
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(e) => handleToggleProvider(provider.id || provider.name, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full
                                      peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px]
                                      after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full
                                      after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600" />
                    </label>
                  </div>

                  {/* API Key */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">API Key</p>
                    {editingProvider === (provider.id || provider.name) ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempKey}
                          onChange={(e) => setTempKey(e.target.value)}
                          placeholder="Введите API ключ"
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                        />
                        <button
                          onClick={() => handleSaveApiKey(provider.id || provider.name, tempKey)}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => { setEditingProvider(null); setTempKey(''); }}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <code className="text-xs bg-black/30 px-2 py-1 rounded flex-1">
                          {provider.api_key ? '••••••••' + provider.api_key.slice(-4) : <span className="text-gray-500">Не указан</span>}
                        </code>
                        <button
                          onClick={() => { setEditingProvider(provider.id || provider.name); setTempKey(provider.api_key || ''); }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded hover:bg-white/5"
                        >
                          Изменить
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Models */}
                  <div className="flex flex-wrap gap-1">
                    {(provider.models || []).map((m, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded ${
                          m.cost === 'free' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {m.id}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Users */}
        {activeTab === 'users' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <h2 className="text-lg font-semibold">Пользователи ({users.length})</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                           placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-56"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-white/10">
                    <th className="pb-3 pr-4">Пользователь</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Тариф</th>
                    <th className="pb-3 pr-4 text-right">Генераций</th>
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
                        {user.username === me && <span className="ml-2 text-xs text-cyan-400">[вы]</span>}
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{user.email || '—'}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={user.plan}
                          onChange={(e) => handleUpgrade(user.username, e.target.value)}
                          disabled={user.username === me}
                          className={`text-xs px-2 py-1 rounded-md border-0 cursor-pointer
                            ${user.plan === 'free' ? 'bg-gray-500/20 text-gray-300' :
                              user.plan === 'starter' ? 'bg-purple-500/20 text-purple-300' :
                              user.plan === 'pro' ? 'bg-cyan-500/20 text-cyan-300' :
                              'bg-yellow-500/20 text-yellow-300'}
                            disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none`}
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
                          disabled={user.username === me}
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
        )}

        {/* Tab: OAuth / SMS */}
        {activeTab === 'oauth' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400">
              Настройки OAuth применяются сразу — перезапуск сервера не нужен.
              Получи Client ID и Secret в консоли каждого провайдера.
            </p>

            {/* Google */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-1">🇬 Google OAuth</h2>
              <p className="text-xs text-gray-500 mb-4">
                Консоль: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-cyan-400 hover:underline">console.cloud.google.com</a>
                {' · '}Redirect URI: <code className="bg-black/30 px-1 rounded">{settings.backend_url}/api/auth/oauth/google/callback</code>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <SettingField label="Client ID" value={settings.google_client_id} onChange={v => setPatch({google_client_id: v})} placeholder="123456789-xxx.apps.googleusercontent.com" />
                <SettingField label="Client Secret" type="password" value={settings.google_client_secret} onChange={v => setPatch({google_client_secret: v})} placeholder="GOCSPX-..." />
              </div>
              <button onClick={() => handleSaveSettings(['google_client_id','google_client_secret'])} disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition disabled:opacity-50">
                Сохранить Google
              </button>
            </div>

            {/* GitHub */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-1">🐙 GitHub OAuth</h2>
              <p className="text-xs text-gray-500 mb-4">
                Консоль: <a href="https://github.com/settings/developers" target="_blank" className="text-cyan-400 hover:underline">github.com/settings/developers</a>
                {' · '}Redirect URI: <code className="bg-black/30 px-1 rounded">{settings.backend_url}/api/auth/oauth/github/callback</code>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <SettingField label="Client ID" value={settings.github_client_id} onChange={v => setPatch({github_client_id: v})} placeholder="Ov23liXXXXXXXXXX" />
                <SettingField label="Client Secret" type="password" value={settings.github_client_secret} onChange={v => setPatch({github_client_secret: v})} placeholder="abc123..." />
              </div>
              <button onClick={() => handleSaveSettings(['github_client_id','github_client_secret'])} disabled={saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition disabled:opacity-50">
                Сохранить GitHub
              </button>
            </div>

            {/* Yandex */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-1">🔴 Яндекс OAuth</h2>
              <p className="text-xs text-gray-500 mb-4">
                Консоль: <a href="https://oauth.yandex.ru/client/new" target="_blank" className="text-cyan-400 hover:underline">oauth.yandex.ru</a>
                {' · '}Redirect URI: <code className="bg-black/30 px-1 rounded">{settings.backend_url}/api/auth/oauth/yandex/callback</code>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <SettingField label="Client ID" value={settings.yandex_client_id} onChange={v => setPatch({yandex_client_id: v})} placeholder="abc1234567890" />
                <SettingField label="Client Secret" type="password" value={settings.yandex_client_secret} onChange={v => setPatch({yandex_client_secret: v})} placeholder="abcdef..." />
              </div>
              <button onClick={() => handleSaveSettings(['yandex_client_id','yandex_client_secret'])} disabled={saving}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition disabled:opacity-50">
                Сохранить Яндекс
              </button>
            </div>

            {/* SMS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-1">📱 SMS (sms.ru)</h2>
              <p className="text-xs text-gray-500 mb-4">
                API ключ: <a href="https://sms.ru/?panel=api" target="_blank" className="text-cyan-400 hover:underline">sms.ru/panel/api</a>
              </p>
              <div className="max-w-sm mb-4">
                <SettingField label="API Key" type="password" value={settings.sms_api_key} onChange={v => setPatch({sms_api_key: v})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
              <button onClick={() => handleSaveSettings(['sms_api_key'])} disabled={saving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition disabled:opacity-50">
                Сохранить SMS
              </button>
            </div>

            {/* Backend URL */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-1">🌐 URL сервера</h2>
              <p className="text-xs text-gray-500 mb-4">Используется для OAuth redirect URI. Без слэша в конце.</p>
              <div className="max-w-sm mb-4">
                <SettingField label="Backend URL" value={settings.backend_url} onChange={v => setPatch({backend_url: v})} placeholder="https://aiarchi.ru" />
              </div>
              <button onClick={() => handleSaveSettings(['backend_url'])} disabled={saving}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition disabled:opacity-50">
                Сохранить URL
              </button>
            </div>

            {/* Claude API Key */}
            <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-1">🧠 Claude API (Аналитика)</h2>
              <p className="text-xs text-gray-500 mb-4">
                Нужен для вкладки «Аналитика ИИ» — Claude анализирует ваших пользователей и агентов.{' '}
                <a href="https://console.anthropic.com" target="_blank" className="text-cyan-400 hover:underline">Получить ключ →</a>
              </p>
              <div className="max-w-sm mb-4">
                <SettingField label="Claude API Key" type="password" value={settings.claude_api_key} onChange={v => setPatch({claude_api_key: v})} placeholder="sk-ant-api03-..." />
              </div>
              <button onClick={() => handleSaveSettings(['claude_api_key'])} disabled={saving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition disabled:opacity-50">
                Сохранить Claude ключ
              </button>
            </div>
          </div>
        )}

        {/* Tab: Email / SMTP */}
        {activeTab === 'email' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-1">📧 Email / SMTP</h2>
            <p className="text-xs text-gray-500 mb-6">
              Используется для уведомлений о регистрации, оплате и т.д.
              Gmail: smtp.gmail.com:587, Yandex: smtp.yandex.ru:587
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <SettingField label="SMTP Host" value={settings.smtp_host} onChange={v => setPatch({smtp_host: v})} placeholder="smtp.gmail.com" />
              <SettingField label="SMTP Port" value={settings.smtp_port} onChange={v => setPatch({smtp_port: v})} placeholder="587" />
              <SettingField label="Логин (email)" value={settings.smtp_user} onChange={v => setPatch({smtp_user: v})} placeholder="no-reply@aiarchi.ru" />
              <SettingField label="Пароль" type="password" value={settings.smtp_password} onChange={v => setPatch({smtp_password: v})} placeholder="••••••••" />
              <SettingField label="From (адрес отправителя)" value={settings.smtp_from} onChange={v => setPatch({smtp_from: v})} placeholder="AI Architect <no-reply@aiarchi.ru>" />
            </div>
            <button
              onClick={() => handleSaveSettings(['smtp_host','smtp_port','smtp_user','smtp_password','smtp_from'])}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки Email'}
            </button>
          </div>
        )}

        {/* Tab: Payments / YuKassa */}
        {activeTab === 'payments' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-1">💳 ЮKassa (оплата)</h2>
            <p className="text-xs text-gray-500 mb-6">
              Ключи из личного кабинета ЮKassa. Shop ID и Секретный ключ для тарифа Starter и Pro.
              <br/>
              <a href="https://yookassa.ru/my/merchant/integration" target="_blank" className="text-cyan-400 hover:underline mt-1 inline-block">
                yookassa.ru/my/merchant/integration →
              </a>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <SettingField label="Shop ID" value={settings.yookassa_shop_id} onChange={v => setPatch({yookassa_shop_id: v})} placeholder="123456" />
              <SettingField label="Секретный ключ" type="password" value={settings.yookassa_secret_key} onChange={v => setPatch({yookassa_secret_key: v})} placeholder="live_..." />
            </div>
            <button
              onClick={() => handleSaveSettings(['yookassa_shop_id','yookassa_secret_key'])}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить ЮKassa'}
            </button>

            <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-sm text-yellow-300 font-medium">⚠️ Webhook URL для ЮKassa</p>
              <p className="text-xs text-gray-400 mt-1">Укажи в личном кабинете ЮKassa:</p>
              <code className="text-xs bg-black/30 px-2 py-1 rounded mt-1 inline-block">
                {settings.backend_url}/api/payment/webhook
              </code>
            </div>
          </div>
        )}

        {/* Tab: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Пользователей', value: stats?.total_users ?? 0, icon: '👥', color: 'cyan' },
                { label: 'Платящих', value: stats?.paid_users ?? 0, icon: '💳', color: 'green' },
                { label: 'Агентов', value: stats?.total_agents ?? 0, icon: '🤖', color: 'purple' },
                { label: 'Генераций/мес', value: stats?.generations_this_month ?? 0, icon: '⚡', color: 'yellow' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Run button */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">🧠 Анализ Claude AI</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Claude проанализирует последних {analyticsData?.agents_analyzed ?? 40} агентов и их чаты —
                    найдёт проблемы качества, паттерны запросов и даст рекомендации по улучшению платформы.
                  </p>
                </div>
                <button
                  onClick={runAnalytics}
                  disabled={analyticsLoading}
                  className="flex-shrink-0 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600
                             hover:from-cyan-500 hover:to-purple-500 rounded-xl text-sm font-medium
                             transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {analyticsLoading ? '⏳ Анализирую...' : '▶ Запустить анализ'}
                </button>
              </div>

              {!settings.claude_api_key && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-300">
                  ⚠️ Claude API Key не настроен. Перейдите на вкладку <strong>OAuth / SMS</strong> → секция «Claude API» и добавьте ключ.
                </div>
              )}

              {analyticsLoading && (
                <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-cyan-300">Claude анализирует данные... обычно это занимает 20-40 секунд</p>
                </div>
              )}

              {analyticsError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
                  ❌ {analyticsError}
                </div>
              )}
            </div>

            {/* Analysis result */}
            {analyticsData && !analyticsLoading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Результат анализа</h3>
                  <span className="text-xs text-gray-500">Проанализировано агентов: {analyticsData.agents_analyzed}</span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed bg-black/20 p-4 rounded-xl overflow-auto">
                    {analyticsData.analysis}
                  </pre>
                </div>
                <button
                  onClick={runAnalytics}
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
                >
                  ↻ Обновить анализ
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

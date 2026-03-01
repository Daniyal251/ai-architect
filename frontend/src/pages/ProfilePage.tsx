import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = '';

const PLAN_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  free:    { label: 'Free',    color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',    icon: '🆓' },
  starter: { label: 'Starter', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '⚡' },
  pro:     { label: 'Pro',     color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',    icon: '🚀' },
  admin:   { label: 'Admin',   color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: '👑' },
};

interface ProfileData {
  username: string;
  email: string | null;
  plan: string;
  plan_name: string;
  created_at: string | null;
  generations_used: number;
  generations_limit: number;
  generations_remaining: number;
  agents_count: number;
  agents_limit: number;
  can_generate: boolean;
  can_save_agent: boolean;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { token, username, plan, logout } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Форма смены email
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Форма смены пароля
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setNewEmail(data.email || '');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const saveEmail = async () => {
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail }),
      });
      if (res.ok) {
        setEmailMsg({ type: 'ok', text: 'Email обновлён' });
        fetchProfile();
      } else {
        const err = await res.json();
        setEmailMsg({ type: 'err', text: err.detail || 'Ошибка' });
      }
    } catch {
      setEmailMsg({ type: 'err', text: 'Ошибка сети' });
    } finally {
      setEmailSaving(false);
    }
  };

  const savePassword = async () => {
    setPassMsg(null);
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'err', text: 'Пароли не совпадают' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'err', text: 'Пароль минимум 6 символов' });
      return;
    }
    setPassSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: curPassword, new_password: newPassword }),
      });
      if (res.ok) {
        setPassMsg({ type: 'ok', text: 'Пароль успешно изменён' });
        setCurPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        setPassMsg({ type: 'err', text: err.detail || 'Ошибка' });
      }
    } catch {
      setPassMsg({ type: 'err', text: 'Ошибка сети' });
    } finally {
      setPassSaving(false);
    }
  };

  const badge = PLAN_BADGE[plan] || PLAN_BADGE.free;
  const isUnlimited = (n: number) => n === -1;

  const genPct = profile && !isUnlimited(profile.generations_limit)
    ? Math.min(100, (profile.generations_used / profile.generations_limit) * 100)
    : 0;

  const agentPct = profile && !isUnlimited(profile.agents_limit)
    ? Math.min(100, (profile.agents_count / profile.agents_limit) * 100)
    : 0;

  return (
    <div className="min-h-full bg-gray-950">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-white">Профиль</h1>

        {loading ? (
          <div className="text-gray-400 animate-pulse text-center py-20">Загрузка...</div>
        ) : (
          <>
            {/* === Карточка профиля === */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600
                                  flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{username}</h2>
                    <p className="text-sm text-gray-400">{profile?.email || 'Email не указан'}</p>
                    {profile?.created_at && (
                      <p className="text-xs text-gray-600 mt-1">
                        Зарегистрирован: {new Date(profile.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${badge.color}`}>
                  {badge.icon} {badge.label}
                </span>
              </div>
            </div>

            {/* === Использование === */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-5">Использование</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Генерации */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Генерации в этом месяце</span>
                    <span className="text-white font-medium">
                      {profile?.generations_used ?? 0}
                      {' / '}
                      {isUnlimited(profile?.generations_limit ?? 0) ? '∞' : profile?.generations_limit}
                    </span>
                  </div>
                  {!isUnlimited(profile?.generations_limit ?? 0) ? (
                    <>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${genPct >= 90 ? 'bg-red-400' : genPct >= 70 ? 'bg-orange-400' : 'bg-cyan-500'}`}
                          style={{ width: `${genPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Осталось: {profile?.generations_remaining ?? 0}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-cyan-400 mt-1">Безлимитные генерации</p>
                  )}
                </div>

                {/* Агенты */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Сохранённых агентов</span>
                    <span className="text-white font-medium">
                      {profile?.agents_count ?? 0}
                      {' / '}
                      {isUnlimited(profile?.agents_limit ?? 0) ? '∞' : profile?.agents_limit}
                    </span>
                  </div>
                  {!isUnlimited(profile?.agents_limit ?? 0) ? (
                    <>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${agentPct >= 90 ? 'bg-red-400' : agentPct >= 70 ? 'bg-orange-400' : 'bg-purple-500'}`}
                          style={{ width: `${agentPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Можно сохранить ещё: {Math.max(0, (profile?.agents_limit ?? 0) - (profile?.agents_count ?? 0))}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-purple-400 mt-1">Безлимитное хранилище</p>
                  )}
                </div>
              </div>

              {/* Тариф-апгрейд */}
              {plan !== 'pro' && plan !== 'admin' && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-3">
                    Нужно больше? Обновите тариф для неограниченного доступа.
                  </p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500
                               rounded-xl text-sm font-medium hover:opacity-90 transition"
                  >
                    Посмотреть тарифы →
                  </button>
                </div>
              )}
            </div>

            {/* === Смена Email === */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Email</h3>
              <div className="flex gap-3 flex-wrap">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 min-w-48 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
                <button
                  onClick={saveEmail}
                  disabled={emailSaving}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm
                             font-medium transition disabled:opacity-50"
                >
                  {emailSaving ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
              {emailMsg && (
                <p className={`text-sm mt-2 ${emailMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {emailMsg.text}
                </p>
              )}
            </div>

            {/* === Смена пароля === */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Смена пароля</h3>
              <div className="space-y-3 max-w-sm">
                <input
                  type="password"
                  value={curPassword}
                  onChange={(e) => setCurPassword(e.target.value)}
                  placeholder="Текущий пароль"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Новый пароль (мин. 6 символов)"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Подтвердите новый пароль"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
                <button
                  onClick={savePassword}
                  disabled={passSaving || !curPassword || !newPassword || !confirmPassword}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                             border border-cyan-500/30 text-cyan-300 rounded-xl text-sm font-medium
                             hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {passSaving ? 'Меняем пароль...' : 'Изменить пароль'}
                </button>
                {passMsg && (
                  <p className={`text-sm ${passMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {passMsg.text}
                  </p>
                )}
              </div>
            </div>

            {/* === Быстрые действия === */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Быстрые действия</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/app/new')}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500
                             rounded-xl text-sm font-medium hover:opacity-90 transition"
                >
                  + Создать агента
                </button>
                <button
                  onClick={() => navigate('/app/agents')}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition"
                >
                  Мои агенты ({profile?.agents_count ?? 0})
                </button>
                {plan === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="px-5 py-2.5 bg-yellow-500/20 border border-yellow-500/30
                               text-yellow-300 rounded-xl text-sm font-medium hover:opacity-80 transition"
                  >
                    👑 Админ-панель
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="px-5 py-2.5 bg-red-500/10 border border-red-500/20
                             text-red-400 rounded-xl text-sm font-medium hover:opacity-80 transition"
                >
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


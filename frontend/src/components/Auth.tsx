import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Props {
  onAuthSuccess: (token: string, username: string, plan: string) => void;
}

const API_URL = '';

type AuthMode = 'login' | 'register' | 'phone';

// ── OAuth кнопки ──────────────────────────────────────────────────────────────

const OAUTH_PROVIDERS = [
  {
    id: 'google',
    label: 'Войти через Google',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Войти через GitHub',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
  {
    id: 'yandex',
    label: 'Войти через Яндекс',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
        <path d="M13.47 18H11.5V9.41H10.3c-1.47 0-2.25.73-2.25 1.87 0 1.27.57 1.87 1.73 2.67L11 15.1 8.18 18H6.09l3.06-3.95C7.55 13.12 6.7 12 6.7 10.25c0-2.16 1.5-3.55 3.62-3.55h3.15V18z" fill="white"/>
      </svg>
    ),
  },
];

// ── Phone auth ─────────────────────────────────────────────────────────────────

function PhoneAuth({ onSuccess }: { onSuccess: (t: string, u: string, p: string) => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode]   = useState('');
  const [step, setStep]   = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка отправки');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally { setLoading(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Неверный код');
      onSuccess(data.access_token, data.username, data.plan || 'free');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally { setLoading(false); }
  };

  return step === 'phone' ? (
    <form onSubmit={sendCode} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Номер телефона</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+79001234567"
          required
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm
                     placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>
      {error && <p className="text-red-400 text-sm px-3 py-2 bg-red-500/10 rounded-lg">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-sm font-medium
                   text-white hover:opacity-90 transition disabled:opacity-50">
        {loading ? 'Отправка...' : 'Получить код'}
      </button>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm text-gray-400 text-center">Код отправлен на <strong className="text-white">{phone}</strong></p>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Код из SMS</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          maxLength={6}
          required
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm
                     placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition
                     text-center text-xl tracking-widest"
        />
      </div>
      {error && <p className="text-red-400 text-sm px-3 py-2 bg-red-500/10 rounded-lg">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-sm font-medium
                   text-white hover:opacity-90 transition disabled:opacity-50">
        {loading ? 'Проверяем...' : 'Войти'}
      </button>
      <button type="button" onClick={() => { setStep('phone'); setError(''); }}
        className="w-full text-xs text-gray-500 hover:text-gray-300 transition">
        Изменить номер
      </button>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function Auth({ onAuthSuccess }: Props) {
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const [mode, setMode]       = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState(oauthError ? 'Не удалось войти через соцсеть. Попробуйте снова.' : '');
  const [loading, setLoading] = useState(false);

  const handleOAuth = (provider: string) => {
    window.location.href = `${API_URL}/api/auth/oauth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const isLogin = mode === 'login';
      const res = await fetch(`${API_URL}${isLogin ? '/api/auth/login' : '/api/auth/register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { username, password } : { username, password, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка авторизации');

      if (isLogin) {
        onAuthSuccess(data.access_token, data.username, data.plan || 'free');
      } else {
        setSuccess('Аккаунт создан! Теперь войдите.');
        setMode('login');
        setEmail('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-3">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Architect</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'phone' ? 'Вход по телефону' : mode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт'}
          </p>
        </div>

        <div className="bg-gray-900 border border-white/8 rounded-2xl p-6 space-y-4">

          {mode === 'phone' ? (
            <>
              <PhoneAuth onSuccess={onAuthSuccess} />
              <button onClick={() => { setMode('login'); setError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition text-center">
                ← Назад
              </button>
            </>
          ) : (
            <>
              {/* OAuth buttons */}
              <div className="space-y-2">
                {OAUTH_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => handleOAuth(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10
                               text-sm text-gray-200 hover:bg-white/5 transition">
                    {p.icon}
                    {p.label}
                  </button>
                ))}
                <button onClick={() => { setMode('phone'); setError(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10
                             text-sm text-gray-200 hover:bg-white/5 transition">
                  <span className="text-base">📱</span>
                  Войти по телефону
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-gray-600">или</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* Email/password form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Имя пользователя</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="username" required
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm
                               placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition" />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Email <span className="text-gray-600">(необязательно)</span>
                    </label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm
                                 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Пароль</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={6}
                      className="w-full px-3 py-2.5 pr-20 bg-white/5 border border-white/10 rounded-xl text-white text-sm
                                 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition" />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300 transition">
                      {showPass ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                </div>

                {success && (
                  <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-sm font-medium
                             text-white hover:opacity-90 transition disabled:opacity-50">
                  {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition">
                  {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться бесплатно' : 'Уже есть аккаунт? Войти'}
                </button>
              </div>
            </>
          )}
        </div>

        {mode === 'register' && (
          <p className="text-center text-xs text-gray-600 mt-3">Бесплатно: 3 генерации в месяц</p>
        )}
      </div>
    </div>
  );
}

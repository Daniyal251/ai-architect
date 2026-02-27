import { useState } from 'react';
import type { LoginRequest, RegisterRequest } from '../types.js';

interface Props {
  onAuthSuccess: (token: string, username: string) => void;
}

const API_URL = 'http://localhost:8000';

export function Auth({ onAuthSuccess }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body: LoginRequest | RegisterRequest = { username, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка авторизации');
      }

      if (isLogin) {
        // Сохраняем токен
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        onAuthSuccess(data.access_token, data.username);
      } else {
        // После регистрации сразу входим
        setIsLogin(true);
        setError('Регистрация успешна! Теперь войдите.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
            AI Architect
          </h1>
          <p className="text-gray-400">Создайте ИИ-агента за 5 минут</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 
                         focus:ring-1 focus:ring-cyan-500 transition"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 
                         focus:ring-1 focus:ring-cyan-500 transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className={`p-3 rounded-xl text-sm ${
              error.includes('успешна') 
                ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 
                       rounded-xl font-medium text-white hover:opacity-90 transition 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-gray-500 text-center">
            По умолчанию: admin / admin123
          </div>
        )}
      </div>
    </div>
  );
}

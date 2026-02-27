import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    period: 'навсегда',
    color: 'border-white/20',
    btnClass: 'bg-white/10 hover:bg-white/20 text-white',
    features: [
      { text: '3 генерации в месяц', ok: true },
      { text: '5 сохранённых агентов', ok: true },
      { text: 'Все типы агентов', ok: true },
      { text: 'Экспорт PDF', ok: false },
      { text: 'API доступ', ok: false },
      { text: 'Приоритетная поддержка', ok: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '990',
    period: 'месяц',
    color: 'border-purple-500/50',
    btnClass: 'bg-purple-600 hover:bg-purple-500 text-white',
    features: [
      { text: '25 генераций в месяц', ok: true },
      { text: '30 сохранённых агентов', ok: true },
      { text: 'Все типы агентов', ok: true },
      { text: 'Экспорт PDF', ok: true },
      { text: 'API доступ', ok: false },
      { text: 'Приоритетная поддержка', ok: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2 990',
    period: 'месяц',
    highlight: true,
    color: 'border-cyan-500',
    btnClass: 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 text-white',
    features: [
      { text: 'Безлимитные генерации', ok: true },
      { text: 'Безлимитные агенты', ok: true },
      { text: 'Все типы агентов', ok: true },
      { text: 'Экспорт PDF', ok: true },
      { text: 'API доступ', ok: true },
      { text: 'Приоритетная поддержка', ok: true },
    ],
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, plan, token, refreshUsage } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (planId === 'free' || planId === plan) return;

    setLoading(planId);
    try {
      const res = await fetch(`${API_URL}/api/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        await refreshUsage();
        setSuccess(`Тариф ${planId.charAt(0).toUpperCase() + planId.slice(1)} активирован!`);
        setTimeout(() => { setSuccess(''); navigate('/app/new'); }, 2000);
      }
    } catch {
      // ignore
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Nav */}
      <nav className="p-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
          >
            AI Architect
          </button>
          <div className="flex gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/app/new')}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition"
              >
                ← В приложение
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-sm"
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Простые и прозрачные тарифы</h1>
          <p className="text-gray-400 text-lg">Начни бесплатно, апгрейдни когда нужно</p>
          {isAuthenticated && plan && (
            <div className="mt-4 inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm">
              Ваш текущий тариф: <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>
            </div>
          )}
        </div>

        {success && (
          <div className="mb-8 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-center">
            ✅ {success}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative bg-white/5 border rounded-2xl p-6 flex flex-col
                ${p.color}
                ${p.highlight ? 'shadow-lg shadow-cyan-500/20' : ''}
              `}
            >
              {p.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500
                                text-white text-xs px-4 py-1.5 rounded-full font-semibold">
                  🔥 Популярный
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-xl font-bold">{p.name}</h2>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  {p.price !== '0' && <span className="text-gray-400 mb-1">₽ / {p.period}</span>}
                  {p.price === '0' && <span className="text-gray-400 mb-1">{p.period}</span>}
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${f.ok ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                    <span className={f.ok ? 'text-cyan-400' : 'text-gray-600'}>
                      {f.ok ? '✓' : '✕'}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(p.id)}
                disabled={loading === p.id || plan === p.id}
                className={`w-full py-3 rounded-xl font-medium transition
                  ${p.btnClass}
                  ${plan === p.id ? 'opacity-50 cursor-default' : ''}
                  ${loading === p.id ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {loading === p.id
                  ? 'Подключаем...'
                  : plan === p.id
                    ? '✓ Текущий тариф'
                    : p.id === 'free'
                      ? 'Начать бесплатно'
                      : `Выбрать ${p.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Оплата через Stripe · Отмена в любой момент · Лимиты обновляются 1-го числа каждого месяца
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Вопросы? Напишите нам — ответим в течение часа.
          </p>
        </div>
      </div>
    </div>
  );
}

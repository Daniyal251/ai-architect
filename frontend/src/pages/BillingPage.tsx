import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0 ₽',
    period: 'навсегда',
    description: 'Для знакомства с платформой',
    features: [
      '3 генерации в месяц',
      'До 5 агентов',
      'Базовая поддержка',
      'Стандартные метрики',
    ],
    cta: 'Текущий тариф',
    disabled: true,
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '990 ₽',
    period: 'в месяц',
    description: 'Для небольших проектов',
    features: [
      '25 генераций в месяц',
      'До 30 агентов',
      'Приоритетная поддержка',
      'Контекстные метрики',
      'Chat Copilot',
    ],
    cta: 'Перейти на Starter',
    disabled: false,
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2 990 ₽',
    period: 'в месяц',
    description: 'Для профессионалов',
    features: [
      'Безлимитные генерации',
      'Безлимитные агенты',
      'VIP-поддержка 24/7',
      'Все метрики и аналитика',
      'Экспорт в PDF/JSON',
      'API доступ',
    ],
    cta: 'Перейти на Pro',
    disabled: false,
    highlight: false,
  },
];

export function BillingPage() {
  const navigate = useNavigate();
  const { usage, logout, username } = useAuth();

  const handleUpgrade = async (plan: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:8000/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (response.ok) {
        alert(`Тариф изменён на ${plan}!`);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.detail}`);
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <header className="p-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/app/new')}
            className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
          >
            AI Architect
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">👤 {username}</span>
            <button
              onClick={() => navigate('/app/agents')}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Мои агенты
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Выберите тариф</h1>
          <p className="text-gray-400 text-lg">
            Начните бесплатно — обновите, когда будете готовы
          </p>
        </div>

        {/* Current Usage */}
        {usage && (
          <div className="mb-12 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Текущее использование</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {usage.generations_remaining === -1 ? '∞' : usage.generations_remaining}
                </div>
                <div className="text-sm text-gray-400">Генераций осталось</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {usage.agents_count}
                </div>
                <div className="text-sm text-gray-400">Агентов создано</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-green-400">
                  {usage.plan_name}
                </div>
                <div className="text-sm text-gray-400">Текущий тариф</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {usage.can_generate ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-400">Доступна генерация</div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border transition ${
                plan.highlight
                  ? 'bg-gradient-to-b from-purple-500/10 to-cyan-500/10 border-purple-500/50 scale-105'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full text-xs font-semibold">
                  Популярный
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm">/ {plan.period}</span>
                </div>
                <p className="text-sm text-gray-400">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-400 mt-0.5">✓</span>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.disabled}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  plan.disabled
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : plan.highlight
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Частые вопросы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-2">💳 Можно ли отменить подписку?</h3>
              <p className="text-sm text-gray-400">
                Да, в любой момент. Доступ к тарифу сохранится до конца оплаченного периода.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-2">🔄 Как работает обновление?</h3>
              <p className="text-sm text-gray-400">
                При переходе на тариф выше разница в стоимости пересчитывается пропорционально оставшимся дням.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-2">📊 Что если исчерпаю лимит?</h3>
              <p className="text-sm text-gray-400">
                Генерация станет недоступна до следующего месяца или обновления тарифа.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-2">💼 Есть скидки для команд?</h3>
              <p className="text-sm text-gray-400">
                Да, для команд от 5 человек — скидка 20%. Напишите нам для обсуждения.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

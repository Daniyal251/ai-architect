import { useNavigate } from 'react-router-dom';
import type { UsageInfo } from '../types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usage: UsageInfo | null;
  reason?: 'generation' | 'agents';
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '990',
    gens: '25',
    agents: '30',
    highlight: false,
    features: ['25 генераций/мес', '30 сохранённых агентов', 'Экспорт PDF', 'Приоритетная поддержка'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2 990',
    gens: '∞',
    agents: '∞',
    highlight: true,
    features: ['Безлимитные генерации', 'Безлимитные агенты', 'Экспорт PDF', 'API доступ', 'Приоритетная поддержка'],
  },
];

export function UpgradeModal({ isOpen, onClose, usage, reason = 'generation' }: Props) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const title = reason === 'generation'
    ? `Лимит ${usage?.generations_limit ?? 3} генераций исчерпан`
    : `Лимит ${usage?.agents_limit ?? 5} агентов исчерпан`;

  const subtitle = reason === 'generation'
    ? 'Обновитесь, чтобы продолжить создавать агентов'
    : 'Обновитесь, чтобы сохранять больше агентов';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-xl w-full p-6 relative">
        {/* Закрыть */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition text-xl"
        >
          ✕
        </button>

        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-gray-400 mt-2 text-sm">{subtitle}</p>

          {/* Прогресс-бар */}
          {usage && usage.generations_limit > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Использовано</span>
                <span>{usage.generations_used} / {usage.generations_limit}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Планы */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl p-4 border relative ${
                plan.highlight
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Популярный
                </div>
              )}
              <h3 className="font-bold text-white text-lg">{plan.name}</h3>
              <div className="mt-1 mb-3">
                <span className="text-2xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400 text-sm"> ₽/мес</span>
              </div>
              <ul className="space-y-1 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-center gap-2">
                    <span className="text-cyan-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { onClose(); navigate('/pricing'); }}
                className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Выбрать {plan.name}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-500">
          Лимиты обновляются каждый месяц · Отмена в любой момент
        </p>
      </div>
    </div>
  );
}

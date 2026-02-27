import { useState } from 'react';

interface LandingProps {
  onSubmit: (idea: string) => void;
  loading: boolean;
}

const TEMPLATES = [
  {
    category: '🛒 E-commerce',
    ideas: [
      "Агент для авто-ответов на отзывы на Wildberries и Ozon",
      "ИИ-помощник для анализа закупок в Китае — сравнение поставщиков, цен, условий доставки",
      "Бот для обработки возвратов и претензий клиентов",
    ]
  },
  {
    category: '📊 Бизнес-процессы',
    ideas: [
      "ИИ-помощник для обработки заявок в CRM — квалификация лидов, расстановка задач",
      "Агент для подготовки коммерческих предложений по шаблону",
      "Бот для онбординга новых сотрудников — документы, инструкции, знакомство с командой",
    ]
  },
  {
    category: '🎨 Контент',
    ideas: [
      "Бот-дизайнер для соцсетей — создаёт концепции постов по брендбуку",
      "ИИ-копирайтер для email-рассылок — персонализация под сегменты аудитории",
      "Агент для генерации описаний товаров по фото",
    ]
  },
  {
    category: '🔧 Технические',
    ideas: [
      "Хочу поставить двигатель V12 в ВАЗ-2109 — что нужно и сколько стоит",
      "Агент для мониторинга серверов — алерты в Telegram, логи, метрики",
      "Бот для деплоя на продакшен — проверка тестов, сборка, релиз",
    ]
  },
  {
    category: '📈 Аналитика',
    ideas: [
      "Агент для анализа конкурентов — цены, ассортимент, акции",
      "ИИ для прогнозирования продаж на основе исторических данных",
      "Бот для сбора и визуализации метрик из Google Analytics",
    ]
  }
];

const QUICK_START = [
  "🚀 Создать агента за 2 минуты",
  "💡 Идеи для автоматизации",
  "📋 Готовые шаблоны",
];

export function Landing({ onSubmit, loading }: LandingProps) {
  const [idea, setIdea] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) onSubmit(idea);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-5xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
        AI Architect
      </h1>
      <p className="text-xl text-gray-400 mb-8 text-center max-w-2xl">
        Вы описываете проблему — мы собираем ИИ-сотрудника, который её решит
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-8">
        <div className="relative">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Опишите вашу бизнес-задачу или идею..."
            className="w-full h-32 px-6 py-4 text-lg bg-white/10 border border-white/20 rounded-2xl
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none
                       placeholder:text-gray-500 text-white"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !idea.trim()}
            className="absolute bottom-4 right-4 px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500
                       rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Генерация...' : 'Создать агента →'}
          </button>
        </div>
      </form>

      {/* Quick Start Templates */}
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-3">📋 Быстрый старт — выберите шаблон:</p>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                activeCategory === null
                  ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              Все шаблоны
            </button>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.category}
                onClick={() => setActiveCategory(activeCategory === tpl.category ? null : tpl.category)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  activeCategory === tpl.category
                    ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {tpl.category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.filter(tpl => !activeCategory || activeCategory === tpl.category)
            .flatMap(tpl => tpl.ideas.map(idea => ({ category: tpl.category, idea })))
            .slice(0, 12)
            .map((item, idx) => (
              <button
                key={idx}
                onClick={() => setIdea(item.idea)}
                className="p-4 bg-white/5 border border-white/10 rounded-xl text-left
                           hover:bg-white/10 hover:border-cyan-500/30 transition group"
              >
                <div className="text-xs text-gray-500 mb-1">{item.category}</div>
                <div className="text-sm text-gray-300 group-hover:text-white transition">
                  {item.idea}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

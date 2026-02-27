import { useNavigate } from 'react-router-dom';

const examples = [
  {
    emoji: '🛒',
    title: 'Агент закупок',
    desc: 'Анализирует поставщиков в Китае, сравнивает цены, находит лучшие условия поставки',
  },
  {
    emoji: '⭐',
    title: 'Менеджер отзывов',
    desc: 'Авто-ответы на отзывы Wildberries с учётом тональности и политики бренда',
  },
  {
    emoji: '🎨',
    title: 'Дизайнер контента',
    desc: 'Создаёт концепции постов для соцсетей по вашему брендбуку и целевой аудитории',
  },
  {
    emoji: '📋',
    title: 'CRM-ассистент',
    desc: 'Обрабатывает входящие заявки, квалифицирует лиды, расставляет задачи по менеджерам',
  },
];

const features = [
  { emoji: '📝', title: 'Системный промпт', desc: 'Готовый промпт для вашего AI-сотрудника — вставь и запускай' },
  { emoji: '🔀', title: 'Архитектура потока', desc: 'Визуальная схема работы агента — кто что делает и в каком порядке' },
  { emoji: '📅', title: 'План внедрения', desc: 'Пошаговый таймлайн запуска по дням без лишней воды' },
  { emoji: '🎯', title: 'Что нужно для старта', desc: 'Список ресурсов, материалов и инструментов под конкретную задачу — без лишнего' },
  { emoji: '💬', title: 'AI-помощник исполнения', desc: 'Нажми на любой шаг плана — и получи пошаговую инструкцию как его выполнить прямо сейчас' },
  { emoji: '💾', title: 'Все агенты под рукой', desc: 'История всех ваших агентов сохраняется — возвращайся когда нужно' },
];

const steps = [
  {
    num: '01',
    icon: '💬',
    title: 'Опишите задачу',
    desc: 'Напишите что угодно — даже сырую идею вроде "хочу автоматизировать отзывы". AI разберётся.',
  },
  {
    num: '02',
    icon: '🤔',
    title: 'AI уточняет',
    desc: 'Задаём 1–3 точных вопроса про бизнес-контекст. Занимает меньше минуты.',
  },
  {
    num: '03',
    icon: '🚀',
    title: 'Получаете агента',
    desc: 'Промпт, архитектура, план и список ресурсов — всё готово за 5 минут.',
  },
];

export function MarketingLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* NavBar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            AI Architect
          </span>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">
              Как работает
            </a>
            <a href="#examples" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">
              Примеры
            </a>
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Войти
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Попробовать бесплатно
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Уже создано 500+ AI-агентов
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
            Превратите любую идею<br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              в AI-сотрудника
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Опишите задачу — получите готового AI-агента с системным промптом,
            архитектурой и планом внедрения за 5 минут
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl
                         font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-purple-500/20"
            >
              Создать агента бесплатно →
            </button>
            <a
              href="#how"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl
                         font-medium text-lg hover:bg-white/10 transition"
            >
              Как это работает
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Как это работает</h2>
            <p className="text-gray-400">Три шага — от идеи до готового AI-сотрудника</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {/* connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
                )}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-cyan-500/30 transition relative z-10">
                  <div className="text-4xl mb-5">{step.icon}</div>
                  <div className="text-xs font-mono text-cyan-400 mb-2">{step.num}</div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Что вы получаете</h2>
            <p className="text-gray-400">Полный пакет для запуска AI-агента — ничего лишнего</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition"
              >
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Примеры агентов</h2>
            <p className="text-gray-400">Реальные кейсы, которые уже автоматизируют бизнес</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {examples.map((ex) => (
              <div
                key={ex.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-8
                           hover:border-cyan-500/30 transition cursor-pointer group"
                onClick={() => navigate('/auth')}
              >
                <div className="text-4xl mb-4">{ex.emoji}</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-cyan-400 transition">
                  {ex.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{ex.desc}</p>
                <div className="mt-4 text-sm text-cyan-400 opacity-0 group-hover:opacity-100 transition">
                  Создать похожего →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10 rounded-3xl p-14">
            <h2 className="text-4xl font-bold mb-4">
              Готовы создать<br />своего AI-сотрудника?
            </h2>
            <p className="text-gray-400 mb-8">
              Бесплатно. Без кредитной карты. Займёт 5 минут.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-500
                         rounded-xl font-semibold text-lg hover:opacity-90 transition
                         shadow-lg shadow-purple-500/25"
            >
              Начать бесплатно →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            AI Architect
          </span>
          <p className="text-sm text-gray-600">© 2025 AI Architect. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}

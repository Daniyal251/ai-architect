import { useNavigate } from 'react-router-dom';

const capabilities = [
  { 
    emoji: '📝', 
    title: 'Персональная инструкция', 
    desc: 'ИИ напишет подробную инструкцию именно для вашей задачи — просто следуйте шагам' 
  },
  { 
    emoji: '🔀', 
    title: 'Наглядная схема', 
    desc: 'ИИ нарисует как работает решение — понятно даже новичку' 
  },
  { 
    emoji: '📅', 
    title: 'Пошаговый план', 
    desc: 'Что делать по дням — от подготовки до запуска' 
  },
  { 
    emoji: '🎯', 
    title: 'Список необходимого', 
    desc: 'Конкретные инструменты, материалы, сервисы — без лишнего' 
  },
  { 
    emoji: '💬', 
    title: 'Чат-помощник на связи', 
    desc: 'Застряли? Спросите — ИИ подскажет как сделать прямо сейчас' 
  },
  { 
    emoji: '📄', 
    title: 'Готовые файлы', 
    desc: 'PDF инструкции, Excel таблицы, схемы, чертежи — всё готово' 
  },
  { 
    emoji: '💰', 
    title: 'Расчёт затрат и выгоды', 
    desc: 'Сколько стоит реализовать и сколько сэкономит/заработает' 
  },
  { 
    emoji: '💾', 
    title: 'Постоянный помощник', 
    desc: 'ИИ не исчезнет — поможет реализовать проект от начала до конца' 
  },
];

const examples = [
  {
    category: '📊 Бизнес',
    items: [
      { emoji: '💬', title: 'Ответы на отзывы', desc: 'ИИ сам отвечает клиентам в Wildberries, Ozon, Telegram' },
      { emoji: '📋', title: 'Обработка заявок', desc: 'ИИ распределяет заявки по менеджерам, не теряет клиентов' },
      { emoji: '📊', title: 'Отчётность', desc: 'ИИ готовит отчёты автоматически — экономия 10 часов в неделю' },
    ]
  },
  {
    category: '🛒 Торговля',
    items: [
      { emoji: '🛍️', title: 'Продажи на WB', desc: 'ИИ помогает с закупками, ценами, отзывами — старт за 2 недели' },
      { emoji: '🔍', title: 'Поиск поставщиков', desc: 'ИИ ищет в Китае, сравнивает цены, проверяет надёжность' },
      { emoji: '📈', title: 'Анализ конкурентов', desc: 'ИИ следит за ценами и акциями — вы всегда в курсе' },
    ]
  },
  {
    category: '🏠 Строительство',
    items: [
      { emoji: '🏡', title: 'Постройка дома', desc: 'ИИ считает материалы, составляет план, контролирует бюджет' },
      { emoji: '🔨', title: 'Ремонт', desc: 'ИИ рассчитывает материалы, показывает схемы, экономит до 30%' },
      { emoji: '🚗', title: 'Тюнинг авто', desc: 'ИИ подбирает детали, считает бюджет, рисует схемы установки' },
    ]
  },
  {
    category: '🎓 Обучение',
    items: [
      { emoji: '🇬🇧', title: 'Изучение языка', desc: 'ИИ составляет программу, проверяет упражнения, болтает 24/7' },
      { emoji: '💻', title: 'Программирование', desc: 'ИИ объясняет концепции, проверяет код, даёт задачи' },
      { emoji: '📚', title: 'Новая профессия', desc: 'ИИ создаёт план обучения, подбирает материалы, проверяет знания' },
    ]
  },
];

const steps = [
  {
    num: '01',
    icon: '💬',
    title: 'Расскажите что хотите сделать',
    desc: 'Просто опишите свою цель своими словами — ИИ поймёт даже если объясняете впервые',
  },
  {
    num: '02',
    icon: '🤔',
    title: 'ИИ задаст правильные вопросы',
    desc: 'Вопросы будут именно про вашу задачу — не общие шаблонные, а конкретные под вашу ситуацию',
  },
  {
    num: '03',
    icon: '🚀',
    title: 'ИИ создаст персонального помощника',
    desc: 'Готовая инструкция + файлы + расчёты + чат-помощник — всё что нужно для реализации',
  },
  {
    num: '04',
    icon: '💾',
    title: 'Помощник останется с вами',
    desc: 'ИИ не исчезнет после создания — поможет реализовать проект от начала до конца',
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
            <a href="#capabilities" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">
              Возможности
            </a>
            <a href="#examples" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">
              Примеры
            </a>
            <a href="#how" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">
              Как работает
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
            Уже создали 500+ ИИ-помощников
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
            Создайте ИИ-помощника<br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              под вашу задачу
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Не важно что вы хотите: автоматизировать бизнес, начать продавать на маркетплейсах, 
            построить дом, выучить язык или создать творческий проект.
            <br /><br />
            <strong className="text-white">
              Просто расскажите что хотите сделать — ИИ создаст персонального помощника 
              который поможет реализовать задуманное от начала до конца
            </strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl
                         font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-purple-500/20"
            >
              Создать ИИ-помощника бесплатно →
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

      {/* Capabilities */}
      <section id="capabilities" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Что умеет ИИ-помощник</h2>
            <p className="text-gray-400">Всё что нужно для реализации вашей задачи — ничего лишнего</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition"
              >
                <div className="text-3xl mb-4">{cap.emoji}</div>
                <h3 className="font-semibold mb-2">{cap.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Примеры использования</h2>
            <p className="text-gray-400">Реальные задачи которые уже решают с ИИ-помощниками</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {examples.map((category) => (
              <div key={category.category} className="space-y-4">
                <h3 className="text-2xl font-bold text-white mb-4">{category.category}</h3>
                <div className="space-y-3">
                  {category.items.map((item) => (
                    <div
                      key={item.title}
                      className="bg-white/5 border border-white/10 rounded-xl p-5 
                                 hover:border-cyan-500/30 transition cursor-pointer group"
                      onClick={() => navigate('/auth')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{item.emoji}</div>
                        <div>
                          <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500">
              ... и это только примеры! ИИ подстроится под <strong className="text-white">любую вашу задачу</strong>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Как это работает</h2>
            <p className="text-gray-400">Четыре простых шага от идеи до готового ИИ-помощника</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {/* Connector line */}
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

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10 rounded-3xl p-14">
            <h2 className="text-4xl font-bold mb-4">
              Готовы создать<br />своего ИИ-помощника?
            </h2>
            <p className="text-gray-400 mb-8">
              Это бесплатно. Не нужна кредитка. Займёт 5 минут.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-500
                         rounded-xl font-semibold text-lg hover:opacity-90 transition
                         shadow-lg shadow-purple-500/25"
            >
              Создать ИИ-помощника бесплатно →
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

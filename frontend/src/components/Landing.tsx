import { useState } from 'react';

interface LandingProps {
  onSubmit: (idea: string) => void;
  loading: boolean;
}

const CATEGORIES = [
  {
    icon: '📊',
    name: 'Бизнес',
    examples: [
      "Хочу чтобы ИИ отвечал на отзывы клиентов",
      "Нужен бот для обработки заявок в CRM",
      "Хочу автоматизировать отчётность"
    ]
  },
  {
    icon: '🛒',
    name: 'Торговля',
    examples: [
      "Хочу начать продавать на Wildberries",
      "Нужен ИИ для поиска поставщиков в Китае",
      "Хочу сравнивать цены у конкурентов"
    ]
  },
  {
    icon: '🏠',
    name: 'Строительство',
    examples: [
      "Хочу построить дом и нужен помощник",
      "Нужен расчёт материалов для ремонта",
      "Хочу поставить двигатель V12 на ВАЗ"
    ]
  },
  {
    icon: '🎓',
    name: 'Обучение',
    examples: [
      "Хочу выучить английский с ИИ-помощником",
      "Нужен помощник для изучения программирования",
      "Хочу освоить новую профессию"
    ]
  },
  {
    icon: '🎨',
    name: 'Творчество',
    examples: [
      "Хочу создать музыкальный альбом",
      "Нужен помощник для написания книги",
      "Хочу снимать видео для YouTube"
    ]
  },
  {
    icon: '💰',
    name: 'Финансы',
    examples: [
      "Хочу вести учёт финансов с ИИ",
      "Нужен помощник для инвестиций",
      "Хочу планировать бюджет"
    ]
  },
  {
    icon: '🚗',
    name: 'Авто',
    examples: [
      "Хочу тюнинговать машину",
      "Нужен помощник для ремонта авто",
      "Хочу собрать компьютер"
    ]
  },
  {
    icon: '🍳',
    name: 'Здоровье',
    examples: [
      "Хочу планировать питание с ИИ",
      "Нужен помощник для тренировок",
      "Хочу вести дневник здоровья"
    ]
  }
];

export function Landing({ onSubmit, loading }: LandingProps) {
  const [idea, setIdea] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) onSubmit(idea);
  };

  const activeExamples = activeCategory 
    ? CATEGORIES.find(c => c.name === activeCategory)?.examples || []
    : CATEGORIES.flatMap(c => c.examples);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-5xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
        AI Architect
      </h1>
      <p className="text-xl text-gray-400 mb-8 text-center max-w-3xl">
        Расскажите что вы хотите сделать — ИИ создаст персонального помощника который поможет реализовать задуманное
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-8">
        <div className="relative">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Например: 'Хочу построить дом' или 'Хочу автоматизировать ответы на отзывы'..."
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
            {loading ? 'Создаю...' : 'Создать помощника →'}
          </button>
        </div>
      </form>

      {/* Categories */}
      <div className="w-full max-w-5xl mb-8">
        <p className="text-sm text-gray-500 mb-4 text-center">Или выберите категорию:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              className={`p-4 rounded-xl border transition ${
                activeCategory === cat.name
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div className="text-sm font-medium">{cat.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div className="w-full max-w-5xl">
        <p className="text-sm text-gray-500 mb-4 text-center">
          {activeCategory ? `Примеры: ${activeCategory}` : 'Популярные запросы:'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeExamples.slice(0, 9).map((example, idx) => (
            <button
              key={idx}
              onClick={() => setIdea(example)}
              className="p-4 bg-white/5 border border-white/10 rounded-xl text-left
                         hover:bg-white/10 hover:border-cyan-500/30 transition group"
            >
              <div className="text-sm text-gray-300 group-hover:text-white transition">
                {example}
              </div>
            </button>
          ))}
        </div>
        {activeExamples.length > 9 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            ... и ещё {activeExamples.length - 9} примеров в этой категории
          </p>
        )}
      </div>

      {/* Info */}
      <div className="mt-12 max-w-3xl text-center">
        <p className="text-gray-500 text-sm">
          🎯 ИИ подстроится под вашу задачу — вопросы, файлы и расчёты будут именно про то, что нужно вам
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';

interface LandingProps {
  onSubmit: (idea: string) => void;
  loading: boolean;
}

const examples = [
  "Хочу ИИ для анализа закупок в Китае",
  "Агент для авто-ответов на отзывы на Wildberries",
  "Бот-дизайнер для соцсетей",
  "ИИ-помощник для обработки заявок в CRM"
];

export function Landing({ onSubmit, loading }: LandingProps) {
  const [idea, setIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) onSubmit(idea);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
        AI Architect
      </h1>
      <p className="text-xl text-gray-400 mb-8 text-center">
        Вы описываете проблему — мы собираем ИИ-сотрудника, который её решит
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="relative">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Опишите вашу бизнес-задачу..."
            className="w-full h-32 px-6 py-4 text-lg bg-white/10 border border-white/20 rounded-2xl 
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none
                       placeholder:text-gray-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !idea.trim()}
            className="absolute bottom-4 right-4 px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 
                       rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Генерация...' : 'Создать агента'}
          </button>
        </div>
      </form>

      <div className="mt-12 w-full max-w-2xl">
        <p className="text-sm text-gray-500 mb-3 text-center">Примеры запросов:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setIdea(ex)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm 
                         hover:bg-white/10 transition text-gray-300"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

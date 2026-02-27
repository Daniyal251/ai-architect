interface LoadingScreenProps {
  stage: string;
}

export function LoadingScreen({ stage }: LoadingScreenProps) {
  // Определяем прогресс по тексту стадии
  const getProgress = () => {
    if (stage.includes('Инициализация')) return 0;
    if (stage.includes('Декомпозиция')) return 25;
    if (stage.includes('Проектирование')) return 50;
    if (stage.includes('Отрисовка')) return 75;
    if (stage.includes('Расчёт') || stage.includes('Финализация')) return 100;
    return 0;
  };

  const progress = getProgress();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-purple-500/30 rounded-full"></div>
        <div className="absolute inset-4 border-4 border-t-purple-500 rounded-full animate-spin reverse"></div>
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-white">Нейросеть работает</h2>

      {/* Прогресс-бар */}
      <div className="w-64 mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-gray-400 text-sm mt-2">{progress}%</p>
      </div>

      <div className="text-gray-400 text-center space-y-2 max-w-md px-4">
        <p className="animate-pulse text-cyan-400 font-medium">{stage}</p>
      </div>

      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
}

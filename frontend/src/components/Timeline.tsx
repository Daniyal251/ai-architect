import type { ImplementationStep } from '../types.js';

interface Props {
  steps: ImplementationStep[];
}

export function Timeline({ steps }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">📅 План внедрения</h3>
      <div className="relative">
        {/* Вертикальная линия прогресса */}
        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-transparent opacity-30" />
        
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start gap-4 group">
              {/* Индикатор шага с линией */}
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20
                                border border-cyan-500/30 rounded-xl flex flex-col items-center justify-center
                                group-hover:border-cyan-400 group-hover:shadow-lg group-hover:shadow-cyan-500/20
                                transition-all duration-300">
                  <span className="text-xs text-gray-400">День</span>
                  <span className="text-xl font-bold text-cyan-400">{step.day}</span>
                </div>
                {/* Точка на линии */}
                {index < steps.length - 1 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-500 rounded-full 
                                  shadow-lg shadow-cyan-500/50" />
                )}
              </div>
              
              {/* Контент шага */}
              <div className="flex-1 pt-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 
                                group-hover:bg-white/10 group-hover:border-cyan-500/30 
                                transition-all duration-300">
                  <p className="font-medium text-gray-100">{step.task}</p>
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    <span className="inline-block w-4 h-4 bg-purple-500/20 rounded-full 
                                     flex items-center justify-center text-xs">⏱</span>
                    {step.duration}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

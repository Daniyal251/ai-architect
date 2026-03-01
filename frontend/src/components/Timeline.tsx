import { useState } from 'react';
import type { ImplementationStep } from '../types.js';

interface Props {
  steps: ImplementationStep[];
  onExecuteStep?: (step: ImplementationStep) => void;
  onDrillDown?: (message: string) => void; // drill-down: открывает чат с разбивкой шага
}

export function Timeline({ steps, onExecuteStep, onDrillDown }: Props) {
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  const toggleDone = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDoneSteps((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">📅 План выполнения</h3>
        {doneSteps.size > 0 && (
          <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">
            {doneSteps.size}/{steps.length} выполнено
          </span>
        )}
      </div>
      <div className="relative">
        {/* Вертикальная линия прогресса */}
        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-transparent opacity-30" />

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isDone = doneSteps.has(step.day);
            return (
              <div key={index} className="relative flex items-start gap-4 group">
                {/* Индикатор шага */}
                <div className="relative z-10">
                  <div
                    className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center
                                transition-all duration-300 cursor-pointer border
                                ${isDone
                                  ? 'bg-green-500/20 border-green-500/50 group-hover:border-green-400'
                                  : 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/30 group-hover:border-cyan-400 group-hover:shadow-lg group-hover:shadow-cyan-500/20'
                                }`}
                    onClick={(e) => toggleDone(step.day, e)}
                    title={isDone ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                  >
                    {isDone ? (
                      <>
                        <span className="text-xl">✓</span>
                        <span className="text-xs text-green-400">Готово</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">День</span>
                        <span className="text-xl font-bold text-cyan-400">{step.day}</span>
                      </>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50" />
                  )}
                </div>

                {/* Контент шага */}
                <div className="flex-1 pt-2">
                  <div
                    onClick={() => {
                      if (!isDone && onDrillDown) {
                        onDrillDown(`Разбери для меня задачу «${step.task}» на конкретные подшаги. Я новичок и не очень понимаю что именно нужно делать. Объясни с нуля: что именно нужно сделать, с чего начать, что нужно для этого иметь?`);
                      }
                    }}
                    className={`border rounded-xl p-3 transition-all duration-300
                                ${isDone
                                  ? 'bg-green-500/5 border-green-500/20 opacity-60'
                                  : 'bg-white/5 border-white/10 group-hover:bg-white/10 group-hover:border-cyan-500/30 cursor-pointer'
                                }`}
                  >
                    <p className={`font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-100'}`}>
                      {step.task}
                    </p>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <span>⏱</span>
                        {step.duration}
                      </p>
                      {!isDone && (onDrillDown || onExecuteStep) && (
                        <span className="text-xs text-cyan-500/70 italic">
                          нажми чтобы разобрать →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

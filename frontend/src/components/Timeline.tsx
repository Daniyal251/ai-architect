import type { ImplementationStep } from '../types.js';

interface Props {
  steps: ImplementationStep[];
}

export function Timeline({ steps }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">План внедрения</h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 
                            border border-cyan-500/30 rounded-xl flex flex-col items-center justify-center">
              <span className="text-xs text-gray-400">День</span>
              <span className="text-xl font-bold text-cyan-400">{step.day}</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">{step.task}</p>
              <p className="text-sm text-gray-400">⏱ {step.duration}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

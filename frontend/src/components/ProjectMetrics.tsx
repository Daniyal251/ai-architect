import type { ProjectMetrics as ProjectMetricsType } from '../types.js';

interface Props {
  metrics: ProjectMetricsType;
  onHelpWithStep?: (step: string) => void;
}

const PROJECT_TYPE_ICONS: Record<string, string> = {
  technical: '🔧',
  business: '📊',
  research: '🔬',
  other: '📋',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  technical: 'Технический проект',
  business: 'Бизнес-автоматизация',
  research: 'Исследование',
  other: 'Проект',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Материалы': '📦',
  'Запчасти': '⚙️',
  'Инструменты': '🔨',
  'ПО': '💻',
  'Инструменты/ПО': '🛠️',
  'Материалы/Запчасти': '🧩',
  'Специалисты': '👷',
  'Специалисты/Услуги': '🤝',
  'Интеграции': '🔗',
  'Ресурсы': '📚',
};

function getCategoryIcon(category: string): string {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '📌';
}

export function ProjectMetrics({ metrics, onHelpWithStep }: Props) {
  const typeIcon = PROJECT_TYPE_ICONS[metrics.project_type] || '📋';
  const typeLabel = PROJECT_TYPE_LABELS[metrics.project_type] || 'Проект';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{typeIcon}</span>
        <div>
          <h3 className="text-xl font-semibold">Что вам нужно</h3>
          <p className="text-xs text-gray-400">{typeLabel}</p>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics.key_metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {metrics.key_metrics.map((metric, idx) => (
            <div
              key={idx}
              onClick={() => onHelpWithStep && onHelpWithStep(
                `Объясни мне детально: «${metric.label}: ${metric.value} ${metric.unit}» — из чего это складывается? Я новичок, расскажи понятно с примерами. Как можно снизить эту цифру?`
              )}
              className={`rounded-xl p-4 text-center transition-all duration-200 ${
                onHelpWithStep ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''
              } ${
                idx % 2 === 0
                  ? 'bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60'
                  : 'bg-purple-500/10 border border-purple-500/30 hover:border-purple-400/60'
              }`}
              title={onHelpWithStep ? `Нажми чтобы узнать из чего складывается «${metric.label}»` : undefined}
            >
              <p className={`text-2xl font-bold ${idx % 2 === 0 ? 'text-cyan-400' : 'text-purple-400'}`}>
                {metric.value}
              </p>
              <p className={`text-xs mt-1 ${idx % 2 === 0 ? 'text-cyan-300/70' : 'text-purple-300/70'}`}>
                {metric.unit}
              </p>
              <p className="text-xs text-gray-400 mt-1">{metric.label}</p>
              {onHelpWithStep && (
                <p className="text-xs text-gray-600 mt-1 italic">нажми →</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resources Needed */}
      {metrics.resources_needed.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Что понадобится:</p>
          {metrics.resources_needed.map((group, idx) => (
            <div key={idx} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{getCategoryIcon(group.category)}</span>
                <span className="text-sm font-medium text-gray-200">{group.category}</span>
                {onHelpWithStep && (
                  <button
                    onClick={() => onHelpWithStep(`Помоги разобраться с разделом "${group.category}": ${group.items.join(', ')}. Где найти, сколько стоит, как выбрать для новичка?`)}
                    className="ml-auto text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400
                               hover:bg-cyan-500/30 rounded-lg transition"
                  >
                    Помочь найти →
                  </button>
                )}
              </div>
              <ul className="space-y-1">
                {group.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    onClick={() => onHelpWithStep && onHelpWithStep(
                      `Объясни мне подробно: «${item}» из раздела «${group.category}» — что это такое, где это взять/найти, сколько стоит, как выбрать? Я новичок.`
                    )}
                    className={`text-sm text-gray-400 flex items-start gap-2 rounded-lg px-2 py-1 -mx-2 transition-all
                                ${onHelpWithStep ? 'cursor-pointer hover:bg-white/10 hover:text-gray-200' : ''}`}
                  >
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{item}</span>
                    {onHelpWithStep && (
                      <span className="ml-auto text-cyan-600/50 text-xs italic flex-shrink-0">→</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

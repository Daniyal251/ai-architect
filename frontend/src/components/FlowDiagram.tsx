import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#06b6d4',
    primaryTextColor: '#fff',
    primaryBorderColor: '#06b6d4',
    lineColor: '#8b5cf6',
    secondaryColor: '#1e1b4b',
    tertiaryColor: '#0f0f1a'
  }
});

interface Props {
  code: string;
}

export function FlowDiagram({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    if (!code) return;

    const renderDiagram = async () => {
      setError(null);
      if (!containerRef.current) return;

      // Очищаем предыдущий рендер
      containerRef.current.innerHTML = '';

      try {
        const id = `mermaid-diagram-${renderCount}`;
        const { svg } = await mermaid.render(id, code);
        containerRef.current!.innerHTML = svg;
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Не удалось отрисовать схему. Проверьте корректность Mermaid-кода.');
      }
    };

    renderDiagram();
  }, [code, renderCount]);

  // Перерисовка при изменении кода
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, [code]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Схема работы агента</h3>
      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <pre className="mt-2 text-xs text-gray-500 whitespace-pre-wrap break-all">{code}</pre>
        </div>
      ) : (
        <div ref={containerRef} className="flex justify-center" />
      )}
    </div>
  );
}

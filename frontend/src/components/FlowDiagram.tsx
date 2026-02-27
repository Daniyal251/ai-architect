import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (containerRef.current && code) {
      mermaid.render('mermaid-diagram', code).then(({ svg }) => {
        containerRef.current!.innerHTML = svg;
      });
    }
  }, [code]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Схема работы агента</h3>
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}

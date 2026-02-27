import { useState } from 'react';

interface Props {
  prompt: string;
  techStack: string[];
}

export function SystemPrompt({ prompt, techStack }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">🧠 Системный промпт (ядро агента)</h3>
        <button
          onClick={copyToClipboard}
          className={`px-4 py-2 rounded-lg transition text-sm font-medium
                      ${copied 
                        ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                        : 'bg-white/10 border border-white/10 text-gray-300 hover:bg-white/20'}`}
        >
          {copied ? '✅ Скопировано!' : '📋 Копировать'}
        </button>
      </div>
      <pre className="bg-black/30 rounded-xl p-4 overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
        {prompt}
      </pre>

      <div className="mt-4">
        <h4 className="font-semibold mb-2">Технологический стек:</h4>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span key={tech} className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30
                                        rounded-full text-sm text-cyan-400">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

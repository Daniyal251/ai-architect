interface LoadingScreenProps {
  stage: string;
}

export function LoadingScreen({ stage }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-purple-500/30 rounded-full"></div>
        <div className="absolute inset-4 border-4 border-t-purple-500 rounded-full animate-spin reverse"></div>
      </div>
      
      <h2 className="text-2xl font-semibold mb-4">Нейросеть работает</h2>
      
      <div className="text-gray-400 text-center space-y-2">
        <p className="animate-pulse">{stage}</p>
      </div>

      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Landing } from './components/Landing';
import { LoadingScreen } from './components/LoadingScreen';
import { Dashboard } from './components/Dashboard';
import { useAgentGenerator } from './hooks/useAgentGenerator';

function App() {
  const { loading, result, loadingStage, generateAgent, reset } = useAgentGenerator();

  const handleSubmit = (idea: string) => {
    generateAgent(idea);
  };

  return (
    <div className="min-h-screen">
      {loading ? (
        <LoadingScreen stage={loadingStage} />
      ) : result ? (
        <Dashboard data={result} onReset={reset} />
      ) : (
        <Landing onSubmit={handleSubmit} loading={loading} />
      )}
    </div>
  );
}

export default App;

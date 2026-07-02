import Navbar from './components/Navbar';
import Home from './components/Home';
import SetView from './components/SetView';
import LearnMode from './components/LearnMode';
import TestWritten from './components/TestWritten';
import TestMCQ from './components/TestMCQ';
import TestMatch from './components/TestMatch';
import CombinedTest from './components/CombinedTest';
import ArgumentBuilder from './components/ArgumentBuilder';
import { useState } from 'react';

export default function App() {
  const [page, setPage] = useState({ type: 'home' });

  const goHome = () => setPage({ type: 'home' });
  const goSet = (id) => setPage({ type: 'set', id });
  const goLearn = (id) => setPage({ type: 'learn', id });
  const goArgumentBuilder = (id) => setPage({ type: 'argument-builder', id });
  const goTest = (id, mode) => setPage({ type: 'test', id, mode });

  const hideNav = page.type === 'test' && page.mode === 'match';

  return (
    <div className="min-h-screen bg-qbg dark:bg-gray-900 transition-colors">
      {!hideNav && <Navbar onHome={goHome} />}

      {page.type === 'home' && <Home onSelectSet={goSet} />}

      {page.type === 'set' && (
        <SetView
          setId={page.id}
          onLearn={goLearn}
          onArgumentBuilder={goArgumentBuilder}
          onTest={goTest}
          onBack={goHome}
        />
      )}

      {page.type === 'learn' && (
        <LearnMode setId={page.id} onBack={() => goSet(page.id)} />
      )}

      {page.type === 'argument-builder' && (
        <ArgumentBuilder
          setId={page.id}
          onBack={() => goSet(page.id)}
          onFlashcards={() => goLearn(page.id)}
        />
      )}

      {page.type === 'test' && page.mode === 'written' && (
        <TestWritten setId={page.id} onBack={() => goSet(page.id)} />
      )}

      {page.type === 'test' && page.mode === 'mcq' && (
        <TestMCQ setId={page.id} onBack={() => goSet(page.id)} />
      )}

      {page.type === 'test' && page.mode === 'match' && (
        <TestMatch setId={page.id} onBack={() => goSet(page.id)} />
      )}

      {page.type === 'test' && page.mode === 'combined' && (
        <CombinedTest setId={page.id} onBack={() => goSet(page.id)} />
      )}
    </div>
  );
}

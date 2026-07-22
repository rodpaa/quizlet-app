import Navbar from './components/Navbar';
import Home from './components/Home';
import SetView from './components/SetView';
import LearnMode from './components/LearnMode';
import TestWritten from './components/TestWritten';
import TestMCQ from './components/TestMCQ';
import TestMatch from './components/TestMatch';
import CombinedTest from './components/CombinedTest';
import PracticeTest from './components/PracticeTest';
import ArgumentBuilder from './components/ArgumentBuilder';
import ComprehensionPractice from './components/ComprehensionPractice';
import AuthModal from './components/AuthModal';
import SetEditor from './components/SetEditor';
import { useSets } from './context/SetsContext';
import { useState } from 'react';

export default function App() {
  const { getSet } = useSets();
  const [page, setPage] = useState({ type: 'home', tab: 'discover' });
  const [authModal, setAuthModal] = useState({ open: false, mode: 'signin' });

  const goHome = (tab = 'discover') => setPage({ type: 'home', tab });
  const goSet = (id) => setPage({ type: 'set', id });
  const goCreate = () => setPage({ type: 'editor' });
  const goEdit = (id) => setPage({ type: 'editor', id });
  const goLearn = (id) => setPage({ type: 'learn', id });
  const goArgumentBuilder = (id) => setPage({ type: 'argument-builder', id });
  const goComprehension = (id) => setPage({ type: 'comprehension', id });
  const goTest = (id, mode) => setPage({ type: 'test', id, mode });

  const hideNav = page.type === 'test' && page.mode === 'match';

  return (
    <div className="min-h-screen bg-qbg dark:bg-gray-900 transition-colors">
      {!hideNav && (
        <Navbar
          onHome={goHome}
          onCreate={goCreate}
          onRequestAuth={(mode) => setAuthModal({ open: true, mode })}
        />
      )}

      {page.type === 'home' && (
        <Home
          key={page.tab}
          initialTab={page.tab}
          onSelectSet={goSet}
          onCreate={goCreate}
          onEdit={goEdit}
          onRequestAuth={(mode) => setAuthModal({ open: true, mode })}
        />
      )}

      {page.type === 'editor' && (
        <SetEditor
          initialSet={page.id ? getSet(page.id) : null}
          onCancel={() => page.id ? goSet(page.id) : goHome('mine')}
          onSaved={goSet}
        />
      )}

      {page.type === 'set' && (
        <SetView
          setId={page.id}
          onLearn={goLearn}
          onArgumentBuilder={goArgumentBuilder}
          onComprehension={goComprehension}
          onTest={goTest}
          onBack={goHome}
          onEdit={goEdit}
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

      {page.type === 'comprehension' && (
        <ComprehensionPractice
          setId={page.id}
          onBack={() => goSet(page.id)}
          onArgumentBuilder={() => goArgumentBuilder(page.id)}
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
        <TestMatch setId={page.id} onBack={() => goSet(page.id)} onHome={goHome} />
      )}

      {page.type === 'test' && page.mode === 'combined' && (
        <CombinedTest setId={page.id} onBack={() => goSet(page.id)} />
      )}

      {page.type === 'test' && page.mode === 'practice' && (
        <PracticeTest setId={page.id} onBack={() => goSet(page.id)} />
      )}

      {authModal.open && (
        <AuthModal
          open
          initialMode={authModal.mode}
          onClose={() => setAuthModal((current) => ({ ...current, open: false }))}
        />
      )}
    </div>
  );
}

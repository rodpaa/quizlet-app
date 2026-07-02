import { useState, useEffect, useCallback } from 'react';
import { getSet } from '../data/sets';
import { playFlip, playCorrect, playWrong, playCelebration } from '../utils/sound';

function buildStudyCards(set) {
  return [...set.cards].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)));
}

export default function LearnMode({ setId, onBack }) {
  const set = getSet(setId);
  const [cards, setCards] = useState(() => buildStudyCards(set));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const total = set.cards.length;
  const current = cards[index];
  const progress = (known.length / total) * 100;

  const handleFlip = useCallback(() => {
    playFlip();
    setFlipped(f => !f);
  }, []);

  const next = useCallback((wasKnown) => {
    if (wasKnown) {
      playCorrect();
      setKnown(k => [...k, current.id]);
      setStreak(s => s + 1);
    } else {
      playWrong();
      setUnknown(u => [...u, current.id]);
      setStreak(0);
    }
    setFlipped(false);
    setAnimKey(k => k + 1);
    setTimeout(() => {
      if (index + 1 >= cards.length) {
        const leftover = set.cards.filter(c => !known.includes(c.id) && !(wasKnown && c.id === current.id));
        if (leftover.length === 0) {
          playCelebration();
          setDone(true);
        } else {
          setCards(leftover.sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority))));
          setIndex(0);
        }
      } else {
        setIndex(i => i + 1);
      }
    }, 50);
  }, [cards.length, current, index, known, set.cards]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ') { e.preventDefault(); handleFlip(); }
      if (e.key === 'ArrowRight' && flipped) next(true);
      if (e.key === 'ArrowLeft' && flipped) next(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, handleFlip, next]);

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-8xl mb-6 animate-bounce-in">🎉</div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">You studied all {total} terms!</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">Great work. Keep it up!</p>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-qgreen">{known.length}</div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">Know it</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-qred">{unknown.length}</div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">Still learning</div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl font-black text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
            Back to Set
          </button>
          <button onClick={() => { setCards(buildStudyCards(set)); setIndex(0); setFlipped(false); setKnown([]); setUnknown([]); setDone(false); setStreak(0); }}
            className="flex-1 py-3 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors">
            Study Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold hover:text-qblue transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          {set.title}
        </button>
        <div className="flex items-center gap-3">
          {streak >= 3 && <span className="text-sm font-black text-orange-500 animate-pop">🔥 {streak} streak!</span>}
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{index + 1} / {cards.length}</span>
        </div>
      </div>

      <div className="progress-bar mb-8">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card-scene h-64 sm:h-80 mb-6 cursor-pointer" onClick={handleFlip} key={animKey}>
        <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
          <div className="card-face front bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 shadow-lg">
            <div className="p-8 text-center w-full">
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Term</div>
              {current.priority && (
                <div className="inline-block text-xs font-black text-qorange bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md mb-3">Priority review</div>
              )}
              <div className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{current.term}</div>
              <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 font-medium">Click to reveal</div>
            </div>
          </div>
          <div className="card-face back bg-qblue">
            <div className="p-8 text-center w-full">
              <div className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">Definition</div>
              <div className="text-xl font-bold text-white leading-relaxed">{current.definition}</div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium mb-6">
        <kbd className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 font-mono text-xs">Space</kbd> flip ·
        <kbd className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 font-mono text-xs ml-1">←</kbd> Still learning ·
        <kbd className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 font-mono text-xs ml-1">→</kbd> Got it
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => next(false)}
          className="py-4 rounded-xl font-black text-qred border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Still learning
        </button>
        <button onClick={() => next(true)}
          className="py-4 rounded-xl font-black text-qgreen border-2 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Got it!
        </button>
      </div>

      <div className="flex justify-between mt-6 px-2">
        <span className="text-sm font-bold text-qred">{unknown.length} still learning</span>
        <span className="text-sm font-bold text-qgreen">{known.length} know</span>
      </div>
    </div>
  );
}

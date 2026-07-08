import { useState, useEffect, useRef } from 'react';
import { useSets } from '../context/SetsContext';
import { playWrong, playMatchComplete, playCelebration } from '../utils/sound';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Monotone: all tiles same neutral style — NO color pairing hints
const TILE_BASE = 'bg-slate-500 hover:bg-slate-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-white';
const TILE_SELECTED = 'bg-qblue dark:bg-qblue hover:bg-qblue2 text-white';
const TILE_WRONG = 'bg-red-700 dark:bg-red-700 text-white animate-shake';

export default function TestMatch({ setId, onBack, initialCards, onComplete }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const gameCards = (initialCards || set.cards).slice(0, 6);

  const [tiles] = useState(() => {
    const terms = gameCards.map(c => ({ id: `t-${c.id}`, cardId: c.id, text: c.term, type: 'term' }));
    const defs  = gameCards.map(c => ({ id: `d-${c.id}`, cardId: c.id, text: c.definition, type: 'def' }));
    return shuffle([...terms, ...defs]);
  });

  const [matched, setMatched] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [wrongPair, setWrongPair] = useState(null);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleTile = (tile) => {
    if (matched.has(tile.cardId) || wrongPair) return;
    if (selected?.id === tile.id) { setSelected(null); return; }

    if (!selected) { setSelected(tile); return; }

    if (selected.cardId === tile.cardId && selected.type !== tile.type) {
      playMatchComplete();
      const newMatched = new Set([...matched, tile.cardId]);
      setMatched(newMatched);
      setSelected(null);
      if (newMatched.size === gameCards.length) {
        setRunning(false);
        clearInterval(timerRef.current);
        setTimeout(() => {
          playCelebration();
          setDone(true);
          onComplete && onComplete();
        }, 400);
      }
    } else {
      playWrong();
      setWrongPair([selected.id, tile.id]);
      setMistakes(m => m + 1);
      setTimeout(() => { setWrongPair(null); setSelected(null); }, 700);
    }
  };

  const tileClass = (tile) => {
    if (matched.has(tile.cardId)) return 'opacity-0 pointer-events-none';
    if (wrongPair?.includes(tile.id)) return TILE_WRONG;
    if (selected?.id === tile.id) return TILE_SELECTED;
    return TILE_BASE;
  };

  if (done && !onComplete) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center animate-bounce-in">
          <div className="text-7xl mb-4">🎉</div>
          <div className="text-5xl mb-4">{mistakes === 0 ? '⭐⭐⭐' : mistakes <= 2 ? '⭐⭐' : '⭐'}</div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Match Complete!</h1>
          <p className="text-gray-600 dark:text-blue-300 font-semibold mb-8">Time: {fmt(time)} · {mistakes} mistake{mistakes !== 1 ? 's' : ''}</p>
          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 py-3 px-6 rounded-xl font-black text-gray-700 dark:text-white border-2 border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Back to Set</button>
            <button onClick={() => window.location.reload()} className="flex-1 py-3 px-6 rounded-xl font-black text-gray-900 bg-qyellow hover:bg-yellow-300 transition-colors">Play Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          {!onComplete ? (
            <button onClick={onBack} className="flex items-center gap-1 text-gray-500 dark:text-blue-300 font-semibold hover:text-qblue dark:hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              {set.title}
            </button>
          ) : (
            <div className="text-sm font-black text-qyellow uppercase tracking-wide">Section 1 · Match</div>
          )}
          <div className="flex items-center gap-4">
            <span className="text-qyellow font-black text-xl font-mono">{fmt(time)}</span>
            <span className="text-gray-500 dark:text-blue-400 font-semibold text-sm">{matched.size}/{gameCards.length} matched</span>
          </div>
        </div>

        <p className="text-center text-gray-500 dark:text-blue-300 font-semibold mb-8">Click a term, then its matching author</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tiles.map(tile => (
            <button
              key={tile.id}
              onClick={() => handleTile(tile)}
              className={`match-tile p-4 rounded-xl font-bold text-sm leading-tight min-h-[80px] flex items-center justify-center text-center transition-all ${tileClass(tile)}`}
            >
              {tile.text}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {gameCards.map(card => (
            <div key={card.id} className={`w-3 h-3 rounded-full transition-all ${matched.has(card.id) ? 'bg-qgreen scale-110' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

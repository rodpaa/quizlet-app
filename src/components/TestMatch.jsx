import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, Home, RotateCcw } from 'lucide-react';
import { useSets } from '../context/SetsContext';
import { playWrong, playMatchComplete, playCelebration } from '../utils/sound';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function buildTiles(cards, seed = 0) {
  void seed;
  const terms = cards.map(c => ({ id: `t-${c.id}`, cardId: c.id, text: c.term, type: 'term' }));
  const defs = cards.map(c => ({ id: `d-${c.id}`, cardId: c.id, text: c.definition, type: 'def' }));
  return shuffle([...terms, ...defs]);
}

// Monotone: all tiles same neutral style — NO color pairing hints
const TILE_BASE = 'bg-slate-500 hover:bg-slate-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-white';
const TILE_SELECTED = 'bg-qblue dark:bg-qblue hover:bg-qblue2 text-white';
const TILE_WRONG = 'bg-red-700 dark:bg-red-700 text-white animate-shake';
const ROUND_SIZE = 6;

export default function TestMatch({ setId, onBack, onHome, initialCards, onComplete }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const chunkedMode = !initialCards;
  const allCards = useMemo(() => {
    if (initialCards || !set.matchOrder?.length) return initialCards || set.cards;
    const order = new Map(set.matchOrder.map((cardId, index) => [cardId, index]));
    return [...set.cards].sort((a, b) =>
      (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [initialCards, set.cards, set.matchOrder]);
  const roundSize = chunkedMode ? set.matchRoundSize || ROUND_SIZE : allCards.length;
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundSeed, setRoundSeed] = useState(0);
  const totalRounds = chunkedMode ? Math.ceil(allCards.length / roundSize) : 1;
  const gameCards = useMemo(() => {
    if (!chunkedMode) return allCards;
    const start = roundIndex * roundSize;
    return allCards.slice(start, start + roundSize);
  }, [allCards, chunkedMode, roundIndex, roundSize]);
  const roundStart = chunkedMode ? roundIndex * roundSize + 1 : 1;
  const roundEnd = chunkedMode ? Math.min((roundIndex + 1) * roundSize, allCards.length) : gameCards.length;
  const hasMoreRounds = chunkedMode && roundIndex < totalRounds - 1;

  const tiles = useMemo(() => buildTiles(gameCards, roundSeed), [gameCards, roundSeed]);

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

  const resetRoundState = () => {
    setMatched(new Set());
    setSelected(null);
    setWrongPair(null);
    setDone(false);
    setRunning(true);
    setRoundSeed(seed => seed + 1);
  };

  const goNextRound = () => {
    if (!hasMoreRounds) return;
    setRoundIndex(index => index + 1);
    resetRoundState();
  };

  const restartAll = () => {
    setTime(0);
    setMistakes(0);
    setRoundIndex(0);
    resetRoundState();
  };

  const returnHome = () => {
    if (onHome) onHome();
    else onBack();
  };

  if (done && !onComplete) {
    const title = hasMoreRounds ? 'Round Complete!' : 'All Vocab Complete!';
    const detail = hasMoreRounds
      ? `Matched terms ${roundStart}-${roundEnd} of ${allCards.length}.`
      : `Matched all ${allCards.length} terms.`;

    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center animate-bounce-in">
          <div className="text-7xl mb-4">🎉</div>
          <div className="text-5xl mb-4">{mistakes === 0 ? '⭐⭐⭐' : mistakes <= 2 ? '⭐⭐' : '⭐'}</div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">{title}</h1>
          <p className="text-gray-600 dark:text-blue-300 font-semibold mb-2">{detail}</p>
          <p className="text-gray-600 dark:text-blue-300 font-semibold mb-8">Time: {fmt(time)} · {mistakes} mistake{mistakes !== 1 ? 's' : ''}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={returnHome} className="secondary-button flex-1 justify-center">
              <Home size={18} />
              Return Home
            </button>
            {hasMoreRounds ? (
              <button onClick={goNextRound} className="primary-button flex-1 justify-center bg-qyellow text-gray-900 hover:bg-yellow-300">
                Next Set
                <ArrowRight size={18} />
              </button>
            ) : (
              <button onClick={restartAll} className="primary-button flex-1 justify-center bg-qyellow text-gray-900 hover:bg-yellow-300">
                <RotateCcw size={18} />
                Play Again
              </button>
            )}
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
              <ArrowLeft size={17} strokeWidth={2.5} />
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

        {chunkedMode && totalRounds > 1 && (
          <div className="text-center text-sm font-black text-qpurple dark:text-purple-300 mb-3">
            Round {roundIndex + 1} of {totalRounds} · Terms {roundStart}-{roundEnd} of {allCards.length}
          </div>
        )}

        <p className="text-center text-gray-500 dark:text-blue-300 font-semibold mb-8">Click a term, then its matching definition</p>

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

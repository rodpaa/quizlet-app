import { useState, useRef, useEffect } from 'react';
import { useSets } from '../context/SetsContext';
import { playCorrect, playWrong, playCelebration } from '../utils/sound';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.,!?¿¡"«»]/g, '');
}

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function isCorrect(userAnswer, correctAnswer) {
  const u = normalize(userAnswer);
  const c = normalize(correctAnswer);
  if (u === c) return true;
  if (stripAccents(u) === stripAccents(c)) return true;
  const cWords = c.split(' ');
  const uWords = u.split(' ');
  if (uWords.length > 0 && uWords.length < cWords.length) {
    for (let i = 0; i <= cWords.length - uWords.length; i++) {
      const slice = cWords.slice(i, i + uWords.length).join(' ');
      if (slice === u || stripAccents(slice) === stripAccents(u)) return true;
    }
  }
  return false;
}

export default function TestWritten({ setId, onBack, initialCards, onComplete }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const pool = initialCards || set.cards;
  const [questions] = useState(() => shuffle(pool));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [results, setResults] = useState([]); // { card, userAnswer, correct }
  const [shakeKey, setShakeKey] = useState(0);
  const [done, setDone] = useState(false);
  const [retryWrong, setRetryWrong] = useState(false);
  const inputRef = useRef(null);

  const current = questions[index];

  // Refs for stale-closure-free global handler
  const answerRef = useRef(answer);
  const currentRef = useRef(current);
  const resultRef = useRef(result);
  const submitTimeRef = useRef(0);
  useEffect(() => { answerRef.current = answer; }, [answer]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { resultRef.current = result; }, [result]);

  const submit = () => {
    const ans = answerRef.current;
    if (!ans.trim()) return;
    submitTimeRef.current = Date.now();
    const card = currentRef.current;
    const correct = isCorrect(ans, card.definition);
    setResults(prev => [...prev, { card, userAnswer: ans, correct }]);
    if (correct) {
      playCorrect();
      setResult('correct');
    } else {
      playWrong();
      setShakeKey(k => k + 1);
      setResult('wrong');
    }
  };

  const next = () => {
    setAnswer('');
    setResult(null);
    if (index + 1 >= questions.length) {
      playCelebration();
      setDone(true);
      if (onComplete) {
        onComplete([...results]); // pass results array up
      }
    } else {
      setIndex(i => i + 1);
    }
  };

  const submitRef = useRef(submit);
  const nextRef = useRef(next);
  useEffect(() => { submitRef.current = submit; });
  useEffect(() => { nextRef.current = next; });

  useEffect(() => {
    if (!done && result === null) inputRef.current?.focus();
  }, [index, result, done]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      if (resultRef.current === null) {
        submitRef.current();
      } else if (Date.now() - submitTimeRef.current > 50) {
        nextRef.current();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Results screen ──────────────────────────────────────────────
  if (done && !retryWrong) {
    const correct = results.filter(r => r.correct);
    const wrong = results.filter(r => !r.correct);
    const pct = Math.round((correct.length / results.length) * 100);

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Score header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-bounce-in">
            {pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">Test Complete!</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">You scored {pct}%</p>
        </div>

        {/* Score bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex justify-between mb-3">
            <span className="font-black text-qgreen text-lg">✓ {correct.length} correct</span>
            <span className="font-black text-qred text-lg">✗ {wrong.length} incorrect</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Wrong answers */}
        {wrong.length > 0 && (
          <div className="mb-6">
            <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3 flex items-center gap-2">
              <span className="text-qred">✗</span> Still learning ({wrong.length})
            </h2>
            <div className="space-y-2">
              {wrong.map(({ card, userAnswer }) => (
                <div key={card.id} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl p-4">
                  <div className="font-black text-gray-900 dark:text-white mb-2">{card.term}</div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Your answer</span>
                      <div className="text-qred font-semibold mt-0.5">{userAnswer}</div>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Correct</span>
                      <div className="text-qgreen font-semibold mt-0.5">{card.definition}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correct answers */}
        {correct.length > 0 && (
          <div className="mb-8">
            <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3 flex items-center gap-2">
              <span className="text-qgreen">✓</span> Got it ({correct.length})
            </h2>
            <div className="space-y-2">
              {correct.map(({ card, userAnswer }) => (
                <div key={card.id} className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-black text-gray-900">{card.term}</div>
                    <div className="text-sm text-qgreen font-semibold mt-0.5">{userAnswer}</div>
                  </div>
                  <span className="text-green-500 text-xl">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sticky bottom-4">
          {wrong.length > 0 && (
            <button
              onClick={() => setRetryWrong(true)}
              className="w-full py-4 rounded-xl font-black text-white bg-qred hover:bg-red-700 transition-colors text-base flex items-center justify-center gap-2"
            >
              <span>🔁</span> Study {wrong.length} wrong answer{wrong.length !== 1 ? 's' : ''} again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors"
          >
            Restart full test
          </button>
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-xl font-black text-gray-700 border-2 border-gray-200 hover:border-gray-300 transition-colors"
          >
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  // ── Retry only wrong cards ──────────────────────────────────────
  if (retryWrong) {
    const wrongCards = results.filter(r => !r.correct).map(r => r.card);
    return (
      <TestWritten
        setId={setId}
        onBack={onBack}
        initialCards={wrongCards}
      />
    );
  }

  // ── Active test ─────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 font-semibold hover:text-qblue transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Written Test {initialCards ? '· Wrong answers' : ''}
        </button>
        <span className="text-sm font-bold text-gray-500">{index + 1} / {questions.length}</span>
      </div>

      <div className="progress-bar mb-8">
        <div className="progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-6 shadow-sm animate-slide-up">
        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          {initialCards ? '🔁 Wrong answer — try again:' : 'Define this term:'}
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{current.term}</div>
      </div>

      <div key={shakeKey} className={`mb-4 ${result === 'wrong' ? 'animate-shake' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          disabled={result !== null}
          placeholder="Type your answer..."
          className={`w-full p-4 rounded-xl border-2 text-lg font-semibold transition-all
            ${result === 'correct' ? 'border-qgreen bg-green-50 text-qgreen' :
              result === 'wrong'   ? 'border-qred bg-red-50 text-qred' :
              'border-gray-200 dark:border-gray-600 focus:border-qblue bg-white dark:bg-gray-800 dark:text-white'}`}
        />
      </div>

      {result === 'correct' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 animate-bounce-in flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <div className="font-black text-qgreen">Correct!</div>
            <div className="text-sm text-green-700">{current.definition}</div>
          </div>
          <div className="text-xs text-green-600 font-semibold opacity-60">Enter →</div>
        </div>
      )}
      {result === 'wrong' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 animate-bounce-in flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div className="flex-1">
            <div className="font-black text-qred">Not quite!</div>
            <div className="text-sm text-red-700">Correct: <strong>{current.definition}</strong></div>
          </div>
          <div className="text-xs text-red-500 font-semibold opacity-60">Enter →</div>
        </div>
      )}

      {result === null ? (
        <button onClick={submit} className="w-full py-4 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors text-lg">
          Check Answer
        </button>
      ) : (
        <button onClick={next} className="w-full py-4 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors text-lg">
          {index + 1 >= questions.length ? 'See Results' : 'Next Question →'}
        </button>
      )}

      <div className="flex justify-between mt-5 px-1">
        <span className="text-sm font-bold text-qgreen">✓ {results.filter(r => r.correct).length} correct</span>
        <span className="text-sm font-bold text-qred">✗ {results.filter(r => !r.correct).length} incorrect</span>
      </div>
    </div>
  );
}

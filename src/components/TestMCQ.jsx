import { useState } from 'react';
import { useSets } from '../context/SetsContext';
import { playCorrect, playWrong, playCelebration } from '../utils/sound';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function getAuthoredDistractors(card, set) {
  if (card.practiceDistractors?.length) return card.practiceDistractors;
  const definitionQuestion = (set.practiceQuestions || []).find(question =>
    question.section === 'definition' && question.prompt.startsWith(`${card.term} =`)
  );
  return definitionQuestion?.distractors || [];
}

function buildQuestions(cards, allCards, set, useAuthoredDistractors) {
  const pool = allCards.length >= 4 ? allCards : cards;
  return shuffle(cards).map(card => {
    const authored = useAuthoredDistractors ? getAuthoredDistractors(card, set) : [];
    if (authored.length >= 3) {
      const wrong = shuffle(authored).slice(0, 3).map((definition, index) => ({
        id: `distractor-${card.id}-${index}`,
        definition,
      }));
      return { card, options: shuffle([card, ...wrong]) };
    }
    const wrong = shuffle(pool.filter(c => c.id !== card.id)).slice(0, 3);
    const options = shuffle([card, ...wrong]);
    return { card, options };
  });
}

const CHECKPOINT_PORTION = 0.15;
const optionLabels = ['A', 'B', 'C', 'D'];

function checkpointSizeFor(total) {
  return Math.max(1, Math.ceil(total * CHECKPOINT_PORTION));
}

export default function TestMCQ({ setId, onBack, initialCards, onComplete }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const pool = set.cards; // full set for distractors
  const cards = initialCards || set.cards;
  const useAuthoredDistractors = !onComplete && set.practiceVersionMode === 'full-bank';
  const [questions] = useState(() => buildQuestions(cards, pool, set, useAuthoredDistractors));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [retryWrong, setRetryWrong] = useState(false);
  const [checkpointPause, setCheckpointPause] = useState(null);
  const isRetry = Boolean(initialCards) && !onComplete;
  const useCheckpoints = !initialCards && !onComplete && questions.length > 1;
  const checkpointSize = useCheckpoints ? checkpointSizeFor(questions.length) : questions.length || 1;
  const totalCheckpoints = Math.ceil(questions.length / checkpointSize);
  const currentCheckpointStartIndex = Math.floor(index / checkpointSize) * checkpointSize;
  const currentCheckpointEndIndex = Math.min(currentCheckpointStartIndex + checkpointSize, questions.length);
  const currentCheckpointNumber = Math.floor(index / checkpointSize) + 1;
  const currentCheckpointLength = currentCheckpointEndIndex - currentCheckpointStartIndex;
  const checkpointQuestionNumber = index - currentCheckpointStartIndex + 1;
  const answeredProgress = selected === null ? checkpointQuestionNumber - 1 : checkpointQuestionNumber;
  const progressTotal = useCheckpoints ? currentCheckpointLength : questions.length;
  const progressDone = useCheckpoints ? answeredProgress : index + (selected === null ? 0 : 1);
  const progressPct = progressTotal > 0 ? Math.min(100, (progressDone / progressTotal) * 100) : 0;

  const current = questions[index];

  const pick = (option) => {
    if (selected !== null) return;
    setSelected(option.id);
    const correct = option.id === current.card.id;
    setResults(r => [...r, { card: current.card, correct, chosen: option.definition }]);
    if (correct) playCorrect(); else playWrong();
  };

  const next = () => {
    const answeredCount = index + 1;
    const isCheckpointBoundary = useCheckpoints && answeredCount < questions.length && answeredCount === currentCheckpointEndIndex;

    setSelected(null);
    if (answeredCount >= questions.length) {
      playCelebration();
      setDone(true);
      onComplete && onComplete(results.filter(r => r.correct).length, questions.length);
    } else if (isCheckpointBoundary) {
      setCheckpointPause({
        number: currentCheckpointNumber,
        startIndex: currentCheckpointStartIndex,
        endIndex: answeredCount,
      });
    } else {
      setIndex(i => i + 1);
    }
  };

  const continueCheckpoint = () => {
    setCheckpointPause(null);
    setIndex(i => Math.min(i + 1, questions.length - 1));
  };

  const optionState = (option) => {
    if (selected === null) return 'idle';
    if (option.id === current.card.id) return 'correct';
    if (option.id === selected) return 'wrong';
    return 'dimmed';
  };

  const correctCount = results.filter(r => r.correct).length;

  if (checkpointPause) {
    const checkpointResults = results.slice(checkpointPause.startIndex, checkpointPause.endIndex);
    const checkpointCorrect = checkpointResults.filter(r => r.correct);
    const checkpointWrong = checkpointResults.filter(r => !r.correct);
    const checkpointPct = Math.round((checkpointCorrect.length / checkpointResults.length) * 100);
    const nextStart = checkpointPause.endIndex + 1;
    const nextEnd = Math.min(checkpointPause.endIndex + checkpointSize, questions.length);
    const overallPct = Math.round((correctCount / checkpointPause.endIndex) * 100);

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-sm font-black text-qgreen uppercase tracking-wide mb-2">
            Checkpoint {checkpointPause.number} of {totalCheckpoints}
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">Checkpoint Complete</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Terms {checkpointPause.startIndex + 1}-{checkpointPause.endIndex} of {questions.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex justify-between mb-3">
            <span className="font-black text-qgreen text-lg">✓ {checkpointCorrect.length} correct</span>
            <span className="font-black text-qred text-lg">✗ {checkpointWrong.length} incorrect</span>
          </div>
          <div className="progress-bar mb-3">
            <div className="progress-fill" style={{ width: `${checkpointPct}%` }} />
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-500 dark:text-gray-400">
            <span>This checkpoint: {checkpointPct}%</span>
            <span>Overall so far: {overallPct}%</span>
          </div>
        </div>

        {checkpointWrong.length > 0 && (
          <div className="mb-6">
            <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3 flex items-center gap-2">
              <span className="text-qred">✗</span> Review from this checkpoint
            </h2>
            <div className="space-y-2">
              {checkpointWrong.map(({ card, chosen }) => (
                <div key={card.id} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl p-4">
                  <div className="font-black text-gray-900 dark:text-white mb-2">{card.term}</div>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Your answer</span>
                      <div className="text-qred font-semibold mt-0.5">{chosen}</div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Correct</span>
                      <div className="text-qgreen font-semibold mt-0.5">{card.definition}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sticky bottom-4">
          <button
            onClick={continueCheckpoint}
            className="w-full py-4 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors text-base"
          >
            Continue to checkpoint {checkpointPause.number + 1} · terms {nextStart}-{nextEnd}
          </button>
          <button onClick={onBack} className="w-full py-3.5 rounded-xl font-black text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 transition-colors">
            Finish for now
          </button>
        </div>
      </div>
    );
  }

  if (done && retryWrong) {
    const wrongCards = results.filter(r => !r.correct).map(r => r.card);
    return (
      <TestMCQ
        setId={setId}
        onBack={onBack}
        initialCards={wrongCards}
      />
    );
  }

  if (done && !onComplete) {
    const wrong = results.filter(r => !r.correct);
    const correct = results.filter(r => r.correct);
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-bounce-in">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">Test Complete!</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">You scored {pct}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex justify-between mb-3">
            <span className="font-black text-qgreen text-lg">✓ {correct.length} correct</span>
            <span className="font-black text-qred text-lg">✗ {wrong.length} incorrect</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {wrong.length > 0 && (
          <div className="mb-6">
            <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3 flex items-center gap-2">
              <span className="text-qred">✗</span> Still learning ({wrong.length})
            </h2>
            <div className="space-y-2">
              {wrong.map(({ card, chosen }) => (
                <div key={card.id} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl p-4">
                  <div className="font-black text-gray-900 dark:text-white mb-2">{card.term}</div>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Your answer</span>
                      <div className="text-qred font-semibold mt-0.5">{chosen}</div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Correct</span>
                      <div className="text-qgreen font-semibold mt-0.5">{card.definition}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {correct.length > 0 && (
          <div className="mb-8">
            <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3 flex items-center gap-2">
              <span className="text-qgreen">✓</span> Got it ({correct.length})
            </h2>
            <div className="space-y-2">
              {correct.map(({ card }) => (
                <div key={card.id} className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-black text-gray-900 dark:text-white">{card.term}</div>
                    <div className="text-sm text-qgreen font-semibold mt-0.5">{card.definition}</div>
                  </div>
                  <span className="text-green-500 text-xl">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sticky bottom-4">
          {wrong.length > 0 && (
            <button
              onClick={() => setRetryWrong(true)}
              className="w-full py-4 rounded-xl font-black text-white bg-qred hover:bg-red-700 transition-colors text-base flex items-center justify-center gap-2"
            >
              <span>🔁</span> Test {wrong.length} wrong answer{wrong.length !== 1 ? 's' : ''} again
            </button>
          )}
          <button onClick={onBack} className="w-full py-3.5 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors">
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        {!onComplete ? (
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold hover:text-qblue transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Multiple Choice {isRetry ? '· Wrong answers' : ''}
          </button>
        ) : (
          <div className="text-sm font-black text-qgreen uppercase tracking-wide">Section 2 · Multiple Choice</div>
        )}
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
          {useCheckpoints
            ? `Checkpoint ${currentCheckpointNumber}/${totalCheckpoints} · ${checkpointQuestionNumber}/${currentCheckpointLength}`
            : `${index + 1} / ${questions.length}`}
        </span>
      </div>

      <div className="progress-bar mb-8">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-6 shadow-sm animate-slide-up">
        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          {isRetry ? 'Wrong answer — try again:' : 'Choose the correct definition:'}
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{current.card.term}</div>
      </div>

      <div className="space-y-3 mb-6">
        {current.options.map((option, i) => {
          const state = optionState(option);
          return (
            <button
              key={option.id}
              onClick={() => pick(option)}
              className={`w-full text-left p-4 rounded-xl border-2 font-semibold transition-all flex items-start gap-3
                ${state === 'idle' ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-qblue dark:hover:border-qblue hover:scale-[1.01]' : ''}
                ${state === 'correct' ? 'bg-green-50 dark:bg-green-900/30 border-qgreen scale-[1.01]' : ''}
                ${state === 'wrong' ? 'bg-red-50 dark:bg-red-900/30 border-qred animate-shake' : ''}
                ${state === 'dimmed' ? 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 opacity-40' : ''}
              `}
            >
              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                ${state === 'correct' ? 'bg-qgreen text-white' :
                  state === 'wrong' ? 'bg-qred text-white' :
                  'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400'}
              `}>
                {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : optionLabels[i]}
              </span>
              <span className="leading-relaxed text-gray-900 dark:text-white">{option.definition}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button onClick={next} className="w-full py-4 rounded-xl font-black text-white bg-qblue hover:bg-qblue2 transition-colors text-lg animate-slide-up">
          {index + 1 >= questions.length ? (onComplete ? 'Continue →' : 'See Results') : useCheckpoints && index + 1 === currentCheckpointEndIndex ? 'View Checkpoint →' : 'Next Question →'}
        </button>
      )}

      <div className="flex justify-between mt-5 px-1">
        <span className="text-sm font-bold text-qgreen">✓ {correctCount} correct</span>
        <span className="text-sm font-bold text-qred">✗ {results.filter(r => !r.correct).length} incorrect</span>
      </div>
    </div>
  );
}

import { ArrowLeft, BookOpenCheck, Brain, CheckCircle2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useSets } from '../context/SetsContext';
import { playCelebration, playCorrect, playWrong } from '../utils/sound';

export default function ComprehensionPractice({ setId, onBack, onArgumentBuilder, onFlashcards }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const questions = set?.comprehensionQuestions || [];
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [masteredIds, setMasteredIds] = useState([]);
  const [reviewIds, setReviewIds] = useState([]);
  const [courseLabel, testLabel] = (set?.title || 'Study set').split(':').map(part => part.trim());
  const cardsReadyForPractice = set?.cards?.length > 0 && set.cards.every((card) => !card.pending);

  if (!set || questions.length === 0) return null;

  const current = questions[index];
  const mastered = masteredIds.includes(current.id);
  const needsReview = reviewIds.includes(current.id);
  const progress = (masteredIds.length / questions.length) * 100;

  const goToQuestion = (nextIndex) => {
    setIndex(nextIndex);
    setRevealed(false);
  };

  const nextQuestion = () => goToQuestion((index + 1) % questions.length);
  const previousQuestion = () => goToQuestion((index - 1 + questions.length) % questions.length);

  const markMastered = () => {
    if (mastered) return;
    const nextCount = masteredIds.length + 1;
    setMasteredIds(currentIds => [...currentIds, current.id]);
    setReviewIds(currentIds => currentIds.filter(id => id !== current.id));
    if (nextCount === questions.length) playCelebration();
    else playCorrect();
  };

  const markReview = () => {
    if (!needsReview) setReviewIds(currentIds => [...currentIds, current.id]);
    playWrong();
    nextQuestion();
  };

  const reset = () => {
    setIndex(0);
    setRevealed(false);
    setMasteredIds([]);
    setReviewIds([]);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-qblue transition-colors"
        >
          <ArrowLeft size={16} />
          {courseLabel}
        </button>
        <div className="text-sm font-black text-gray-500 dark:text-gray-400">
          {masteredIds.length} / {questions.length} mastered
        </div>
      </div>

      <header className="border-b border-gray-200 dark:border-gray-700 pb-7 mb-7">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="text-xs font-black uppercase text-qpurple mb-2">
              {courseLabel}{testLabel ? <> &middot; {testLabel}</> : null}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">Comprehension questions</h1>
            <p className="max-w-2xl text-gray-500 dark:text-gray-400 font-semibold">
              Work through the explanation questions separately from the vocab deck.
            </p>
          </div>
          <button
            onClick={reset}
            className="h-10 px-4 self-start md:self-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-black text-gray-600 dark:text-gray-300 hover:border-gray-400 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-6" aria-label="Study mode">
          <button
            aria-pressed="true"
            className="h-11 px-5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black flex items-center gap-2"
          >
            <Brain size={17} />
            Comprehension
          </button>
          {cardsReadyForPractice && (
            <button
              onClick={onFlashcards}
              className="h-11 px-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black hover:border-qblue hover:text-qblue transition-colors flex items-center gap-2"
            >
              <BookOpenCheck size={17} />
              Flashcards
            </button>
          )}
          {set.arguments && (
            <button
              onClick={onArgumentBuilder}
              className="h-11 px-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black hover:border-qorange hover:text-qorange transition-colors"
            >
              Argument Builder
            </button>
          )}
        </div>
      </header>

      <div className="progress-bar mb-7">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <p className="text-sm font-black text-qpurple uppercase mb-2">Question {index + 1}</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
              {current.prompt}
            </h2>
          </div>
          {mastered && (
            <span className="self-start rounded-md bg-green-100 dark:bg-green-900/30 text-qgreen px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Mastered
            </span>
          )}
        </div>

        <div className={`rounded-lg border-2 p-4 sm:p-5 min-h-36 transition-colors ${
          revealed
            ? 'border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
        }`}>
          <div className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-2">
            {revealed ? 'Answer' : 'Answer hidden'}
          </div>
          {revealed ? (
            <p className="text-base sm:text-lg font-semibold leading-relaxed text-gray-800 dark:text-gray-100">
              {current.answer}
            </p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="h-11 px-5 rounded-lg bg-qpurple hover:bg-purple-700 text-white font-black transition-colors"
            >
              Reveal answer
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={markMastered}
            className="h-11 px-5 rounded-lg bg-qgreen hover:bg-green-700 text-white font-black transition-colors disabled:opacity-60"
            disabled={mastered}
          >
            Got it
          </button>
          <button
            onClick={markReview}
            className="h-11 px-5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-qred font-black hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Need review
          </button>
          <div className="flex gap-2 sm:ml-auto">
            <button
              onClick={previousQuestion}
              className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-black hover:border-gray-400 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={nextQuestion}
              className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-black hover:border-gray-400 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-black text-qgreen">{masteredIds.length}</div>
          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">Got it</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-black text-qred">{reviewIds.length}</div>
          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">Need review</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-black text-qpurple">{questions.length - masteredIds.length}</div>
          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">Remaining</div>
        </div>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { useSets } from '../context/SetsContext';
import { playCelebration, playCorrect, playWrong } from '../utils/sound';

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildExercises(argumentsList) {
  return Object.fromEntries(argumentsList.map(argument => [
    argument.id,
    {
      answers: Array(argument.steps.length).fill(''),
      options: shuffle(argument.steps.map(step => step.id)),
      checked: false,
    },
  ]));
}

export default function ArgumentBuilder({ setId, onBack, onFlashcards }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const argumentsList = (set?.arguments || []).filter(argument => argument.builder !== false);
  const [exercises, setExercises] = useState(() => buildExercises(argumentsList));

  if (!set || argumentsList.length === 0) return null;

  const masteredCount = argumentsList.filter(argument => {
    const exercise = exercises[argument.id];
    return exercise.checked && exercise.answers.every((answer, index) => answer === argument.steps[index].id);
  }).length;

  const selectAnswer = (argumentId, stepIndex, stepId) => {
    setExercises(current => ({
      ...current,
      [argumentId]: {
        ...current[argumentId],
        answers: current[argumentId].answers.map((answer, index) => index === stepIndex ? stepId : answer),
        checked: false,
      },
    }));
  };

  const checkArgument = (argument) => {
    const exercise = exercises[argument.id];
    const correctCount = exercise.answers.filter((answer, index) => answer === argument.steps[index].id).length;

    setExercises(current => ({
      ...current,
      [argument.id]: { ...current[argument.id], checked: true },
    }));

    if (correctCount === argument.steps.length) {
      if (masteredCount + 1 === argumentsList.length) playCelebration();
      else playCorrect();
    } else {
      playWrong();
    }
  };

  const resetArgument = (argument) => {
    setExercises(current => ({
      ...current,
      [argument.id]: {
        answers: Array(argument.steps.length).fill(''),
        options: shuffle(argument.steps.map(step => step.id)),
        checked: false,
      },
    }));
  };

  const resetAll = () => setExercises(buildExercises(argumentsList));

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-qblue transition-colors"
        >
          <span aria-hidden="true">&larr;</span>
          PHI 2010
        </button>
        <div className="text-sm font-black text-gray-500 dark:text-gray-400">
          {masteredCount} / {argumentsList.length} mastered
        </div>
      </div>

      <header className="border-b border-gray-200 dark:border-gray-700 pb-7 mb-7">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="text-xs font-black uppercase text-qorange mb-2">PHI 2010 &middot; Test 1</div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">Argument reconstruction</h1>
            <p className="max-w-2xl text-gray-500 dark:text-gray-400 font-semibold">
              Rebuild each argument by choosing the correct statement for every labeled step.
            </p>
          </div>
          <button
            onClick={resetAll}
            className="h-10 px-4 self-start md:self-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-black text-gray-600 dark:text-gray-300 hover:border-gray-400 transition-colors"
          >
            Reset all
          </button>
        </div>

        <div className="flex gap-2 mt-6" aria-label="Study mode">
          <button
            aria-pressed="true"
            className="h-11 px-5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black"
          >
            Argument Builder
          </button>
          <button
            onClick={onFlashcards}
            className="h-11 px-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black hover:border-qblue hover:text-qblue transition-colors"
          >
            Flashcards
          </button>
        </div>
      </header>

      <div className="progress-bar mb-7">
        <div className="progress-fill" style={{ width: `${(masteredCount / argumentsList.length) * 100}%` }} />
      </div>

      <div className="space-y-5">
        {argumentsList.map((argument, argumentIndex) => {
          const exercise = exercises[argument.id];
          const optionById = Object.fromEntries(argument.steps.map(step => [step.id, step]));
          const correctCount = exercise.answers.filter((answer, index) => answer === argument.steps[index].id).length;
          const isMastered = exercise.checked && correctCount === argument.steps.length;

          return (
            <section
              key={argument.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 animate-slide-up"
              style={{ animationDelay: `${argumentIndex * 45}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    {argument.title} <span className="text-qblue">({argument.shortTitle})</span>
                  </h2>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    Source: {argument.source} &middot; {argument.steps.length} steps
                  </p>
                </div>
                {isMastered && (
                  <span className="self-start rounded-md bg-green-100 dark:bg-green-900/30 text-qgreen px-3 py-1.5 text-xs font-black uppercase">
                    Mastered
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {argument.steps.map((step, stepIndex) => {
                  const answer = exercise.answers[stepIndex];
                  const isCorrect = exercise.checked && answer === step.id;
                  const isWrong = exercise.checked && answer !== step.id;

                  return (
                    <div key={step.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_minmax(0,1fr)] gap-2 sm:gap-4 items-center">
                      <label htmlFor={`${argument.id}-${step.id}`} className="font-black text-qblue text-sm sm:text-base">
                        {step.id}
                      </label>
                      <div className="relative min-w-0">
                        <select
                          id={`${argument.id}-${step.id}`}
                          value={answer}
                          onChange={event => selectAnswer(argument.id, stepIndex, event.target.value)}
                          className={`w-full h-12 appearance-none rounded-lg border-2 pl-3 pr-10 text-sm sm:text-base font-bold transition-colors outline-none
                            ${isCorrect
                              ? 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200'
                              : isWrong
                                ? 'border-red-400 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200'
                                : 'border-gray-200 bg-white text-gray-800 focus:border-qblue dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'}`}
                        >
                          <option value="">-- choose the correct step --</option>
                          {exercise.options.map(optionId => (
                            <option key={optionId} value={optionId}>{optionById[optionId].text}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                          {isCorrect ? '\u2713' : isWrong ? '\u00d7' : '\u2304'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => checkArgument(argument)}
                  className="h-11 px-5 rounded-lg bg-qblue hover:bg-qblue2 text-white font-black transition-colors"
                >
                  Check answers
                </button>
                <button
                  onClick={() => resetArgument(argument)}
                  className="h-11 px-5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-black hover:border-gray-400 transition-colors"
                >
                  Reset / reshuffle
                </button>
                <div className="sm:ml-auto min-h-6 text-sm font-black" aria-live="polite">
                  {exercise.checked && (
                    <span className={isMastered ? 'text-qgreen' : 'text-qred'}>
                      {correctCount} / {argument.steps.length} correct
                    </span>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

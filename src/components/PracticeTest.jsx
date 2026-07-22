import { ArrowLeft, BookOpenCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSets } from '../context/SetsContext';
import { playCelebration, playCorrect, playWrong } from '../utils/sound';

const optionLabels = ['A', 'B', 'C', 'D'];

const SECTION_META = {
  argument: {
    label: 'Argument-step recall',
    shortLabel: 'Argument recall',
    color: 'text-qorange',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-900',
  },
  definition: {
    label: 'Definition fill-ins',
    shortLabel: 'Definitions',
    color: 'text-qblue',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-900',
  },
  application: {
    label: 'Concept/application',
    shortLabel: 'Application',
    color: 'text-qteal',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-200 dark:border-cyan-900',
  },
};

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeChoice(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isReadyText(text) {
  return text && !/needs confirmation|answer pending|definition pending/i.test(text);
}

function getBlueprint(set) {
  const isTest2 = /\btest\s*2\b/i.test(set.title);
  return isTest2
    ? { label: 'Test 2 shape', argument: 6, definition: 10, application: 12 }
    : { label: 'Test 1 shape', argument: 10, definition: 10, application: 10 };
}

function buildChoices(correctAnswer, distractorPool) {
  const answers = [];
  const seen = new Set();

  const add = (answer) => {
    const value = String(answer || '').trim();
    const key = normalizeChoice(value);
    if (!value || seen.has(key)) return;
    seen.add(key);
    answers.push(value);
  };

  add(correctAnswer);
  shuffle(distractorPool).forEach(add);

  return shuffle(answers.slice(0, 4)).map((text, index) => ({
    id: `choice-${index}`,
    text,
  }));
}

function selectCards(cards, count, excludedIds = new Set()) {
  const available = cards.filter(card => !excludedIds.has(card.id));
  const priority = shuffle(available.filter(card => card.priority));
  const standard = shuffle(available.filter(card => !card.priority));
  return [...priority, ...standard].slice(0, count);
}

function roleForStep(step, index, total) {
  if (/therefore|conclusion/i.test(step.text) || index === total - 1) return 'conclusion';
  return `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} premise`;
}

function flattenArgumentSteps(set) {
  return (set.arguments || []).flatMap(argument =>
    argument.steps
      .map((step, index) => ({ argument, step, index, total: argument.steps.length }))
      .filter(item => isReadyText(item.step.text))
  );
}

function buildArgumentQuestions(set, count, fallbackAnswers) {
  const steps = flattenArgumentSteps(set);
  const distractorPool = [
    ...steps.map(item => item.step.text),
    ...fallbackAnswers,
  ];

  return shuffle(steps).slice(0, count).map(({ argument, step, index, total }) => {
    const role = roleForStep(step, index, total);
    return {
      id: `arg-${argument.id}-${step.id}`,
      section: 'argument',
      prompt: `What is ${step.id}, the ${role} of ${argument.shortTitle || argument.title}?`,
      answer: step.text,
      points: 1,
      choices: buildChoices(step.text, distractorPool.filter(answer => answer !== step.text)),
    };
  });
}

function buildDefinitionQuestions(cards, count) {
  const selected = selectCards(cards, count);
  const definitions = cards.map(card => card.definition);

  return selected.map(card => ({
    id: `def-${card.id}`,
    section: 'definition',
    prompt: `${card.term} = ______`,
    answer: card.definition,
    points: 2,
    cardId: card.id,
    choices: buildChoices(card.definition, definitions.filter(definition => definition !== card.definition)),
  }));
}

function buildApplicationQuestions(set, count, cards, usedCardIds) {
  const comprehension = shuffle((set.comprehensionQuestions || [])
    .filter(question => isReadyText(question.prompt) && isReadyText(question.answer)));
  const comprehensionAnswers = comprehension.map(question => question.answer);
  const cardAnswers = cards.map(card => card.definition);
  const questions = comprehension.slice(0, count).map(question => ({
    id: `app-${question.id}`,
    section: 'application',
    prompt: question.prompt,
    answer: question.answer,
    points: 2,
    choices: buildChoices(question.answer, [
      ...comprehensionAnswers.filter(answer => answer !== question.answer),
      ...cardAnswers,
    ]),
  }));

  const remaining = count - questions.length;
  if (remaining <= 0) return questions;

  const fallbackCards = selectCards(cards, remaining, usedCardIds);
  return [
    ...questions,
    ...fallbackCards.map(card => ({
      id: `app-card-${card.id}`,
      section: 'application',
      prompt: `A quiz asks you to apply "${card.term}". Which answer best fits the concept?`,
      answer: card.definition,
      points: 2,
      choices: buildChoices(card.definition, cardAnswers.filter(answer => answer !== card.definition)),
    })),
  ];
}

function buildPracticeQuestions(set) {
  const blueprint = getBlueprint(set);
  const cards = (set.cards || []).filter(card => isReadyText(card.definition));
  const cardAnswers = cards.map(card => card.definition);
  const argumentQuestions = buildArgumentQuestions(set, blueprint.argument, cardAnswers);
  const definitionQuestions = buildDefinitionQuestions(cards, blueprint.definition);
  const usedDefinitionIds = new Set(definitionQuestions.map(question => question.cardId));
  const applicationQuestions = buildApplicationQuestions(set, blueprint.application, cards, usedDefinitionIds);

  return {
    blueprint,
    questions: [...argumentQuestions, ...definitionQuestions, ...applicationQuestions]
      .filter(question => question.choices.length > 1)
      .map((question, index) => ({ ...question, number: index + 1 })),
  };
}

function summarizeSections(questions) {
  return ['argument', 'definition', 'application'].map(section => {
    const sectionQuestions = questions.filter(question => question.section === section);
    return {
      section,
      count: sectionQuestions.length,
      points: sectionQuestions.reduce((sum, question) => sum + question.points, 0),
    };
  });
}

function pct(score, total) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export default function PracticeTest({ setId, onBack }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const [manualBuild, setManualBuild] = useState(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [courseLabel, testLabel] = (set?.title || 'Study set').split(':').map(part => part.trim());

  const baseBuild = useMemo(
    () => set ? buildPracticeQuestions(set) : { blueprint: { label: 'Practice test' }, questions: [] },
    [set]
  );
  const { blueprint, questions } = manualBuild?.setId === setId ? manualBuild : baseBuild;
  const sectionSummary = useMemo(() => summarizeSections(questions), [questions]);

  if (!set) return null;

  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const earnedPoints = results.reduce((sum, result) => sum + result.earnedPoints, 0);
  const scorePct = pct(earnedPoints, totalPoints);
  const current = questions[index];
  const answered = selectedAnswer !== null;
  const progress = questions.length > 0 ? ((index + (answered ? 1 : 0)) / questions.length) * 100 : 0;

  const resetAttempt = (startImmediately = false) => {
    setManualBuild({ setId, ...buildPracticeQuestions(set) });
    setStarted(startImmediately);
    setIndex(0);
    setSelectedAnswer(null);
    setResults([]);
    setDone(false);
  };

  const chooseAnswer = (answer) => {
    if (selectedAnswer !== null || !current) return;
    const correct = answer === current.answer;
    setSelectedAnswer(answer);
    setResults(currentResults => [
      ...currentResults,
      {
        question: current,
        selectedAnswer: answer,
        correct,
        earnedPoints: correct ? current.points : 0,
      },
    ]);
    if (correct) playCorrect();
    else playWrong();
  };

  const nextQuestion = () => {
    if (index + 1 >= questions.length) {
      playCelebration();
      setDone(true);
      return;
    }

    setIndex(currentIndex => currentIndex + 1);
    setSelectedAnswer(null);
  };

  if (questions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-qblue transition-colors mb-7"
        >
          <ArrowLeft size={16} />
          Back to set
        </button>
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Practice test unavailable</h1>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">
            This set needs ready definitions, argument steps, or review questions before a practice test can be built.
          </p>
        </section>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-qblue transition-colors mb-7"
        >
          <ArrowLeft size={16} />
          {courseLabel}
        </button>

        <header className="border-b border-gray-200 dark:border-gray-700 pb-7 mb-7">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase text-qteal mb-2">
                {courseLabel}{testLabel ? <> &middot; {testLabel}</> : null}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">Practice test</h1>
              <p className="max-w-2xl text-gray-500 dark:text-gray-400 font-semibold">
                {questions.length} questions · {totalPoints} points · {blueprint.label}
              </p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="h-11 px-5 self-start md:self-auto rounded-lg bg-qteal hover:bg-cyan-700 text-white font-black transition-colors flex items-center gap-2"
            >
              <BookOpenCheck size={17} />
              Start test
            </button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-3 mb-7">
          {sectionSummary.map(({ section, count, points }) => {
            const meta = SECTION_META[section];
            return (
              <section key={section} className={`rounded-lg border ${meta.border} ${meta.bg} p-4`}>
                <div className={`text-sm font-black ${meta.color}`}>{meta.shortLabel}</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">{count}</div>
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">{points} points</div>
              </section>
            );
          })}
        </div>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="font-black text-gray-900 dark:text-white mb-3">Answer record format</h2>
          <div className="grid sm:grid-cols-5 gap-2 text-sm font-black text-gray-500 dark:text-gray-400">
            <span>Question</span>
            <span>Original prompt</span>
            <span>Your answer</span>
            <span>Correct answer</span>
            <span>Points</span>
          </div>
        </section>
      </main>
    );
  }

  if (done) {
    const missed = results.filter(result => !result.correct);

    return (
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <div className="text-center mb-7">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-qteal text-white">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">Practice test complete</h1>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">
            {earnedPoints}/{totalPoints} points · {scorePct}%
          </p>
        </div>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mb-6">
          <div className="flex justify-between mb-3">
            <span className="font-black text-qgreen">{results.length - missed.length} correct</span>
            <span className="font-black text-qred">{missed.length} missed</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${scorePct}%` }} />
          </div>
        </section>

        <section className="mb-7">
          <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3">Answer record</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-black uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Original quiz question</th>
                  <th className="px-4 py-3">Student answer</th>
                  <th className="px-4 py-3">Correct answer</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {results.map(result => (
                  <tr key={result.question.id} className="align-top">
                    <td className="px-4 py-3 font-black text-gray-500 dark:text-gray-400">{result.question.number}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{result.question.prompt}</td>
                    <td className={`px-4 py-3 font-semibold ${result.correct ? 'text-gray-700 dark:text-gray-200' : 'text-qred'}`}>{result.selectedAnswer}</td>
                    <td className="px-4 py-3 font-semibold text-qgreen">{result.question.answer}</td>
                    <td className={`px-4 py-3 font-black ${result.correct ? 'text-qgreen' : 'text-qred'}`}>
                      {result.correct ? 'Correct' : 'Missed'}
                    </td>
                    <td className="px-4 py-3 font-black text-gray-700 dark:text-gray-200">
                      {result.earnedPoints}/{result.question.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {missed.length > 0 && (
          <section className="mb-7">
            <h2 className="font-black text-gray-900 dark:text-white text-lg mb-3">Corrections</h2>
            <div className="space-y-3">
              {missed.map(result => (
                <article key={result.question.id} className="rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="text-xs font-black uppercase text-qred mb-2">Question {result.question.number}</div>
                  <h3 className="font-black text-gray-900 dark:text-white mb-3">{result.question.prompt}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <div className="font-black text-gray-400 dark:text-gray-500 uppercase text-xs">Your answer</div>
                      <p className="font-semibold text-qred mt-1">{result.selectedAnswer}</p>
                    </div>
                    <div>
                      <div className="font-black text-gray-400 dark:text-gray-500 uppercase text-xs">Correct answer</div>
                      <p className="font-semibold text-qgreen mt-1">{result.question.answer}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4">
          <button
            onClick={() => resetAttempt(true)}
            className="h-12 px-5 rounded-lg bg-qteal hover:bg-cyan-700 text-white font-black transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={17} />
            Retake practice test
          </button>
          <button
            onClick={onBack}
            className="h-12 px-5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black hover:border-gray-400 transition-colors"
          >
            Back to set
          </button>
        </div>
      </main>
    );
  }

  const meta = SECTION_META[current.section];

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-qblue transition-colors"
        >
          <ArrowLeft size={16} />
          Practice test
        </button>
        <span className="text-sm font-black text-gray-500 dark:text-gray-400">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="progress-bar mb-7">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 sm:p-7 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className={`inline-flex self-start rounded-md border ${meta.border} ${meta.bg} px-3 py-1.5 text-xs font-black ${meta.color}`}>
            {meta.label}
          </div>
          <div className="text-sm font-black text-gray-500 dark:text-gray-400">{current.points} point{current.points !== 1 ? 's' : ''}</div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black leading-tight text-gray-900 dark:text-white mb-6">
          {current.prompt}
        </h1>

        <div className="space-y-3">
          {current.choices.map((choice, choiceIndex) => {
            const isCorrect = answered && choice.text === current.answer;
            const isWrong = answered && choice.text === selectedAnswer && choice.text !== current.answer;
            const isDimmed = answered && !isCorrect && !isWrong;
            return (
              <button
                key={`${current.id}-${choice.id}`}
                onClick={() => chooseAnswer(choice.text)}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all flex items-start gap-3
                  ${!answered ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 hover:border-qteal hover:scale-[1.01]' : ''}
                  ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-qgreen' : ''}
                  ${isWrong ? 'bg-red-50 dark:bg-red-900/20 border-qred animate-shake' : ''}
                  ${isDimmed ? 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 opacity-50' : ''}
                `}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black
                  ${isCorrect ? 'bg-qgreen text-white' : isWrong ? 'bg-qred text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}
                `}>
                  {optionLabels[choiceIndex]}
                </span>
                <span className="font-semibold leading-relaxed text-gray-900 dark:text-white">{choice.text}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`mt-5 rounded-lg border p-4 ${selectedAnswer === current.answer ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20'}`}>
            <div className={`font-black ${selectedAnswer === current.answer ? 'text-qgreen' : 'text-qred'}`}>
              {selectedAnswer === current.answer ? 'Correct' : 'Missed'}
            </div>
            {selectedAnswer !== current.answer && (
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">
                Correct answer: {current.answer}
              </p>
            )}
          </div>
        )}
      </section>

      {answered && (
        <button
          onClick={nextQuestion}
          className="mt-5 w-full h-12 rounded-lg bg-qteal hover:bg-cyan-700 text-white font-black transition-colors"
        >
          {index + 1 >= questions.length ? 'View score' : 'Next question'}
        </button>
      )}

      <div className="flex justify-between mt-5 px-1 text-sm font-black">
        <span className="text-qgreen">{earnedPoints} points earned</span>
        <span className="text-gray-500 dark:text-gray-400">{totalPoints} possible</span>
      </div>
    </main>
  );
}

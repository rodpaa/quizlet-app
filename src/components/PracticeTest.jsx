import { ArrowLeft, BookOpenCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSets } from '../context/SetsContext';
import { playCelebration, playWrong } from '../utils/sound';

const optionLabels = ['A', 'B', 'C', 'D', 'E'];
const TEST_VERSIONS = ['A', 'B', 'C', 'D'];

const SECTION_META = {
  studyGuide: {
    label: 'Study-guide recall',
    shortLabel: 'Guide questions',
    color: 'text-qpurple',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-900',
  },
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

const SECTION_ORDER = ['studyGuide', 'argument', 'definition', 'application'];

function shuffle(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function hashText(text) {
  return [...String(text)].reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619),
    2166136261
  ) >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
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

function buildChoices(correctAnswer, distractorPool, choiceCount = 4, random = Math.random) {
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
  shuffle(distractorPool, random).forEach(add);

  return shuffle(answers.slice(0, choiceCount), random).map((text, index) => ({
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

function buildExplicitPracticeQuestions(set, version = 'A') {
  const explicit = (set.practiceQuestions || [])
    .filter(question => !question.pending && isReadyText(question.prompt) && isReadyText(question.answer));

  if (explicit.length === 0) return null;

  const explicitAnswers = explicit.map(question => question.answer);
  const testedStepsByArgument = explicit.reduce((stepsByArgument, question) => {
    if (!question.argumentId || !question.stepId) return stepsByArgument;
    const testedSteps = stepsByArgument.get(question.argumentId) || [];
    stepsByArgument.set(question.argumentId, [...testedSteps, question.stepId]);
    return stepsByArgument;
  }, new Map());
  const cardAnswers = (set.cards || [])
    .map(card => card.definition)
    .filter(isReadyText);

  const preparedQuestions = explicit
    .map((question, index) => ({
      id: question.id || `guide-${index + 1}`,
      section: question.section || 'studyGuide',
      prompt: question.prompt,
      answer: question.answer,
      points: question.points || 2,
      argument: question.argumentId
        ? (set.arguments || []).find(argument => argument.id === question.argumentId)
        : null,
      blankStepIds: question.argumentId
        ? testedStepsByArgument.get(question.argumentId) || []
        : [],
      choices: buildChoices(
        question.answer,
        question.distractors?.length
          ? question.distractors
          : [...explicitAnswers.filter(answer => answer !== question.answer), ...cardAnswers],
        question.distractors?.length ? 5 : 4,
        createSeededRandom(hashText(`${set.id}:${version}:${question.id || index}`))
      ),
    }))
    .filter(question => question.choices.length > 1);

  const versionedQuestions = SECTION_ORDER.flatMap(section => {
    const sectionQuestions = preparedQuestions.filter(question => question.section === section);
    if (version === 'A') return sectionQuestions;
    return shuffle(
      sectionQuestions,
      createSeededRandom(hashText(`${set.id}:${version}:${section}:order`))
    );
  });

  return {
    blueprint: { label: set.practiceBlueprintLabel || 'Study-guide question set' },
    questions: versionedQuestions
      .map((question, index) => ({ ...question, number: index + 1 })),
  };
}

function buildPracticeQuestions(set, version = 'A') {
  const explicitBuild = buildExplicitPracticeQuestions(set, version);
  if (explicitBuild) return explicitBuild;

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
  return SECTION_ORDER.map(section => {
    const sectionQuestions = questions.filter(question => question.section === section);
    return {
      section,
      count: sectionQuestions.length,
      points: sectionQuestions.reduce((sum, question) => sum + question.points, 0),
    };
  }).filter(summary => summary.count > 0);
}

function pct(score, total) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function ArgumentQuestionContext({ question }) {
  if (!question.argument) return null;

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/50">
      <h3 className="mb-4 text-center text-base font-black text-gray-900 dark:text-white">
        {question.argument.title}
      </h3>
      <div className="space-y-3 text-sm font-semibold leading-relaxed text-gray-700 dark:text-gray-200 sm:text-base">
        {question.argument.steps.map(step => (
          <p key={step.id} className="flex items-baseline gap-2">
            <span className="shrink-0 font-black">({step.id})</span>
            {question.blankStepIds.includes(step.id)
              ? (
                <span className="h-5 min-w-0 flex-1 border-b-2 border-gray-400 dark:border-gray-500">
                  <span className="sr-only">{step.id} omitted</span>
                </span>
              )
              : <span>{step.text}</span>}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function PracticeTest({ setId, onBack }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const [manualBuild, setManualBuild] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('A');
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [courseLabel, testLabel] = (set?.title || 'Study set').split(':').map(part => part.trim());

  const baseBuild = useMemo(
    () => set ? buildPracticeQuestions(set, selectedVersion) : { blueprint: { label: 'Practice test' }, questions: [] },
    [set, selectedVersion]
  );
  const { blueprint, questions } = manualBuild?.setId === setId && manualBuild?.version === selectedVersion
    ? manualBuild
    : baseBuild;
  const sectionSummary = useMemo(() => summarizeSections(questions), [questions]);

  if (!set) return null;

  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const earnedPoints = results.reduce((sum, result) => sum + result.earnedPoints, 0);
  const scorePct = pct(earnedPoints, totalPoints);
  const answeredCount = questions.filter(question => answers[question.id] !== undefined).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const supportsVersions = Boolean(set.practiceQuestions?.length);

  const resetAttempt = (startImmediately = false) => {
    setManualBuild({ setId, version: selectedVersion, ...buildPracticeQuestions(set, selectedVersion) });
    setStarted(startImmediately);
    setAnswers({});
    setResults([]);
    setDone(false);
  };

  const chooseVersion = (version) => {
    setSelectedVersion(version);
    setManualBuild(null);
    setAnswers({});
    setResults([]);
    setDone(false);
  };

  const returnToVersionPicker = () => {
    setStarted(false);
    setAnswers({});
    setResults([]);
    setDone(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseAnswer = (questionId, answer) => {
    setAnswers(currentAnswers => ({ ...currentAnswers, [questionId]: answer }));
  };

  const submitTest = () => {
    const gradedResults = questions.map(question => {
      const selectedAnswer = answers[question.id];
      const correct = selectedAnswer === question.answer;
      return {
        question,
        selectedAnswer,
        correct,
        earnedPoints: correct ? question.points : 0,
      };
    });
    setResults(gradedResults);
    if (gradedResults.every(result => result.correct)) playCelebration();
    else playWrong();
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              onClick={() => resetAttempt(true)}
              className="h-11 px-5 self-start md:self-auto rounded-lg bg-qteal hover:bg-cyan-700 text-white font-black transition-colors flex items-center gap-2"
            >
              <BookOpenCheck size={17} />
              Start {supportsVersions ? `Version ${selectedVersion}` : 'test'}
            </button>
          </div>
        </header>

        {supportsVersions && (
          <section className="mb-7" aria-labelledby="version-picker-title">
            <div className="mb-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-qteal">Choose your exam booklet</div>
              <h2 id="version-picker-title" className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                Select a test version
              </h2>
              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
                Every version has the same 28 questions and 50-point coverage in a different fixed order.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TEST_VERSIONS.map(version => {
                const isSelected = selectedVersion === version;
                return (
                  <button
                    key={version}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => chooseVersion(version)}
                    className={`group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all
                      ${isSelected
                        ? 'border-qteal bg-gray-900 text-white shadow-lg dark:bg-white dark:text-gray-900'
                        : 'border-gray-200 bg-white text-gray-900 hover:-translate-y-0.5 hover:border-qteal dark:border-gray-700 dark:bg-gray-800 dark:text-white'}
                    `}
                  >
                    <span className={`absolute right-3 top-2 text-5xl font-black leading-none ${isSelected ? 'opacity-15' : 'text-gray-100 dark:text-gray-700'}`}>
                      {version}
                    </span>
                    <span className={`relative text-[10px] font-black uppercase tracking-[0.18em] ${isSelected ? 'text-cyan-200 dark:text-cyan-700' : 'text-gray-400'}`}>
                      Test version
                    </span>
                    <span className="relative mt-3 block text-3xl font-black">{version}</span>
                    <span className={`relative mt-2 block text-xs font-bold ${isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isSelected ? 'Selected' : 'Choose booklet'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

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
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">
            Practice test {supportsVersions ? `Version ${selectedVersion} ` : ''}complete
          </h1>
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
                    <td className={`px-4 py-3 font-semibold ${result.correct ? 'text-gray-700 dark:text-gray-200' : 'text-qred'}`}>{result.selectedAnswer || 'No answer'}</td>
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
                      <p className="font-semibold text-qred mt-1">{result.selectedAnswer || 'No answer'}</p>
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
            Retake {supportsVersions ? `Version ${selectedVersion}` : 'practice test'}
          </button>
          {supportsVersions && (
            <button
              onClick={returnToVersionPicker}
              className="h-12 px-5 rounded-lg border border-qteal bg-white dark:bg-gray-800 text-qteal font-black hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
            >
              Choose another version
            </button>
          )}
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

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-qblue transition-colors"
        >
          <ArrowLeft size={16} />
          Practice test{supportsVersions ? ` · Version ${selectedVersion}` : ''}
        </button>
        <span className="text-sm font-black text-gray-500 dark:text-gray-400">
          {answeredCount} / {questions.length} answered
        </span>
      </div>

      <div className="progress-bar mb-5">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <p className="mb-7 text-sm font-semibold text-gray-500 dark:text-gray-400">
        Answer in any order. You can skip questions, return to them, and change answers before submitting.
        Answers are checked only at the end.
      </p>

      <div className="space-y-6">
        {questions.map(question => {
          const meta = SECTION_META[question.section] || SECTION_META.application;
          const selectedAnswer = answers[question.id];

          return (
            <section
              key={question.id}
              id={`question-${question.number}`}
              className="scroll-mt-5 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-7"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-gray-900 px-2 text-sm font-black text-white dark:bg-white dark:text-gray-900">
                    {question.number}
                  </span>
                  <div className={`inline-flex rounded-md border ${meta.border} ${meta.bg} px-3 py-1.5 text-xs font-black ${meta.color}`}>
                    {meta.label}
                  </div>
                </div>
                <div className="text-sm font-black text-gray-500 dark:text-gray-400">
                  {question.points} point{question.points !== 1 ? 's' : ''} · Multiple choice
                </div>
              </div>

              <h2 className="mb-6 text-xl font-black leading-tight text-gray-900 dark:text-white sm:text-2xl">
                {question.prompt}
              </h2>

              <ArgumentQuestionContext question={question} />

              <fieldset className="space-y-3">
                <legend className="sr-only">Answer choices for question {question.number}</legend>
                {question.choices.map((choice, choiceIndex) => {
                  const isSelected = selectedAnswer === choice.text;
                  return (
                    <label
                      key={`${question.id}-${choice.id}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 text-left transition-all
                        ${isSelected
                          ? 'border-qteal bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-gray-200 bg-white hover:border-qteal dark:border-gray-600 dark:bg-gray-900'}
                      `}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={choice.text}
                        checked={isSelected}
                        onChange={() => chooseAnswer(question.id, choice.text)}
                        className="mt-1 h-4 w-4 shrink-0 accent-qteal"
                      />
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-black text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        {optionLabels[choiceIndex]}
                      </span>
                      <span className="font-semibold leading-relaxed text-gray-900 dark:text-white">{choice.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-7 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-between gap-5 px-1 text-sm font-black sm:justify-start">
          <span className="text-qteal">{answeredCount} answered</span>
          <span className="text-gray-500 dark:text-gray-400">{questions.length - answeredCount} unanswered</span>
        </div>
        <button
          onClick={submitTest}
          className="h-11 w-full rounded-lg bg-qteal px-5 font-black text-white transition-colors hover:bg-cyan-700 sm:w-auto"
        >
          Submit test and check answers
        </button>
      </div>
    </main>
  );
}

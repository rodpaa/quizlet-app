import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, GripVertical, MousePointer2, RotateCcw } from 'lucide-react';
import { useSets } from '../context/SetsContext';
import { playCelebration, playCorrect, playWrong } from '../utils/sound';

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildExercises(argumentsList) {
  return Object.fromEntries(argumentsList.map(argument => [
    argument.id,
    { answers: Array(argument.steps.length).fill(''), options: shuffle(argument.steps.map(step => step.id)), checked: false },
  ]));
}

function moveIntoSlot(answers, targetIndex, stepId) {
  const next = [...answers];
  const sourceIndex = next.indexOf(stepId);
  const displaced = next[targetIndex];
  next[targetIndex] = stepId;
  if (sourceIndex >= 0 && sourceIndex !== targetIndex) next[sourceIndex] = displaced;
  return next;
}

export default function ArgumentBuilder({ setId, onBack, onFlashcards }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const argumentsList = (set?.arguments || []).filter(argument => argument.builder !== false);
  const [courseLabel, testLabel] = (set?.title || 'Study set').split(':').map(part => part.trim());
  const cardsReadyForPractice = set?.cards?.length > 0 && set.cards.every((card) => !card.pending);
  const [exercises, setExercises] = useState(() => buildExercises(argumentsList));
  const [dragging, setDragging] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  if (!set || argumentsList.length === 0) return null;

  const masteredCount = argumentsList.filter(argument => {
    const exercise = exercises[argument.id];
    return exercise.checked && exercise.answers.every((answer, index) => answer === argument.steps[index].id);
  }).length;

  const updateAnswers = (argumentId, updater) => {
    setExercises(current => ({
      ...current,
      [argumentId]: { ...current[argumentId], answers: updater(current[argumentId].answers), checked: false },
    }));
  };

  const placeStep = (argumentId, stepIndex, stepId) => {
    if (!stepId) return;
    updateAnswers(argumentId, answers => moveIntoSlot(answers, stepIndex, stepId));
    setSelected(null);
    setDropTarget(null);
  };

  const returnToBank = (argumentId, stepId) => {
    updateAnswers(argumentId, answers => answers.map(answer => answer === stepId ? '' : answer));
    setSelected(null);
  };

  const nudgeStep = (argumentId, stepIndex, direction) => {
    const target = stepIndex + direction;
    if (target < 0 || target >= exercises[argumentId].answers.length) return;
    updateAnswers(argumentId, answers => {
      const next = [...answers];
      [next[stepIndex], next[target]] = [next[target], next[stepIndex]];
      return next;
    });
  };

  const beginDrag = (event, argumentId, stepId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stepId);
    setDragging({ argumentId, stepId });
  };

  const dropOnSlot = (event, argumentId, stepIndex) => {
    event.preventDefault();
    const stepId = event.dataTransfer.getData('text/plain') || dragging?.stepId;
    if (stepId && dragging?.argumentId === argumentId) placeStep(argumentId, stepIndex, stepId);
    setDragging(null);
  };

  const checkArgument = (argument) => {
    const exercise = exercises[argument.id];
    const correctCount = exercise.answers.filter((answer, index) => answer === argument.steps[index].id).length;
    setExercises(current => ({ ...current, [argument.id]: { ...current[argument.id], checked: true } }));
    if (correctCount === argument.steps.length) {
      if (masteredCount + 1 === argumentsList.length) playCelebration();
      else playCorrect();
    } else playWrong();
  };

  const resetArgument = (argument) => {
    setExercises(current => ({
      ...current,
      [argument.id]: { answers: Array(argument.steps.length).fill(''), options: shuffle(argument.steps.map(step => step.id)), checked: false },
    }));
    setSelected(null);
  };

  const resetAll = () => { setExercises(buildExercises(argumentsList)); setSelected(null); };

  return (
    <main className="argument-builder-page">
      <div className="argument-builder-topbar">
        <button onClick={onBack} className="argument-back"><span aria-hidden="true">&larr;</span> {courseLabel}</button>
        <div className="argument-mastery"><span>{masteredCount}</span> / {argumentsList.length} mastered</div>
      </div>

      <header className="argument-builder-hero">
        <div>
          <div className="page-kicker">{courseLabel}{testLabel ? <> &middot; {testLabel}</> : null}</div>
          <h1>Build the argument.</h1>
          <p>Drag each statement into the logical structure. On touch devices, tap a statement and then tap its destination.</p>
        </div>
        <button onClick={resetAll} className="argument-reset"><RotateCcw size={16} /> Reset all</button>
      </header>

      <div className="argument-mode-row">
        <span className="argument-mode-pill"><GripVertical size={16} /> Argument Builder</span>
        {cardsReadyForPractice && <button onClick={onFlashcards}>Switch to flashcards</button>}
      </div>

      <div className="progress-bar argument-progress"><div className="progress-fill" style={{ width: `${(masteredCount / argumentsList.length) * 100}%` }} /></div>

      <div className="argument-stack">
        {argumentsList.map((argument, argumentIndex) => {
          const exercise = exercises[argument.id];
          const optionById = Object.fromEntries(argument.steps.map(step => [step.id, step]));
          const correctCount = exercise.answers.filter((answer, index) => answer === argument.steps[index].id).length;
          const isMastered = exercise.checked && correctCount === argument.steps.length;
          const available = exercise.options.filter(stepId => !exercise.answers.includes(stepId));
          const selectedForArgument = selected?.argumentId === argument.id ? selected.stepId : null;

          return (
            <section key={argument.id} className={`argument-workspace ${isMastered ? 'is-mastered' : ''}`} style={{ '--argument-delay': `${argumentIndex * 55}ms` }}>
              <div className="argument-heading">
                <div>
                  <span className="argument-number">Argument {String(argumentIndex + 1).padStart(2, '0')}</span>
                  <h2>{argument.title} <em>{argument.shortTitle}</em></h2>
                  <p>{argument.source} &middot; {argument.steps.length} logical steps</p>
                </div>
                {isMastered && <span className="argument-mastered"><Check size={15} /> Mastered</span>}
              </div>

              <div className="argument-board">
                <aside className="statement-bank" aria-label={`Statement bank for ${argument.title}`}>
                  <div className="argument-column-label"><span>Statement bank</span><small>{available.length} remaining</small></div>
                  <div className="statement-bank-list">
                    {available.length ? available.map(stepId => (
                      <button
                        key={stepId}
                        draggable
                        onDragStart={event => beginDrag(event, argument.id, stepId)}
                        onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                        onClick={() => setSelected(current => current?.argumentId === argument.id && current.stepId === stepId ? null : { argumentId: argument.id, stepId })}
                        className={`statement-card ${selectedForArgument === stepId ? 'is-selected' : ''} ${dragging?.stepId === stepId ? 'is-dragging' : ''}`}
                        aria-pressed={selectedForArgument === stepId}
                      >
                        <GripVertical size={17} className="statement-grip" />
                        <span>{optionById[stepId].text}</span>
                      </button>
                    )) : (
                      <div className="statement-bank-empty"><Check size={20} /><span>All statements placed</span></div>
                    )}
                  </div>
                  <div className="argument-touch-hint"><MousePointer2 size={14} /> Tap a card, then a numbered slot</div>
                </aside>

                <div className="argument-structure" aria-label={`Logical structure for ${argument.title}`}>
                  <div className="argument-column-label"><span>Logical structure</span><small>Top to bottom</small></div>
                  <div className="argument-slots">
                    {argument.steps.map((step, stepIndex) => {
                      const answer = exercise.answers[stepIndex];
                      const isCorrect = exercise.checked && answer === step.id;
                      const isWrong = exercise.checked && answer !== step.id;
                      const targetKey = `${argument.id}-${stepIndex}`;
                      return (
                        <div
                          key={step.id}
                          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(targetKey); }}
                          onDragLeave={() => setDropTarget(current => current === targetKey ? null : current)}
                          onDrop={event => dropOnSlot(event, argument.id, stepIndex)}
                          onClick={() => selectedForArgument && placeStep(argument.id, stepIndex, selectedForArgument)}
                          className={`argument-slot ${answer ? 'is-filled' : ''} ${dropTarget === targetKey ? 'is-drop-target' : ''} ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
                        >
                          <div className="argument-slot-marker"><strong>{step.id}</strong><small>{stepIndex === argument.steps.length - 1 ? 'Conclusion' : 'Premise'}</small></div>
                          {answer ? (
                            <div className="placed-statement" draggable onDragStart={event => beginDrag(event, argument.id, answer)} onDragEnd={() => setDragging(null)}>
                              <GripVertical size={17} className="statement-grip" />
                              <span>{optionById[answer].text}</span>
                              <div className="placed-actions">
                                <button onClick={event => { event.stopPropagation(); nudgeStep(argument.id, stepIndex, -1); }} disabled={stepIndex === 0} aria-label={`Move ${answer} up`}><ArrowUp size={14} /></button>
                                <button onClick={event => { event.stopPropagation(); nudgeStep(argument.id, stepIndex, 1); }} disabled={stepIndex === argument.steps.length - 1} aria-label={`Move ${answer} down`}><ArrowDown size={14} /></button>
                                <button onClick={event => { event.stopPropagation(); returnToBank(argument.id, answer); }} aria-label={`Return ${answer} to statement bank`}>&times;</button>
                              </div>
                            </div>
                          ) : (
                            <div className="argument-slot-empty">{selectedForArgument ? 'Tap to place selected statement' : 'Drop a statement here'}</div>
                          )}
                          {exercise.checked && <span className={`argument-result-mark ${isCorrect ? 'is-correct' : 'is-wrong'}`}>{isCorrect ? '\u2713' : '\u00d7'}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <footer className="argument-actions">
                <button onClick={() => checkArgument(argument)} disabled={exercise.answers.some(answer => !answer)} className="argument-check">Check structure</button>
                <button onClick={() => resetArgument(argument)} className="argument-reshuffle"><RotateCcw size={15} /> Reset & reshuffle</button>
                <div className="argument-score" aria-live="polite">
                  {exercise.checked && <span className={isMastered ? 'text-qgreen' : 'text-qred'}>{correctCount} / {argument.steps.length} correct</span>}
                </div>
              </footer>
            </section>
          );
        })}
      </div>
    </main>
  );
}

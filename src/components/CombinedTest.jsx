import { useState } from 'react';
import { useSets } from '../context/SetsContext';
import TestMatch from './TestMatch';
import TestMCQ from './TestMCQ';
import TestWritten from './TestWritten';
import { playCelebration } from '../utils/sound';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Phase header shown between sections
function PhaseHeader({ phase, total }) {
  const phases = [
    { label: 'Match', icon: '🔗', color: 'text-qyellow', desc: `Match ${total[0]} pairs` },
    { label: 'Multiple Choice', icon: '🎯', color: 'text-qgreen', desc: `${total[1]} questions` },
    { label: 'Written', icon: '✏️', color: 'text-qblue', desc: `${total[2]} questions` },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
      {phases.map((p, i) => (
        <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black transition-all
          ${i === phase ? `bg-white dark:bg-gray-700 shadow ${p.color}` : 'text-gray-400 dark:text-gray-600'}`}>
          <span>{p.icon}</span>
          <span>{p.label}</span>
          {i < phase && <span className="text-qgreen ml-1">✓</span>}
        </div>
      ))}
    </div>
  );
}

export default function CombinedTest({ setId, onBack }) {
  const { getSet } = useSets();
  const set = getSet(setId);
  const [phase, setPhase] = useState(0); // 0=match 1=mcq 2=written 3=done
  const [scores, setScores] = useState({ mcq: null, written: null });
  const [started, setStarted] = useState(false);

  // Divide cards into 3 sections (shuffled once)
  const [divided] = useState(() => {
    const all = shuffle(set.cards);
    const n = all.length;
    const matchCount = Math.min(6, Math.floor(n / 3));
    const rem = all.slice(matchCount);
    const half = Math.ceil(rem.length / 2);
    return {
      match: all.slice(0, matchCount),
      mcq: rem.slice(0, half),
      written: rem.slice(half),
    };
  });

  const totals = [divided.match.length, divided.mcq.length, divided.written.length];

  if (!started) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-6">📝</div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Examen Completo</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
          {set.cards.length} terms · 3 sections in one exam
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8 text-left space-y-4">
          {[
            { icon: '🔗', label: 'Section 1 — Match', color: 'text-qyellow', desc: `Match ${totals[0]} term-author pairs` },
            { icon: '🎯', label: 'Section 2 — Multiple Choice', color: 'text-qgreen', desc: `${totals[1]} multiple choice questions` },
            { icon: '✏️', label: 'Section 3 — Written', color: 'text-qblue', desc: `${totals[2]} free-response questions` },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <div className={`font-black ${s.color}`}>{s.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl font-black text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 transition-colors">
            Back
          </button>
          <button onClick={() => setStarted(true)} className="flex-1 py-3 rounded-xl font-black text-white bg-qpink hover:bg-pink-600 transition-colors">
            Start Exam →
          </button>
        </div>
      </div>
    );
  }

  // Results screen
  if (phase === 3) {
    const mcqPct = scores.mcq ? Math.round((scores.mcq.correct / scores.mcq.total) * 100) : 0;
    const writtenPct = scores.written ? Math.round((scores.written.correct / scores.written.total) * 100) : 0;
    const totalCorrect = (scores.mcq?.correct || 0) + (scores.written?.correct || 0);
    const totalQ = (scores.mcq?.total || 0) + (scores.written?.total || 0);
    const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-bounce-in">{overallPct >= 80 ? '🏆' : overallPct >= 60 ? '👍' : '📚'}</div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">Exam Complete!</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Overall score: {overallPct}%</p>
        </div>

        <div className="space-y-4 mb-8">
          {/* Match */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <span className="text-3xl">🔗</span>
            <div className="flex-1">
              <div className="font-black text-gray-900 dark:text-white mb-1">Section 1 — Match</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{totals[0]} pairs matched</div>
            </div>
            <div className="text-qgreen font-black text-lg">✓ Complete</div>
          </div>

          {/* MCQ */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl">🎯</span>
              <div className="flex-1">
                <div className="font-black text-gray-900 dark:text-white mb-0.5">Section 2 — Multiple Choice</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{scores.mcq?.correct}/{scores.mcq?.total} correct</div>
              </div>
              <div className={`font-black text-xl ${mcqPct >= 70 ? 'text-qgreen' : 'text-qred'}`}>{mcqPct}%</div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${mcqPct}%` }} />
            </div>
          </div>

          {/* Written */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl">✏️</span>
              <div className="flex-1">
                <div className="font-black text-gray-900 dark:text-white mb-0.5">Section 3 — Written</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{scores.written?.correct}/{scores.written?.total} correct</div>
              </div>
              <div className={`font-black text-xl ${writtenPct >= 70 ? 'text-qgreen' : 'text-qred'}`}>{writtenPct}%</div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${writtenPct}%` }} />
            </div>
          </div>

          {/* Overall */}
          <div className="bg-qblue rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-black text-white text-lg">Overall Score</div>
              <div className="font-black text-white text-2xl">{overallPct}%</div>
            </div>
            <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="progress-fill" style={{ width: `${overallPct}%`, background: '#ffcd1f' }} />
            </div>
            <div className="text-blue-200 text-sm font-semibold mt-2">{totalCorrect} / {totalQ} questions correct</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => { setPhase(0); setStarted(false); setScores({ mcq: null, written: null }); }}
            className="w-full py-3.5 rounded-xl font-black text-white bg-qpink hover:bg-pink-600 transition-colors">
            Retake Exam
          </button>
          <button onClick={onBack} className="w-full py-3.5 rounded-xl font-black text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 transition-colors">
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Phase 0: Match */}
      {phase === 0 && (
        <>
          <div className="bg-gray-900 px-4 pt-6 pb-2">
            <div className="max-w-4xl mx-auto">
              <div className="bg-slate-200 dark:bg-gray-800 rounded-2xl border border-slate-300 dark:border-gray-700 p-4 mb-4">
                <PhaseHeader phase={0} total={totals} />
              </div>
            </div>
          </div>
          <TestMatch
            setId={setId}
            initialCards={divided.match}
            onBack={onBack}
            onComplete={() => setPhase(1)}
          />
        </>
      )}

      {/* Phase 1: MCQ */}
      {phase === 1 && (
        <div>
          <div className="max-w-2xl mx-auto px-4 pt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <PhaseHeader phase={1} total={totals} />
            </div>
          </div>
          <TestMCQ
            setId={setId}
            initialCards={divided.mcq}
            onBack={onBack}
            onComplete={(correct, total) => {
              setScores(s => ({ ...s, mcq: { correct, total } }));
              setPhase(2);
            }}
          />
        </div>
      )}

      {/* Phase 2: Written */}
      {phase === 2 && (
        <div>
          <div className="max-w-2xl mx-auto px-4 pt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <PhaseHeader phase={2} total={totals} />
            </div>
          </div>
          <TestWritten
            setId={setId}
            initialCards={divided.written}
            onBack={onBack}
            onComplete={(results) => {
              const correct = results.filter(r => r.correct).length;
              setScores(s => ({ ...s, written: { correct, total: results.length } }));
              playCelebration();
              setPhase(3);
            }}
          />
        </div>
      )}
    </div>
  );
}

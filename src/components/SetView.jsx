import { getSet } from '../data/sets';

export default function SetView({ setId, onLearn, onArgumentBuilder, onTest, onBack }) {
  const set = getSet(setId);
  if (!set) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold hover:text-qblue mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <span className="text-5xl">{set.emoji}</span>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{set.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{set.description}</p>
            <span className="inline-block mt-2 text-sm font-bold text-qblue">{set.cards.length} terms</span>
          </div>
        </div>

        {set.arguments && (
          <button
            onClick={() => onArgumentBuilder(setId)}
            className="w-full mb-4 p-4 rounded-lg border-2 border-qorange bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center gap-4 text-left"
          >
            <span className="w-11 h-11 rounded-lg bg-qorange text-white flex items-center justify-center text-2xl font-black shrink-0" aria-hidden="true">&equiv;</span>
            <div className="min-w-0 flex-1">
              <div className="font-black text-qorange">Argument Builder</div>
              <div className="text-sm text-orange-800 dark:text-orange-300 font-semibold">Reconstruct {set.arguments.filter(argument => argument.builder !== false).length} arguments from shuffled dropdown choices</div>
            </div>
            <span className="text-qorange font-black" aria-hidden="true">&rarr;</span>
          </button>
        )}

        {/* Study modes grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <button onClick={() => onLearn(setId)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-qblue bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <span className="text-2xl">🃏</span>
            <span className="font-black text-qblue text-sm">Learn</span>
          </button>
          <button onClick={() => onTest(setId, 'written')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-qblue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
            <span className="text-2xl">✏️</span>
            <span className="font-black text-gray-700 dark:text-gray-300 group-hover:text-qblue text-sm">Written</span>
          </button>
          <button onClick={() => onTest(setId, 'mcq')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-qgreen hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
            <span className="text-2xl">🎯</span>
            <span className="font-black text-gray-700 dark:text-gray-300 group-hover:text-qgreen text-sm">MCQ</span>
          </button>
          <button onClick={() => onTest(setId, 'match')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-qpurple hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group">
            <span className="text-2xl">🔗</span>
            <span className="font-black text-gray-700 dark:text-gray-300 group-hover:text-qpurple text-sm">Match</span>
          </button>
        </div>

        {/* Combined exam button */}
        <button onClick={() => onTest(setId, 'combined')}
          className="w-full p-4 rounded-xl border-2 border-qpink bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors flex items-center justify-center gap-3">
          <span className="text-2xl">📝</span>
          <div className="text-left">
            <div className="font-black text-qpink text-sm">Examen Completo</div>
            <div className="text-xs text-pink-500 dark:text-pink-400 font-medium">Match + Multiple Choice + Written — todo en uno</div>
          </div>
        </button>
      </div>

      {set.focusAreas && (
        <section className="border-y border-gray-200 dark:border-gray-700 py-5 mb-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-black text-lg text-gray-900 dark:text-white">Priority review</h2>
            <span className="text-xs font-black text-qorange uppercase">Test 1 focus</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {set.focusAreas.map((area, index) => (
              <div key={area} className="flex gap-3 items-start bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <span className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/40 text-qorange flex items-center justify-center text-sm font-black shrink-0">{index + 1}</span>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">{area}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {set.pendingTerms?.map(item => (
        <aside key={item.term} className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-4 flex gap-3 items-start">
          <span className="w-8 h-8 rounded-md bg-yellow-400 text-yellow-950 flex items-center justify-center font-black shrink-0">!</span>
          <div>
            <div className="font-black text-yellow-900 dark:text-yellow-200">Still needed: {item.term}</div>
            <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mt-1">{item.note}</div>
          </div>
        </aside>
      ))}

      {/* Cards list */}
      <h2 className="font-black text-lg text-gray-900 dark:text-white mb-4">Terms ({set.cards.length})</h2>
      <div className="space-y-3">
        {set.cards.map((card, i) => (
          <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-4 items-start">
            <span className="text-sm font-bold text-gray-300 dark:text-gray-600 mt-0.5 w-5 shrink-0">{i + 1}</span>
            <div className="flex-1 grid grid-cols-2 gap-4 min-w-0">
              <div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Term</div>
                <div className="font-semibold text-gray-900 dark:text-white">{card.term}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Definition</div>
                <div className="font-medium text-gray-700 dark:text-gray-300">{card.definition}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

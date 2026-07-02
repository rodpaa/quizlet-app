import { flashcardSets } from '../data/sets';

const subjectColors = {
  'AP Spanish Lit': 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  Language: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Geography: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Science: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Philosophy: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

export default function Home({ onSelectSet }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3">Your Study Sets</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Pick a set and start studying</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {flashcardSets.map((set) => (
          <div
            key={set.id}
            onClick={() => onSelectSet(set.id)}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
          >
            <div className="h-1.5 rounded-full mb-5" style={{ background: set.color }} />
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{set.emoji}</div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${subjectColors[set.subject] || 'bg-gray-100 text-gray-600'}`}>
                {set.subject}
              </span>
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1 group-hover:text-qblue transition-colors">
              {set.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-4 line-clamp-2">{set.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{set.cards.length} terms</span>
              <div className="flex gap-1.5">
                {(set.arguments ? ['Cards', 'Arguments', 'Test'] : ['Learn', 'Test', 'Match']).map(m => (
                  <span key={m} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold px-2 py-1 rounded-lg">{m}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <h3 className="font-black text-xl text-gray-900 dark:text-white mb-6 text-center">How to Study</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { icon: '🃏', title: 'Learn', desc: 'Flip flashcards' },
            { icon: '✏️', title: 'Written', desc: 'Type the answer' },
            { icon: '🎯', title: 'Multiple Choice', desc: '4 options' },
            { icon: '📝', title: 'Examen', desc: 'Match + MCQ + FRQ combined' },
          ].map(item => (
            <div key={item.title} className="text-center">
              <div className="text-4xl mb-3">{item.icon}</div>
              <div className="font-black text-gray-900 dark:text-white mb-1">{item.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

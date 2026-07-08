import { useMemo, useState } from 'react';
import { BookOpen, Edit3, Globe2, Lock, Plus, Search, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSets } from '../context/SetsContext';

function SetCard({ set, onSelect, onEdit, currentUserId }) {
  const isOwner = set.ownerId === currentUserId;
  return (
    <article className="set-card group">
      <button onClick={() => onSelect(set.id)} className="w-full text-left p-5 pb-4" aria-label={`Study ${set.title}`}>
        <div className="h-1 rounded-full mb-5" style={{ background: set.color }} />
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className="text-3xl" aria-hidden="true">{set.emoji}</span>
          <span className="subject-chip">{set.subject}</span>
        </div>
        <h2 className="text-lg font-black text-gray-950 dark:text-white leading-snug mb-1.5 group-hover:text-qblue transition-colors line-clamp-2">{set.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold leading-relaxed line-clamp-2 min-h-10">{set.description || 'No description'}</p>
      </button>
      <div className="px-5 pb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-gray-700 dark:text-gray-300">{set.cards.length} terms</div>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 truncate">by {isOwner ? 'you' : set.authorName}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="visibility-icon" title={set.isPublic ? 'Public' : 'Private'}>
            {set.isPublic ? <Globe2 size={15} /> : <Lock size={15} />}
          </span>
          {isOwner && (
            <button onClick={() => onEdit(set.id)} className="icon-button" aria-label={`Edit ${set.title}`} title="Edit set">
              <Edit3 size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Home({ onSelectSet, onCreate, onEdit, onRequestAuth, initialTab = 'discover' }) {
  const { user } = useAuth();
  const { publicSets, mySets, loading, error } = useSets();
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');

  const source = tab === 'mine' ? mySets : publicSets;
  const sets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return source;
    return source.filter((set) => [set.title, set.description, set.subject, set.authorName]
      .some((value) => value?.toLowerCase().includes(normalized)));
  }, [query, source]);

  const create = () => {
    if (user) onCreate();
    else onRequestAuth('signup');
  };

  return (
    <main>
      <section className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-qblue font-black text-sm mb-2">
              <Sparkles size={17} /> Study library
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-950 dark:text-white tracking-normal">Find it. Make it. Learn it.</h1>
            <p className="text-gray-500 dark:text-gray-400 font-semibold mt-2 max-w-xl">Explore community flashcards or build a focused set of your own.</p>
          </div>
          <button onClick={create} className="primary-button shrink-0 self-start md:self-auto">
            <Plus size={19} /> Create set
          </button>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-7">
          <div className="flex bg-gray-200/70 dark:bg-gray-800 rounded-lg p-1 self-start" role="tablist" aria-label="Study set library">
            <button role="tab" aria-selected={tab === 'discover'} onClick={() => setTab('discover')} className={`segmented-button px-4 gap-2 ${tab === 'discover' ? 'segmented-button-active' : ''}`}>
              <Globe2 size={16} /> Discover
            </button>
            <button role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')} className={`segmented-button px-4 gap-2 ${tab === 'mine' ? 'segmented-button-active' : ''}`}>
              <UserRound size={16} /> My sets
            </button>
          </div>

          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Search study sets</span>
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="form-input pl-10" placeholder="Search sets" />
          </label>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-3 text-sm font-bold text-qred" role="alert">
            Could not load community sets: {error}
          </div>
        )}

        {tab === 'mine' && !user ? (
          <div className="empty-state">
            <UserRound size={34} />
            <h2>Your sets live here</h2>
            <p>Sign in to create private sets and manage your public library.</p>
            <button onClick={() => onRequestAuth('signin')} className="primary-button mt-5">Sign in</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Loading sets">
            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-64 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : sets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <SetCard key={set.id} set={set} onSelect={onSelectSet} onEdit={onEdit} currentUserId={user?.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={34} />
            <h2>{query ? 'No matching sets' : 'Create your first set'}</h2>
            <p>{query ? 'Try a different title, subject, or creator.' : 'Add terms, choose who can see them, and start studying.'}</p>
            {!query && <button onClick={create} className="primary-button mt-5"><Plus size={18} /> Create set</button>}
          </div>
        )}
      </div>
    </main>
  );
}

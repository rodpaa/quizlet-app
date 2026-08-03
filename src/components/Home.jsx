import { useMemo, useState } from 'react';
import {
  ArrowUpRight, BookOpen, Edit3, Globe2, Layers3, Lock, Plus,
  Search, Sparkles, UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSets } from '../context/SetsContext';

function SetCard({ set, onSelect, onEdit, currentUserId, index }) {
  const isOwner = set.ownerId === currentUserId;
  const details = [
    `${set.cards.length} terms`,
    set.arguments?.length ? `${set.arguments.length} arguments` : null,
    set.comprehensionQuestions?.length ? `${set.comprehensionQuestions.length} questions` : null,
  ].filter(Boolean);

  return (
    <article className="library-card" style={{ '--set-accent': set.color, '--card-delay': `${index * 55}ms` }}>
      <button onClick={() => onSelect(set.id)} className="library-card-main" aria-label={`Study ${set.title}`}>
        <div className="library-card-topline">
          <span className="library-subject">{set.subject}</span>
          <span className="library-card-arrow"><ArrowUpRight size={18} /></span>
        </div>
        <div className="library-card-emoji" aria-hidden="true">{set.emoji}</div>
        <h2>{set.title}</h2>
        <p>{set.description || 'A focused study set ready for your next session.'}</p>
        <div className="library-card-meta">
          <Layers3 size={15} />
          <span>{details.join(' · ')}</span>
        </div>
      </button>
      <div className="library-card-footer">
        <span className="library-author">by {isOwner ? 'you' : set.authorName}</span>
        <div className="flex items-center gap-1.5">
          <span className="visibility-icon" title={set.isPublic ? 'Public' : 'Private'}>
            {set.isPublic ? <Globe2 size={15} /> : <Lock size={15} />}
          </span>
          {isOwner && (
            <button onClick={() => onEdit(set.id)} className="icon-button" aria-label={`Edit ${set.title}`} title="Edit set"><Edit3 size={16} /></button>
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

  const create = () => user ? onCreate() : onRequestAuth('signup');

  return (
    <main className="library-page">
      <header className="library-hero">
        <div>
          <div className="page-kicker"><Sparkles size={15} /> Curated study space</div>
          <h1>{tab === 'mine' ? 'My Library' : 'Study Library'}</h1>
          <p>{tab === 'mine' ? 'Your sets, organized for the way you learn.' : 'Choose a set and return to focused learning.'}</p>
        </div>
        <button onClick={create} className="primary-button library-create"><Plus size={18} /> New set</button>
      </header>

      <section className="library-toolbar" aria-label="Library controls">
        <div className="library-tabs" role="tablist" aria-label="Study set library">
          <button role="tab" aria-selected={tab === 'discover'} onClick={() => setTab('discover')} className={tab === 'discover' ? 'is-active' : ''}><Globe2 size={16} /> Discover</button>
          <button role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')} className={tab === 'mine' ? 'is-active' : ''}><UserRound size={16} /> My sets</button>
        </div>
        <label className="library-search">
          <span className="sr-only">Search study sets</span>
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sets, subjects, creators…" />
        </label>
      </section>

      {error && <div className="status-panel status-panel--error" role="alert">Could not load community sets: {error}</div>}

      {tab === 'mine' && !user ? (
        <div className="empty-state glass-panel">
          <UserRound size={34} />
          <h2>Your library is waiting</h2>
          <p>Sign in to create private sets and keep your study space organized.</p>
          <button onClick={() => onRequestAuth('signin')} className="primary-button mt-5">Sign in</button>
        </div>
      ) : loading ? (
        <div className="library-grid" aria-label="Loading sets">
          {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="library-card library-card--loading" />)}
        </div>
      ) : sets.length > 0 ? (
        <div className="library-grid">
          {sets.map((set, index) => <SetCard key={set.id} set={set} index={index} onSelect={onSelectSet} onEdit={onEdit} currentUserId={user?.id} />)}
        </div>
      ) : (
        <div className="empty-state glass-panel">
          <BookOpen size={34} />
          <h2>{query ? 'No matching sets' : 'Create your first set'}</h2>
          <p>{query ? 'Try another title, subject, or creator.' : 'Add your material once, then practice it in several focused modes.'}</p>
          {!query && <button onClick={create} className="primary-button mt-5"><Plus size={18} /> Create set</button>}
        </div>
      )}
    </main>
  );
}

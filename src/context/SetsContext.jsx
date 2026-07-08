import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flashcardSets } from '../data/sets';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SetsContext = createContext(null);
const DEMO_SETS_KEY = 'quizlet-demo-sets';

const builtInSets = flashcardSets.map((set) => ({
  ...set,
  ownerId: null,
  authorName: 'Quizlet Library',
  isPublic: true,
  builtIn: true,
  createdAt: null,
}));

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    subject: row.subject || 'Other',
    color: row.color || '#4257b2',
    emoji: row.emoji || '📚',
    cards: row.cards || [],
    ownerId: row.owner_id,
    authorName: row.profiles?.display_name || 'Community member',
    isPublic: row.is_public,
    createdAt: row.created_at,
  };
}

function readDemoSets() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_SETS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function SetsProvider({ children }) {
  const { user, profile } = useAuth();
  const [communitySets, setCommunitySets] = useState([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) {
      setCommunitySets(readDemoSets());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('flashcard_sets')
      .select('id,title,description,subject,color,emoji,cards,owner_id,is_public,created_at,profiles(display_name)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setCommunitySets([]);
    } else {
      setCommunitySets(data.map(fromRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh, user?.id]);

  const saveSet = useCallback(async (draft, existingId = null) => {
    if (!user) throw new Error('Sign in before saving a study set.');

    const normalized = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      subject: draft.subject.trim() || 'Other',
      color: draft.color,
      emoji: draft.emoji.trim() || '📚',
      cards: draft.cards.map((card, index) => ({
        id: card.id || crypto.randomUUID(),
        term: card.term.trim(),
        definition: card.definition.trim(),
        order: index,
      })),
      ownerId: user.id,
      authorName: profile?.displayName || 'Student',
      isPublic: draft.isPublic,
    };

    if (!supabase) {
      const current = readDemoSets();
      const saved = {
        ...normalized,
        id: existingId || crypto.randomUUID(),
        createdAt: existingId
          ? current.find((set) => set.id === existingId)?.createdAt
          : new Date().toISOString(),
      };
      const next = existingId
        ? current.map((set) => set.id === existingId ? saved : set)
        : [saved, ...current];
      localStorage.setItem(DEMO_SETS_KEY, JSON.stringify(next));
      setCommunitySets(next);
      return saved;
    }

    const payload = {
      title: normalized.title,
      description: normalized.description,
      subject: normalized.subject,
      color: normalized.color,
      emoji: normalized.emoji,
      cards: normalized.cards,
      is_public: normalized.isPublic,
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const query = existingId
      ? supabase.from('flashcard_sets').update(payload).eq('id', existingId)
      : supabase.from('flashcard_sets').insert(payload);
    const { data, error: saveError } = await query
      .select('id,title,description,subject,color,emoji,cards,owner_id,is_public,created_at,profiles(display_name)')
      .single();
    if (saveError) throw saveError;
    await refresh();
    return fromRow(data);
  }, [profile?.displayName, refresh, user]);

  const deleteSet = useCallback(async (id) => {
    const set = communitySets.find((item) => item.id === id);
    if (!user || set?.ownerId !== user.id) throw new Error('Only the owner can delete this set.');

    if (!supabase) {
      const next = readDemoSets().filter((item) => item.id !== id);
      localStorage.setItem(DEMO_SETS_KEY, JSON.stringify(next));
      setCommunitySets(next);
      return;
    }

    const { error: deleteError } = await supabase.from('flashcard_sets').delete().eq('id', id);
    if (deleteError) throw deleteError;
    await refresh();
  }, [communitySets, refresh, user]);

  const allSets = useMemo(() => [...communitySets, ...builtInSets], [communitySets]);
  const publicSets = useMemo(() => allSets.filter((set) => set.isPublic), [allSets]);
  const mySets = useMemo(
    () => user ? communitySets.filter((set) => set.ownerId === user.id) : [],
    [communitySets, user],
  );
  const getSet = useCallback((id) => allSets.find((set) => set.id === id), [allSets]);

  const value = useMemo(() => ({
    allSets,
    publicSets,
    mySets,
    loading,
    error,
    getSet,
    saveSet,
    deleteSet,
    refresh,
  }), [allSets, publicSets, mySets, loading, error, getSet, saveSet, deleteSet, refresh]);

  return <SetsContext.Provider value={value}>{children}</SetsContext.Provider>;
}

// The hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useSets() {
  const context = useContext(SetsContext);
  if (!context) throw new Error('useSets must be used inside SetsProvider');
  return context;
}

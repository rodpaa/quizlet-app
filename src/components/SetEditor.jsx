import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Globe2, GripVertical, Lock, Plus, Save, Trash2 } from 'lucide-react';
import { useSets } from '../context/SetsContext';

const COLORS = ['#4257b2', '#087f8c', '#23b26d', '#c44f3b', '#e86ca7', '#7c5cbf'];

function emptyCard() {
  return { id: crypto.randomUUID(), term: '', definition: '' };
}

export default function SetEditor({ initialSet, onCancel, onSaved }) {
  const { saveSet } = useSets();
  const [form, setForm] = useState(() => ({
    title: initialSet?.title || '',
    description: initialSet?.description || '',
    subject: initialSet?.subject || '',
    emoji: initialSet?.emoji || '📚',
    color: initialSet?.color || COLORS[0],
    isPublic: initialSet?.isPublic ?? false,
    cards: initialSet?.cards?.map((card) => ({ ...card })) || [emptyCard(), emptyCard()],
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const validCardCount = useMemo(
    () => form.cards.filter((card) => card.term.trim() && card.definition.trim()).length,
    [form.cards],
  );

  const updateCard = (id, field, value) => {
    setForm((current) => ({
      ...current,
      cards: current.cards.map((card) => card.id === id ? { ...card, [field]: value } : card),
    }));
  };

  const addCard = () => setForm((current) => ({ ...current, cards: [...current.cards, emptyCard()] }));

  const removeCard = (id) => {
    if (form.cards.length <= 2) return;
    setForm((current) => ({ ...current, cards: current.cards.filter((card) => card.id !== id) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Add a title for your set.');
      return;
    }
    if (validCardCount < 2 || validCardCount !== form.cards.length) {
      setError('Complete at least two term and definition pairs.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveSet(form, initialSet?.id);
      onSaved(saved.id);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 pb-28">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onCancel} className="icon-button shrink-0" aria-label="Cancel editing" title="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-qblue font-black uppercase tracking-wide">{initialSet ? 'Edit set' : 'New set'}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white truncate">Build your flashcards</h1>
          </div>
        </div>
        <span className="hidden sm:block text-sm font-bold text-gray-500 dark:text-gray-400">{validCardCount} complete</span>
      </div>

      <form id="set-editor" onSubmit={submit}>
        <section className="editor-section grid lg:grid-cols-[1fr_260px] gap-6">
          <div className="space-y-4">
            <label className="form-label">
              Title
              <input className="form-input text-lg" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={100} placeholder="Biology chapter 4" autoFocus />
            </label>
            <label className="form-label">
              Description <span className="font-semibold text-gray-400">(optional)</span>
              <textarea className="form-input min-h-24 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={240} placeholder="What this set covers" />
            </label>
            <label className="form-label">
              Subject
              <input className="form-input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} maxLength={50} placeholder="Biology" />
            </label>
          </div>

          <div className="space-y-5">
            <fieldset>
              <legend className="form-label mb-2">Visibility</legend>
              <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button type="button" onClick={() => setForm({ ...form, isPublic: false })} className={`segmented-button gap-1.5 ${!form.isPublic ? 'segmented-button-active' : ''}`}>
                  <Lock size={15} /> Private
                </button>
                <button type="button" onClick={() => setForm({ ...form, isPublic: true })} className={`segmented-button gap-1.5 ${form.isPublic ? 'segmented-button-active' : ''}`}>
                  <Globe2 size={15} /> Public
                </button>
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {form.isPublic ? 'Anyone can find and study this set.' : 'Only you can view and study this set.'}
              </p>
            </fieldset>

            <label className="form-label">
              Set icon
              <input className="form-input text-2xl text-center" value={form.emoji} onChange={(event) => setForm({ ...form, emoji: event.target.value })} maxLength={4} aria-label="Set icon" />
            </label>

            <fieldset>
              <legend className="form-label mb-2">Accent color</legend>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setForm({ ...form, color })} className="w-9 h-9 rounded-md flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-qblue" style={{ background: color }} aria-label={`Use color ${color}`} title={color}>
                    {form.color === color && <Check size={18} className="text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <div className="flex items-end justify-between gap-4 mt-10 mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-950 dark:text-white">Cards</h2>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Add at least two pairs.</p>
          </div>
          <span className="text-sm font-black text-qblue">{form.cards.length} total</span>
        </div>

        <div className="space-y-3">
          {form.cards.map((card, index) => (
            <div key={card.id} className="flashcard-editor-row">
              <div className="flex sm:flex-col items-center gap-2 sm:gap-1 text-gray-400">
                <GripVertical size={18} aria-hidden="true" />
                <span className="text-xs font-black">{index + 1}</span>
              </div>
              <label className="form-label min-w-0">
                Term
                <textarea className="form-input resize-none min-h-20" value={card.term} onChange={(event) => updateCard(card.id, 'term', event.target.value)} placeholder="Enter a term" />
              </label>
              <label className="form-label min-w-0">
                Definition
                <textarea className="form-input resize-none min-h-20" value={card.definition} onChange={(event) => updateCard(card.id, 'definition', event.target.value)} placeholder="Enter a definition" />
              </label>
              <button type="button" onClick={() => removeCard(card.id)} disabled={form.cards.length <= 2} className="icon-button self-start sm:self-center disabled:opacity-30" aria-label={`Delete card ${index + 1}`} title="Delete card">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addCard} className="secondary-button mt-4">
          <Plus size={18} /> Add card
        </button>

        {error && <p className="mt-5 text-sm font-bold text-qred" role="alert">{error}</p>}
      </form>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="secondary-button">Cancel</button>
          <button form="set-editor" disabled={saving} className="primary-button disabled:opacity-50">
            <Save size={18} /> {saving ? 'Saving...' : 'Save set'}
          </button>
        </div>
      </div>
    </main>
  );
}

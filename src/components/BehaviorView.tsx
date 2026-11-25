import React, { useState } from 'react';
import { Award, Edit3, Plus, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { BehaviorNote, JournalState, UserRole } from '../types/journal';
import { formatDatePl } from '../utils/grades';

interface BehaviorViewProps {
  journal: JournalState;
  userRole: UserRole;
  canEditOverride?: boolean;
  onAddBehaviorNote: (
    type: 'positive' | 'negative',
    category: string,
    description: string,
    points: number
  ) => void;
  onUpdateBehaviorNote: (note: BehaviorNote) => void;
  onDeleteBehaviorNote: (id: string) => void;
}

export const BehaviorView: React.FC<BehaviorViewProps> = ({
  journal,
  userRole,
  canEditOverride,
  onAddBehaviorNote,
  onUpdateBehaviorNote,
  onDeleteBehaviorNote,
}) => {
  const canEdit = canEditOverride ?? (userRole === 'director' || userRole === 'teacher');
  const [modalItem, setModalItem] = useState<{
    existing?: BehaviorNote;
    type: 'positive' | 'negative';
    category: string;
    points: number;
    description: string;
  } | null>(null);

  const positivePoints = journal.behaviorNotes
    .filter((n) => n.points > 0)
    .reduce((acc, n) => acc + n.points, 0);
  const negativePoints = journal.behaviorNotes
    .filter((n) => n.points < 0)
    .reduce((acc, n) => acc + n.points, 0);
  const totalScore = 100 + positivePoints + negativePoints;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem || !modalItem.description.trim()) return;
    const signedPoints =
      modalItem.type === 'positive' ? Math.abs(modalItem.points) : -Math.abs(modalItem.points);
    const cat =
      modalItem.category.trim() || (modalItem.type === 'positive' ? 'Pochwała' : 'Uwaga');

    if (modalItem.existing) {
      onUpdateBehaviorNote({
        ...modalItem.existing,
        type: modalItem.type,
        category: cat,
        description: modalItem.description.trim(),
        points: signedPoints,
      });
    } else {
      onAddBehaviorNote(modalItem.type, cat, modalItem.description.trim(), signedPoints);
    }
    setModalItem(null);
  };

  return (
    <div className="space-y-5">
      <section className="pb-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">Uwagi i Zachowanie</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Rejestr pochwał, uwag oraz punktacji zachowania ucznia
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded bg-[#F8F1F8] border border-[#D8BFE2] flex items-center gap-2.5">
              <Award className="w-4 h-4 text-[#7B2276]" />
              <div className="text-xs">
                <span className="text-slate-600">Ocena: </span>
                <strong className="text-slate-900">{journal.behaviorGrade}</strong>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  setModalItem({
                    type: 'positive',
                    category: 'Pochwała',
                    points: 10,
                    description: '',
                  })
                }
                className="px-3.5 py-2 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj uwagę</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Suma punktów (start: 100)</div>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {totalScore} pkt
            </div>
          </div>
          <div className="p-3.5 rounded bg-emerald-50/70 border border-emerald-200">
            <div className="text-xs text-emerald-800">Punkty dodatnie</div>
            <div className="font-mono text-xl font-bold text-emerald-900 tabular-nums mt-0.5">
              +{positivePoints} pkt
            </div>
          </div>
          <div className="p-3.5 rounded bg-rose-50/70 border border-rose-200">
            <div className="text-xs text-rose-800">Punkty ujemne</div>
            <div className="font-mono text-xl font-bold text-rose-900 tabular-nums mt-0.5">
              {negativePoints} pkt
            </div>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 rounded divide-y divide-slate-100">
        {journal.behaviorNotes.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Brak wpisanych uwag lub pochwał w bieżącym okresie.
          </div>
        ) : (
          [...journal.behaviorNotes]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((note) => {
              const isPositive = note.type === 'positive';
              const isNegative = note.type === 'negative';
              return (
                <div key={note.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                        isPositive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : isNegative
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {isNegative ? (
                        <ThumbsDown className="w-4 h-4" />
                      ) : (
                        <ThumbsUp className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            isPositive
                              ? 'text-emerald-700'
                              : isNegative
                                ? 'text-rose-700'
                                : 'text-slate-700'
                          }`}
                        >
                          {note.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{formatDatePl(note.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{note.teacher}</span>
                      </div>
                      <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                        {note.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-xs font-bold tabular-nums px-2 py-1 rounded border ${
                        note.points > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : note.points < 0
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {note.points > 0 ? `+${note.points}` : note.points} pkt
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setModalItem({
                              existing: note,
                              type: note.type === 'negative' ? 'negative' : 'positive',
                              category: note.category,
                              points: Math.abs(note.points),
                              description: note.description,
                            })
                          }
                          title="Edytuj uwagę"
                          className="p-1.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBehaviorNote(note.id)}
                          title="Usuń uwagę"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </section>

      {modalItem && canEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                {modalItem.existing ? 'Edytuj uwagę lub pochwałę' : 'Dodaj uwagę lub pochwałę'}
              </h2>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rodzaj</label>
                  <select
                    value={modalItem.type}
                    onChange={(e) =>
                      setModalItem({
                        ...modalItem,
                        type: e.target.value as 'positive' | 'negative',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  >
                    <option value="positive">Pochwała (+)</option>
                    <option value="negative">Uwaga (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Punkty</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={modalItem.points}
                    onChange={(e) =>
                      setModalItem({ ...modalItem, points: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategoria</label>
                <input
                  type="text"
                  value={modalItem.category}
                  onChange={(e) => setModalItem({ ...modalItem, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Treść</label>
                <textarea
                  rows={3}
                  required
                  value={modalItem.description}
                  onChange={(e) => setModalItem({ ...modalItem, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

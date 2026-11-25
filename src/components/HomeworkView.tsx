import React, { useState } from 'react';
import { CheckCircle2, Circle, Edit3, Plus, Trash2, X } from 'lucide-react';
import { HomeworkItem, JournalState, UserRole } from '../types/journal';
import { formatDatePl } from '../utils/grades';

interface HomeworkViewProps {
  journal: JournalState;
  userRole: UserRole;
  canEditOverride?: boolean;
  onToggleHomework: (id: string) => void;
  onAddHomework: (subject: string, dueDate: string, title: string, description: string) => void;
  onUpdateHomework: (item: HomeworkItem) => void;
  onDeleteHomework: (id: string) => void;
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  journal,
  userRole,
  canEditOverride,
  onToggleHomework,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
}) => {
  const canEdit = canEditOverride ?? (userRole === 'director' || userRole === 'teacher');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [modalItem, setModalItem] = useState<{
    existing?: HomeworkItem;
    subject: string;
    dueDate: string;
    title: string;
    description: string;
  } | null>(null);

  const filtered = journal.homework.filter((h) => {
    if (filter === 'pending') return !h.completed;
    if (filter === 'done') return h.completed;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem || !modalItem.title.trim()) return;
    if (modalItem.existing) {
      onUpdateHomework({
        ...modalItem.existing,
        subject: modalItem.subject,
        dueDate: modalItem.dueDate,
        title: modalItem.title.trim(),
        description: modalItem.description.trim(),
      });
    } else {
      onAddHomework(
        modalItem.subject,
        modalItem.dueDate,
        modalItem.title.trim(),
        modalItem.description.trim()
      );
    }
    setModalItem(null);
  };

  return (
    <div className="space-y-5">
      <section className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">Zadania domowe</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lista prac domowych zadanych przez nauczycieli
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Wszystkie ({journal.homework.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                filter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Do zrobienia ({journal.homework.filter((h) => !h.completed).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('done')}
              className={`px-3 py-1 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                filter === 'done' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Wykonane ({journal.homework.filter((h) => h.completed).length})
            </button>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() =>
                setModalItem({
                  subject: journal.subjects[0]?.name ?? 'Matematyka',
                  dueDate: '2026-11-25',
                  title: '',
                  description: '',
                })
              }
              className="px-3.5 py-1.5 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj zadanie</span>
            </button>
          )}
        </div>
      </section>

      <section className="border border-slate-200 rounded divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Brak zadań domowych w wybranym widoku.
          </div>
        ) : (
          filtered.map((hw) => (
            <div
              key={hw.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                hw.completed ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleHomework(hw.id)}
                  aria-label={hw.completed ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}
                  className="mt-0.5 shrink-0 cursor-pointer"
                >
                  {hw.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[#7B2276]">{hw.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{hw.teacher}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Zadano:{' '}
                      <span className="font-mono tabular-nums">{formatDatePl(hw.assignedDate)}</span>
                    </span>
                  </div>
                  <h2
                    className={`text-sm font-bold mt-1 ${
                      hw.completed ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {hw.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{hw.description}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Termin</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums mt-0.5">
                    {formatDatePl(hw.dueDate)}
                  </div>
                  <div
                    className={`text-[11px] font-medium mt-0.5 ${
                      hw.completed ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {hw.completed ? 'Wykonane' : 'Oczekuje'}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setModalItem({
                          existing: hw,
                          subject: hw.subject,
                          dueDate: hw.dueDate,
                          title: hw.title,
                          description: hw.description,
                        })
                      }
                      title="Edytuj zadanie"
                      className="p-1.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHomework(hw.id)}
                      title="Usuń zadanie"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {modalItem && canEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                {modalItem.existing ? 'Edytuj zadanie domowe' : 'Dodaj zadanie domowe'}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Przedmiot
                  </label>
                  <select
                    value={modalItem.subject}
                    onChange={(e) => setModalItem({ ...modalItem, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {journal.subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Termin oddania
                  </label>
                  <input
                    type="date"
                    required
                    value={modalItem.dueDate}
                    onChange={(e) => setModalItem({ ...modalItem, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  required
                  value={modalItem.title}
                  onChange={(e) => setModalItem({ ...modalItem, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opis</label>
                <textarea
                  rows={3}
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
                  {modalItem.existing ? 'Zapisz zmiany' : 'Zapisz zadanie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

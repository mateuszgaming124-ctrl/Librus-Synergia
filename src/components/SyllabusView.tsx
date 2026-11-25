import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  CheckCircle2,
  Circle,
  Download,
  Edit3,
  GripVertical,
  Palette,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { JournalState, SyllabusTopic, UserRole } from '../types/journal';

interface SyllabusViewProps {
  journal: JournalState;
  userRole: UserRole;
  canEditOverride?: boolean;
  onAddSyllabusTopic: (
    classId: string,
    subjectId: string,
    title: string,
    hours: number,
    color: string
  ) => void;
  onAddSyllabusTopicsBulk?: (
    classId: string,
    subjectId: string,
    items: { title: string; hours: number; color: string }[]
  ) => void;
  onToggleSyllabusTopic: (topicId: string) => void;
  onReorderSyllabusTopic: (
    classId: string,
    subjectId: string,
    sourceTopicId: string,
    targetTopicId: string
  ) => void;
  onUpdateSyllabusTopic: (topic: SyllabusTopic) => void;
  onDeleteSyllabusTopic: (topicId: string) => void;
  onCreateReadyTopic?: (
    subjectId: string,
    title: string,
    hours: number,
    color: string
  ) => void;
  onDeleteReadyTopic?: (topicId: string) => void;
}

const COLORS = [
  '#7B2276',
  '#1D70B8',
  '#76A815',
  '#D97706',
  '#B81D6B',
  '#0D9488',
  '#4F46E5',
  '#DC2626',
];

export const SyllabusView: React.FC<SyllabusViewProps> = ({
  journal,
  userRole,
  canEditOverride,
  onAddSyllabusTopic,
  onAddSyllabusTopicsBulk,
  onToggleSyllabusTopic,
  onReorderSyllabusTopic,
  onUpdateSyllabusTopic,
  onDeleteSyllabusTopic,
  onCreateReadyTopic,
  onDeleteReadyTopic,
}) => {
  const canEdit = canEditOverride ?? (userRole === 'teacher' || userRole === 'director');
  const [selectedClass, setSelectedClass] = useState(journal.classes[0]?.id ?? '3B');
  const [selectedSubject, setSelectedSubject] = useState(journal.subjects[0]?.id ?? 'mat');
  const [newTitle, setNewTitle] = useState('');
  const [newHours, setNewHours] = useState(2);
  const [newColor, setNewColor] = useState('#7B2276');

  const [dragTopicId, setDragTopicId] = useState<string | null>(null);
  const [hoverTopicId, setHoverTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<SyllabusTopic | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [readyTitle, setReadyTitle] = useState('');
  const [readyHours, setReadyHours] = useState(2);
  const [readyColor, setReadyColor] = useState('#7B2276');

  useEffect(() => {
    if (journal.classes.length > 0 && !journal.classes.some((c) => c.id === selectedClass)) {
      setSelectedClass(journal.classes[0].id);
    }
  }, [journal.classes, selectedClass]);

  useEffect(() => {
    if (journal.subjects.length > 0 && !journal.subjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(journal.subjects[0].id);
    }
  }, [journal.subjects, selectedSubject]);

  const currentSubjectName =
    journal.subjects.find((s) => s.id === selectedSubject)?.name ?? '';

  const readyTopics = (journal.readyTopics ?? []).filter(
    (rt) => rt.subjectId === selectedSubject
  );

  const topics = journal.syllabusTopics
    .filter((t) => t.classId === selectedClass && t.subjectId === selectedSubject)
    .sort((a, b) => a.order - b.order);

  const totalHours = topics.reduce((sum, t) => sum + t.hours, 0);
  const doneHours = topics.filter((t) => t.completed).reduce((sum, t) => sum + t.hours, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddSyllabusTopic(selectedClass, selectedSubject, newTitle.trim(), newHours, newColor);
    setNewTitle('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editingTopic.title.trim()) return;
    onUpdateSyllabusTopic({
      ...editingTopic,
      title: editingTopic.title.trim(),
    });
    setEditingTopic(null);
  };

  const moveByStep = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= topics.length) return;
    onReorderSyllabusTopic(
      selectedClass,
      selectedSubject,
      topics[index].id,
      topics[targetIdx].id
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <BookMarked className="w-5 h-5 text-[#7B2276]" />
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Rozkłady materiału nauczania
            </h1>
            <p className="text-xs text-slate-500">
              Tematy lekcji przypisane do klasy i przedmiotu — przeciągaj wiersze, aby zmieniać kolejność
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold text-slate-800"
          >
            {journal.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Klasa {cls.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded font-medium text-slate-800"
          >
            {journal.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="text-xs font-mono text-slate-600 tabular-nums">
            Realizacja: <strong>{doneHours}</strong> / {totalHours} godz.
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border inline-flex items-center gap-1.5 cursor-pointer ${
                showTemplates
                  ? 'bg-[#7B2276] text-white border-[#7B2276]'
                  : 'bg-white text-[#7B2276] border-[#7B2276]/40 hover:bg-[#F5EEF8]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Gotowe tematy ({readyTopics.length})</span>
            </button>
          )}
        </div>
      </div>

      {canEdit && showTemplates && (
        <div className="p-4 bg-[#F8F1F8] border border-[#D8BFE2] rounded space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[#521F61]">
                Gotowe tematy z kolorem — {currentSubjectName || 'Przedmiot'}
              </div>
              <div className="text-[11px] text-slate-600">
                Utwórz własne gotowe tematy z kolorem, a następnie kliknij wybrany temat, aby przypisać go do klasy {selectedClass}
              </div>
            </div>
            {readyTopics.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onAddSyllabusTopicsBulk) {
                    onAddSyllabusTopicsBulk(
                      selectedClass,
                      selectedSubject,
                      readyTopics.map((rt) => ({
                        title: rt.title,
                        hours: rt.hours,
                        color: rt.color || newColor,
                      }))
                    );
                  } else {
                    readyTopics.forEach((rt) => {
                      if (!topics.some((t) => t.title === rt.title)) {
                        onAddSyllabusTopic(
                          selectedClass,
                          selectedSubject,
                          rt.title,
                          rt.hours,
                          rt.color || newColor
                        );
                      }
                    });
                  }
                }}
                className="px-3 py-1.5 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Dodaj wszystkie gotowe ({readyTopics.length})
              </button>
            )}
          </div>

          <div className="p-3 bg-white border border-[#D8BFE2] rounded grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end">
            <div className="lg:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nazwa gotowego tematu
              </label>
              <input
                type="text"
                value={readyTitle}
                onChange={(e) => setReadyTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (readyTitle.trim() && onCreateReadyTopic) {
                      onCreateReadyTopic(selectedSubject, readyTitle.trim(), readyHours, readyColor);
                      setReadyTitle('');
                    }
                  }
                }}
                placeholder="np. Równania liniowe — wprowadzenie"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Godz.</label>
              <input
                type="number"
                min={1}
                max={10}
                value={readyHours}
                onChange={(e) => setReadyHours(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Kolor tematu
              </label>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2 py-1">
                {COLORS.slice(0, 5).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setReadyColor(col)}
                    className={`w-4 h-4 rounded-full cursor-pointer ${
                      readyColor === col ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
                <input
                  type="color"
                  value={readyColor}
                  onChange={(e) => setReadyColor(e.target.value)}
                  className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer ml-auto"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={() => {
                  if (!readyTitle.trim() || !onCreateReadyTopic) return;
                  onCreateReadyTopic(selectedSubject, readyTitle.trim(), readyHours, readyColor);
                  setReadyTitle('');
                }}
                className="w-full px-3 py-1.5 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Zapisz gotowy</span>
              </button>
            </div>
          </div>

          {readyTopics.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-600 bg-white/80 border border-dashed border-[#D8BFE2] rounded">
              Brak gotowych tematów dla tego przedmiotu. Utwórz swój pierwszy gotowy temat z kolorem powyżej.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1 flex flex-wrap gap-2">
              {readyTopics.map((rt) => {
                const exists = topics.some((t) => t.title === rt.title);
                return (
                  <div
                    key={rt.id}
                    className={`inline-flex items-center rounded border text-xs font-medium overflow-hidden ${
                      exists
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-300 text-slate-800 hover:border-[#7B2276]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!exists) {
                          onAddSyllabusTopic(
                            selectedClass,
                            selectedSubject,
                            rt.title,
                            rt.hours,
                            rt.color || newColor
                          );
                        }
                      }}
                      className="px-2.5 py-1.5 inline-flex items-center gap-1.5 text-left cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: rt.color || '#7B2276' }}
                      />
                      <span>
                        {exists ? `✓ ${rt.title}` : `+ ${rt.title}`} ({rt.hours}h)
                      </span>
                    </button>
                    {onDeleteReadyTopic && (
                      <button
                        type="button"
                        onClick={() => onDeleteReadyTopic(rt.id)}
                        title="Usuń gotowy temat"
                        className="px-1.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-l border-slate-200 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
        >
          <div className="lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Temat dla klasy {selectedClass}
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Wpisz temat z podstawy programowej..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Liczba godz.</label>
            <input
              type="number"
              min={1}
              max={10}
              value={newHours}
              onChange={(e) => setNewHours(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" />
              <span>Kolor tematu</span>
            </label>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2 py-1.5">
              {COLORS.slice(0, 5).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewColor(col)}
                  className={`w-5 h-5 rounded-full cursor-pointer ${
                    newColor === col ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer ml-auto"
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj temat</span>
            </button>
          </div>
        </form>
      )}

      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              {canEdit && <th className="py-2.5 px-2 w-10 text-center" />}
              <th className="py-2.5 px-4 w-16">Lp.</th>
              <th className="py-2.5 px-4">Temat rozkładu materiału</th>
              <th className="py-2.5 px-4 w-28 text-right">Wymiar godz.</th>
              <th className="py-2.5 px-4 w-36 text-center">Status realizacji</th>
              {canEdit && <th className="py-2.5 px-4 w-32 text-right">Akcje</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topics.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 4} className="p-8 text-center text-sm text-slate-500">
                  Brak zdefiniowanych tematów rozkładu dla klasy {selectedClass} i wybranego przedmiotu.
                </td>
              </tr>
            ) : (
              topics.map((t, idx) => (
                <tr
                  key={t.id}
                  draggable={canEdit}
                  onDragStart={() => setDragTopicId(t.id)}
                  onDragEnd={() => {
                    setDragTopicId(null);
                    setHoverTopicId(null);
                  }}
                  onDragOver={(e) => {
                    if (canEdit && dragTopicId) {
                      e.preventDefault();
                      setHoverTopicId(t.id);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (canEdit && dragTopicId && dragTopicId !== t.id) {
                      onReorderSyllabusTopic(selectedClass, selectedSubject, dragTopicId, t.id);
                    }
                    setDragTopicId(null);
                    setHoverTopicId(null);
                  }}
                  className={`transition-colors ${
                    hoverTopicId === t.id && dragTopicId !== t.id
                      ? 'bg-[#F5EEF8] ring-2 ring-inset ring-[#7B2276]'
                      : 'hover:bg-slate-50'
                  } ${dragTopicId === t.id ? 'opacity-40' : ''}`}
                >
                  {canEdit && (
                    <td className="py-3 px-2 text-center cursor-grab active:cursor-grabbing text-slate-400">
                      <GripVertical className="w-4 h-4 mx-auto" />
                    </td>
                  )}
                  <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                    {t.order}.
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div className="inline-flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color || '#7B2276' }}
                      />
                      <span>{t.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {t.hours} godz.
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => canEdit && onToggleSyllabusTopic(t.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        t.completed ? 'text-emerald-700' : 'text-slate-500'
                      } ${canEdit ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                    >
                      {t.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{t.completed ? 'Zrealizowany' : 'Planowany'}</span>
                    </button>
                  </td>
                  {canEdit && (
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveByStep(idx, -1)}
                          title="Przenieś wyżej"
                          className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === topics.length - 1}
                          onClick={() => moveByStep(idx, 1)}
                          title="Przenieś niżej"
                          className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTopic({ ...t })}
                          title="Edytuj temat"
                          className="p-1 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSyllabusTopic(t.id)}
                          title="Usuń temat"
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingTopic && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">Edytuj temat</h2>
              <button
                type="button"
                onClick={() => setEditingTopic(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5 mt-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tytuł tematu
                </label>
                <input
                  type="text"
                  required
                  value={editingTopic.title}
                  onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wymiar godzin
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingTopic.hours}
                    onChange={(e) =>
                      setEditingTopic({ ...editingTopic, hours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kolor</label>
                  <div className="flex items-center gap-1.5 border border-slate-300 rounded px-2 py-1.5">
                    {COLORS.slice(0, 4).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setEditingTopic({ ...editingTopic, color: col })}
                        className={`w-5 h-5 rounded-full cursor-pointer ${
                          editingTopic.color === col ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editingTopic.color}
                      onChange={(e) => setEditingTopic({ ...editingTopic, color: e.target.value })}
                      className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer ml-auto"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

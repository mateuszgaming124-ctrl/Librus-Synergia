import React, { useMemo, useState } from 'react';
import { CalendarDays, Edit3, Plus, Trash2, X } from 'lucide-react';
import { CalendarCategory, CalendarEvent, JournalState, UserAccount, UserRole } from '../types/journal';
import { formatDatePl } from '../utils/grades';
import { getRoleLabel } from '../utils/permissions';

interface CalendarViewProps {
  journal: JournalState;
  userRole: UserRole;
  accounts?: UserAccount[];
  canEditOverride?: boolean;
  onAddCalendarEvent: (
    date: string,
    title: string,
    subject: string,
    category: CalendarCategory,
    description: string,
    lessonNumber?: number,
    teacher?: string
  ) => void;
  onUpdateCalendarEvent: (ev: CalendarEvent) => void;
  onDeleteCalendarEvent: (id: string) => void;
}

const NOVEMBER_DAYS = Array.from({ length: 30 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  return `2026-11-${day}`;
});
const LEADING_EMPTY_CELLS = 6;

export const CalendarView: React.FC<CalendarViewProps> = ({
  journal,
  userRole,
  accounts = [],
  canEditOverride,
  onAddCalendarEvent,
  onUpdateCalendarEvent,
  onDeleteCalendarEvent,
}) => {
  const canEdit = canEditOverride ?? (userRole === 'director' || userRole === 'teacher');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CalendarCategory>('all');
  const [modalEvent, setModalEvent] = useState<{
    existing?: CalendarEvent;
    date: string;
    title: string;
    subject: string;
    category: CalendarCategory;
    description: string;
    teacher: string;
  } | null>(null);

  const personOptions = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => {
      map.set(a.fullName, `${a.fullName} (login: ${a.login} · ${getRoleLabel(a.role)})`);
    });
    journal.subjects.forEach((s) => {
      if (!map.has(s.teacher)) map.set(s.teacher, `${s.teacher} (${s.name})`);
    });
    journal.classes.forEach((c) => {
      if (!map.has(c.homeroomTeacher)) {
        map.set(c.homeroomTeacher, `${c.homeroomTeacher} (Wych. ${c.name})`);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [accounts, journal.subjects, journal.classes]);

  const [dragEventId, setDragEventId] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return journal.calendarEvents
      .filter((e) => categoryFilter === 'all' || e.category === categoryFilter)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [journal.calendarEvents, categoryFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [filteredEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEvent || !modalEvent.title.trim()) return;
    if (modalEvent.existing) {
      onUpdateCalendarEvent({
        ...modalEvent.existing,
        date: modalEvent.date,
        title: modalEvent.title.trim(),
        subject: modalEvent.subject,
        category: modalEvent.category,
        description: modalEvent.description.trim(),
        teacher: modalEvent.teacher.trim() || modalEvent.existing.teacher,
      });
    } else {
      onAddCalendarEvent(
        modalEvent.date,
        modalEvent.title.trim(),
        modalEvent.subject,
        modalEvent.category,
        modalEvent.description.trim(),
        undefined,
        modalEvent.teacher.trim() || undefined
      );
    }
    setModalEvent(null);
  };

  const handleDropOnDate = (targetDate: string) => {
    setHoverDate(null);
    if (!canEdit || !dragEventId) return;
    const ev = journal.calendarEvents.find((c) => c.id === dragEventId);
    if (ev && ev.date !== targetDate) {
      onUpdateCalendarEvent({ ...ev, date: targetDate });
    }
    setDragEventId(null);
  };

  return (
    <div className="space-y-5">
      <section className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">Terminarz — Listopad 2026</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sprawdziany, kartkówki i wydarzenia{canEdit ? ' · Przeciągnij wpis na inny dzień w kalendarzu, aby go przenieść' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded">
            {(['all', 'Sprawdzian', 'Kartkówka', 'Wydarzenie', 'Dzień wolny'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                  categoryFilter === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {cat === 'all' ? 'Wszystkie' : cat}
              </button>
            ))}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() =>
                setModalEvent({
                  date: '2026-11-26',
                  title: '',
                  subject: journal.subjects[0]?.name ?? 'Matematyka',
                  category: 'Sprawdzian',
                  description: '',
                  teacher: personOptions[0]?.value ?? '',
                })
              }
              className="px-3.5 py-1.5 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj wpis</span>
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 border border-slate-200 rounded overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 text-center">
            {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {Array.from({ length: LEADING_EMPTY_CELLS }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[82px] bg-slate-50/50" />
            ))}
            {NOVEMBER_DAYS.map((dateStr) => {
              const dayNum = Number(dateStr.split('-')[2]);
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isToday = dateStr === '2026-11-20';
              const isDropTarget = canEdit && hoverDate === dateStr && dragEventId !== null;
              return (
                <div
                  key={dateStr}
                  onDragOver={(e) => {
                    if (canEdit && dragEventId) {
                      e.preventDefault();
                      setHoverDate(dateStr);
                    }
                  }}
                  onDragLeave={() => hoverDate === dateStr && setHoverDate(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnDate(dateStr);
                  }}
                  className={`min-h-[82px] p-1.5 transition-colors ${
                    isDropTarget
                      ? 'bg-[#EADBF0] ring-2 ring-inset ring-[#7B2276]'
                      : isToday
                        ? 'bg-[#F8F1F8]'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div
                      className={`text-xs font-mono tabular-nums ${
                        isToday
                          ? 'inline-flex items-center justify-center w-6 h-6 rounded bg-[#7B2276] text-white font-bold'
                          : 'text-slate-500 px-1'
                      }`}
                    >
                      {dayNum}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalEvent({
                            date: dateStr,
                            title: '',
                            subject: journal.subjects[0]?.name ?? 'Matematyka',
                            category: 'Sprawdzian',
                            description: '',
                            teacher: personOptions[0]?.value ?? '',
                          })
                        }
                        title={`Dodaj wpis na ${formatDatePl(dateStr)}`}
                        className="w-5 h-5 rounded text-slate-400 hover:text-[#7B2276] hover:bg-[#F5EEF8] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        draggable={canEdit}
                        onDragStart={() => canEdit && setDragEventId(ev.id)}
                        onDragEnd={() => {
                          setDragEventId(null);
                          setHoverDate(null);
                        }}
                        onClick={() =>
                          canEdit &&
                          setModalEvent({
                            existing: ev,
                            date: ev.date,
                            title: ev.title,
                            subject: ev.subject ?? (journal.subjects[0]?.name ?? 'Matematyka'),
                            category: ev.category,
                            description: ev.description,
                            teacher: ev.teacher ?? '',
                          })
                        }
                        title={`${ev.category}: ${ev.title}${canEdit ? ' (przeciągnij, aby przenieść lub kliknij, aby edytować / usunąć)' : ''}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${
                          canEdit ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${
                          ev.category === 'Sprawdzian'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : ev.category === 'Kartkówka'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : ev.category === 'Dzień wolny'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-purple-50 text-[#521F61] border-purple-200'
                        }`}
                      >
                        {ev.subject ? ev.subject : ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="xl:col-span-5 border border-slate-200 rounded overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#7B2276]" />
            <h2 className="font-display text-sm font-bold text-slate-900">
              Zaplanowane wpisy ({filteredEvents.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Brak zaplanowanych wydarzeń.
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div key={ev.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {formatDatePl(ev.date)}
                      </span>
                      <span
                        className={`font-semibold ${
                          ev.category === 'Sprawdzian'
                            ? 'text-rose-700'
                            : ev.category === 'Kartkówka'
                              ? 'text-amber-700'
                              : 'text-[#7B2276]'
                        }`}
                      >
                        {ev.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {ev.subject ? `${ev.subject}: ${ev.title}` : ev.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">{ev.description}</p>
                    <div className="text-[11px] text-slate-400 mt-1.5">{ev.teacher}</div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setModalEvent({
                            existing: ev,
                            date: ev.date,
                            title: ev.title,
                            subject: ev.subject ?? (journal.subjects[0]?.name ?? 'Matematyka'),
                            category: ev.category,
                            description: ev.description,
                            teacher: ev.teacher ?? '',
                          })
                        }
                        title="Edytuj / przenieś"
                        className="px-2 py-1 text-xs font-semibold text-[#7B2276] hover:bg-[#F5EEF8] rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edytuj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCalendarEvent(ev.id)}
                        title="Usuń wydarzenie"
                        className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usuń</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {modalEvent && canEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                {modalEvent.existing ? 'Edytuj wpis w terminarzu' : 'Dodaj wpis do terminarza'}
              </h2>
              <button
                type="button"
                onClick={() => setModalEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={modalEvent.date}
                    onChange={(e) => setModalEvent({ ...modalEvent, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategoria
                  </label>
                  <select
                    value={modalEvent.category}
                    onChange={(e) =>
                      setModalEvent({
                        ...modalEvent,
                        category: e.target.value as CalendarCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  >
                    <option value="Sprawdzian">Sprawdzian</option>
                    <option value="Kartkówka">Kartkówka</option>
                    <option value="Wydarzenie">Wydarzenie</option>
                    <option value="Dzień wolny">Dzień wolny</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Przedmiot</label>
                <select
                  value={modalEvent.subject}
                  onChange={(e) => setModalEvent({ ...modalEvent, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  <option value="">Brak (wydarzenie ogólne)</option>
                  {journal.subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  required
                  value={modalEvent.title}
                  onChange={(e) => setModalEvent({ ...modalEvent, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Osoba prowadząca / Login
                </label>
                <select
                  value={modalEvent.teacher}
                  onChange={(e) => setModalEvent({ ...modalEvent, teacher: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  <option value="">— Wybierz osobę / login z listy —</option>
                  {personOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {modalEvent.teacher &&
                    !personOptions.some((p) => p.value === modalEvent.teacher) && (
                      <option value={modalEvent.teacher}>{modalEvent.teacher}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opis</label>
                <textarea
                  rows={3}
                  value={modalEvent.description}
                  onChange={(e) => setModalEvent({ ...modalEvent, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                {modalEvent.existing ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCalendarEvent(modalEvent.existing!.id);
                      setModalEvent(null);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Usuń wpis</span>
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalEvent(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                  >
                    {modalEvent.existing ? 'Zapisz zmiany' : 'Zapisz wpis'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

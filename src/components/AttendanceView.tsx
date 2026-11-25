import React, { useMemo, useState } from 'react';
import { CheckSquare, Edit3, FileCheck2, Info, Plus, Trash2, X } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, JournalState, UserRole } from '../types/journal';
import { formatDatePl, getAttendanceMeta, WEEKDAYS_PL } from '../utils/grades';

interface AttendanceViewProps {
  journal: JournalState;
  userRole: UserRole;
  canEditAttendance?: boolean;
  onExcuseAbsences: (recordIds: string[], excuseNote: string) => void;
  onSaveAttendanceRecord?: (record: AttendanceRecord) => void;
  onDeleteAttendanceRecord?: (id: string) => void;
}

const WEEK_DATES = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  journal,
  userRole,
  canEditAttendance,
  onExcuseAbsences,
  onSaveAttendanceRecord,
  onDeleteAttendanceRecord,
}) => {
  const canEdit = canEditAttendance ?? (userRole === 'director' || userRole === 'teacher');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('ob');
  const [editSubject, setEditSubject] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editExcuseNote, setEditExcuseNote] = useState('');
  const [selectedForExcuse, setSelectedForExcuse] = useState<string[]>([]);
  const [excuseReason, setExcuseReason] = useState('Choroba / złe samopoczucie — usprawiedliwienie rodzica');
  const [showExcuseModal, setShowExcuseModal] = useState(false);

  const openRecordModal = (rec: AttendanceRecord, startInEdit = false) => {
    setSelectedRecord(rec);
    setEditStatus(rec.status);
    setEditSubject(rec.subjectName);
    setEditTopic(rec.topic);
    setEditExcuseNote(rec.excuseNote ?? '');
    setIsEditingRecord(startInEdit);
  };

  const counts = useMemo(() => {
    const map: Record<AttendanceStatus, number> = { ob: 0, nb: 0, u: 0, sp: 0, zw: 0 };
    for (const r of journal.attendance) {
      map[r.status] += 1;
    }
    return map;
  }, [journal.attendance]);

  const total = journal.attendance.length;
  const presentTotal = counts.ob + counts.sp + counts.zw;
  const percentage = total > 0 ? (presentTotal / total) * 100 : 100;

  const subjectSummary = useMemo(() => {
    const map = new Map<
      string,
      { subject: string; total: number; ob: number; nb: number; u: number; sp: number; zw: number }
    >();
    for (const r of journal.attendance) {
      const entry = map.get(r.subjectName) ?? {
        subject: r.subjectName,
        total: 0,
        ob: 0,
        nb: 0,
        u: 0,
        sp: 0,
        zw: 0,
      };
      entry.total += 1;
      entry[r.status] += 1;
      map.set(r.subjectName, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [journal.attendance]);

  const unexcusedList = useMemo(
    () => journal.attendance.filter((a) => a.status === 'nb'),
    [journal.attendance]
  );

  const toggleExcuseId = (id: string) => {
    setSelectedForExcuse((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExcuseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedForExcuse.length === 0) return;
    onExcuseAbsences(selectedForExcuse, excuseReason.trim() || 'Usprawiedliwiono przez rodzica');
    setSelectedForExcuse([]);
    setShowExcuseModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI stats */}
      <section className="bg-white border border-[#CFD5DC] rounded-[2px] p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900">Frekwencja</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Zestawienie obecności, spóźnień oraz nieobecności ucznia
            </p>
          </div>

          {userRole === 'parent' && unexcusedList.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (selectedForExcuse.length === 0) {
                  setSelectedForExcuse(unexcusedList.map((u) => u.id));
                }
                setShowExcuseModal(true);
              }}
              className="px-3.5 py-2 bg-[#8D2877] hover:bg-[#6E1F5E] text-white text-xs font-semibold rounded-[2px] flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Usprawiedliw nieobecności ({unexcusedList.length})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-200">
          <div className="p-2.5 rounded-[2px] bg-[#F8F9FB] border border-[#CFD5DC]">
            <div className="text-[11px] text-slate-500">Frekwencja</div>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {percentage.toFixed(1).replace('.', ',')}%
            </div>
          </div>
          <div className="p-2.5 rounded-[2px] bg-emerald-50/70 border border-emerald-300">
            <div className="text-[11px] text-emerald-800">Obecności (ob)</div>
            <div className="font-mono text-xl font-bold text-emerald-900 tabular-nums mt-0.5">
              {counts.ob}
            </div>
          </div>
          <div className="p-2.5 rounded-[2px] bg-rose-50/70 border border-rose-300">
            <div className="text-[11px] text-rose-800">Nieusprawiedl. (nb)</div>
            <div className="font-mono text-xl font-bold text-rose-900 tabular-nums mt-0.5">
              {counts.nb}
            </div>
          </div>
          <div className="p-2.5 rounded-[2px] bg-sky-50/70 border border-sky-300">
            <div className="text-[11px] text-sky-800">Usprawiedl. (u)</div>
            <div className="font-mono text-xl font-bold text-sky-900 tabular-nums mt-0.5">
              {counts.u}
            </div>
          </div>
          <div className="p-2.5 rounded-[2px] bg-amber-50/70 border border-amber-300">
            <div className="text-[11px] text-amber-800">Spóźnienia (sp)</div>
            <div className="font-mono text-xl font-bold text-amber-900 tabular-nums mt-0.5">
              {counts.sp}
            </div>
          </div>
          <div className="p-2.5 rounded-[2px] bg-[#F8F9FB] border border-[#CFD5DC]">
            <div className="text-[11px] text-slate-600">Zwolnienia (zw)</div>
            <div className="font-mono text-xl font-bold text-slate-800 tabular-nums mt-0.5">
              {counts.zw}
            </div>
          </div>
        </div>
      </section>

      {/* Weekly attendance matrix */}
      <section className="bg-white border border-[#CFD5DC] rounded-[2px] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#EFF2F5] border-b border-[#CFD5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Siatka obecności — tydzień 16.11–20.11.2026
          </h2>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start overflow-x-auto max-w-full">
            {(['all', 'nb', 'u', 'sp', 'zw'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'Wszystkie' : st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-44">Dzień tygodnia</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <th key={num} className="py-3 px-2 text-center font-mono tabular-nums">
                    L{num}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {WEEK_DATES.map((dateStr, idx) => {
                const dayRecords = journal.attendance.filter((a) => a.date === dateStr);
                return (
                  <tr key={dateStr} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{WEEKDAYS_PL[idx]}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {formatDatePl(dateStr)}
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((lessonNum) => {
                      const rec = dayRecords.find((r) => r.lessonNumber === lessonNum);
                      if (!rec) {
                        return (
                          <td key={lessonNum} className="py-3 px-2 text-center text-slate-300">
                            {canEdit && onSaveAttendanceRecord ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openRecordModal(
                                    {
                                      id: `att-${dateStr}-${lessonNum}-${Date.now()}`,
                                      date: dateStr,
                                      lessonNumber: lessonNum,
                                      subjectName: journal.subjects[0]?.name ?? 'Matematyka',
                                      teacher: journal.subjects[0]?.teacher ?? 'Nauczyciel',
                                      status: 'ob',
                                      topic: '',
                                    },
                                    true
                                  )
                                }
                                title={`Dodaj frekwencję (${formatDatePl(dateStr)}, L${lessonNum})`}
                                className="w-8 h-8 rounded border border-dashed border-slate-200 text-slate-400 hover:text-[#7B2276] hover:border-[#7B2276] inline-flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            ) : (
                              '·'
                            )}
                          </td>
                        );
                      }
                      const dimmed = statusFilter !== 'all' && rec.status !== statusFilter;
                      const meta = getAttendanceMeta(rec.status);
                      return (
                        <td key={lessonNum} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => openRecordModal(rec, false)}
                            title={`${rec.subjectName} — ${meta.label}${canEdit ? ' (kliknij, aby edytować lub usunąć)' : ''}`}
                            className={`w-10 h-9 rounded-md border font-mono text-xs transition-opacity cursor-pointer ${
                              meta.className
                            } ${dimmed ? 'opacity-25' : 'opacity-100'}`}
                          >
                            {meta.short}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Kliknij oznaczenie w tabeli, aby zobaczyć temat lekcji i szczegóły
            {canEdit ? ' lub edytować / usunąć wpis frekwencji' : ''}.
          </span>
          {userRole !== 'parent' && unexcusedList.length > 0 && (
            <span className="text-slate-500">
              Usprawiedliwianie nieobecności jest aktywne na koncie Rodzica.
            </span>
          )}
        </div>
      </section>

      {/* Unexcused absences quick list (for parent or student visibility) */}
      {unexcusedList.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Nieobecności wymagające usprawiedliwienia ({unexcusedList.length})
            </h2>
            {userRole === 'parent' && (
              <button
                type="button"
                onClick={() => {
                  if (selectedForExcuse.length === 0) {
                    setSelectedForExcuse(unexcusedList.map((u) => u.id));
                  }
                  setShowExcuseModal(true);
                }}
                className="text-xs font-semibold text-[#6E2C81] hover:underline cursor-pointer"
              >
                Usprawiedliw zaznaczone
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {unexcusedList.map((rec) => {
              const checked = selectedForExcuse.includes(rec.id);
              return (
                <div
                  key={rec.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {userRole === 'parent' && (
                      <button
                        type="button"
                        onClick={() => toggleExcuseId(rec.id)}
                        aria-label={`Zaznacz lekcję ${rec.subjectName}`}
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                          checked
                            ? 'bg-[#6E2C81] border-[#6E2C81] text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {checked && <CheckSquare className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{rec.subjectName}</div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{formatDatePl(rec.date)}</span> ·
                        lekcja {rec.lessonNumber} · {rec.teacher}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded border text-xs font-mono bg-rose-50 text-rose-800 border-rose-300 font-semibold shrink-0">
                    nb
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Breakdown by subject */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Podsumowanie według przedmiotów
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Przedmiot</th>
                <th className="py-3 px-3 text-right">Lekcje</th>
                <th className="py-3 px-3 text-right">ob</th>
                <th className="py-3 px-3 text-right">nb</th>
                <th className="py-3 px-3 text-right">u</th>
                <th className="py-3 px-3 text-right">sp</th>
                <th className="py-3 px-4 text-right">Frekwencja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {subjectSummary.map((row) => {
                const pct =
                  row.total > 0 ? ((row.ob + row.sp + row.zw) / row.total) * 100 : 100;
                return (
                  <tr key={row.subject} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">{row.subject}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {row.total}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {row.ob}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-rose-700 font-semibold">
                      {row.nb}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-700">
                      {row.u}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700">
                      {row.sp}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {pct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail / Edit / Delete modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  {formatDatePl(selectedRecord.date)} · lekcja {selectedRecord.lessonNumber}
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {isEditingRecord ? 'Edycja frekwencji' : selectedRecord.subjectName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isEditingRecord ? (
              <>
                <div className="py-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-slate-900">
                      {getAttendanceMeta(selectedRecord.status).label} ({selectedRecord.status})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nauczyciel:</span>
                    <span className="text-slate-900">{selectedRecord.teacher}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Temat lekcji</div>
                    <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      {selectedRecord.topic || 'Brak tematu'}
                    </p>
                  </div>
                  {selectedRecord.excuseNote && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Adnotacja usprawiedliwienia</div>
                      <p className="text-sky-900 bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs">
                        {selectedRecord.excuseNote}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      {onSaveAttendanceRecord && (
                        <button
                          type="button"
                          onClick={() => setIsEditingRecord(true)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#7B2276] bg-[#F8F1F8] hover:bg-[#EADBF0] rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edytuj</span>
                        </button>
                      )}
                      {onDeleteAttendanceRecord && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteAttendanceRecord(selectedRecord.id);
                            setSelectedRecord(null);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Usuń</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#6E2C81] hover:bg-[#5B216D] rounded-lg cursor-pointer"
                  >
                    Zamknij
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!onSaveAttendanceRecord) return;
                  const updated: AttendanceRecord = {
                    ...selectedRecord,
                    status: editStatus,
                    subjectName: editSubject,
                    topic: editTopic.trim() || 'Lekcja',
                    excuseNote: editExcuseNote.trim() || undefined,
                  };
                  onSaveAttendanceRecord(updated);
                  setSelectedRecord(updated);
                  setIsEditingRecord(false);
                }}
                className="space-y-3.5 mt-4 text-sm"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Przedmiot
                  </label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['ob', 'nb', 'u', 'sp', 'zw'] as AttendanceStatus[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setEditStatus(code)}
                        className={`py-2 rounded font-mono text-xs font-bold border cursor-pointer ${
                          editStatus === code
                            ? 'bg-[#7B2276] text-white border-[#7B2276]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temat lekcji
                  </label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adnotacja (opcjonalnie)
                  </label>
                  <input
                    type="text"
                    value={editExcuseNote}
                    onChange={(e) => setEditExcuseNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingRecord(false)}
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
            )}
          </div>
        </div>
      )}

      {/* Parent excuse modal */}
      {showExcuseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-lg">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Usprawiedliwienie nieobecności
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Liczba wybranych godzin lekcyjnych:{' '}
              <span className="font-mono font-semibold">{selectedForExcuse.length}</span>
            </p>
            <form onSubmit={handleExcuseSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Powód nieobecności (widoczny dla wychowawcy)
                </label>
                <textarea
                  rows={3}
                  required
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6E2C81]/25 focus:border-[#6E2C81]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExcuseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#6E2C81] hover:bg-[#5B216D] rounded-lg cursor-pointer"
                >
                  Zatwierdź usprawiedliwienie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

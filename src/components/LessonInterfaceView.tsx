import React, { useMemo, useState } from 'react';
import { Bell, BookOpen, CheckCircle2, Palette, Star } from 'lucide-react';
import { AttendanceStatus, JournalState, UserAccount } from '../types/journal';
import { formatDatePl, getLessonHoursForClass } from '../utils/grades';
import { getEffectivePermissions, isStaffRole } from '../utils/permissions';

export interface LessonDraft {
  classId: string;
  lessonNumber: number;
  subjectId: string;
  topic?: string;
  color?: string;
  syllabusTopicId?: string;
}

interface LessonInterfaceViewProps {
  journal: JournalState;
  user: UserAccount;
  initialDraft?: LessonDraft | null;
  onLogLesson: (
    classId: string,
    date: string,
    lessonNumber: number,
    subjectName: string,
    topic: string,
    statusForJan: AttendanceStatus,
    color?: string,
    syllabusTopicId?: string
  ) => void;
}

const TOPIC_COLORS = [
  '#7B2276',
  '#1D70B8',
  '#76A815',
  '#D97706',
  '#B81D6B',
  '#0D9488',
  '#4F46E5',
  '#DC2626',
];

export const LessonInterfaceView: React.FC<LessonInterfaceViewProps> = ({
  journal,
  user,
  initialDraft,
  onLogLesson,
}) => {
  const perms = getEffectivePermissions(user);
  const canTeach =
    isStaffRole(user.role) ||
    perms.editAttendance ||
    perms.editTimetable;
  const [selectedClassId, setSelectedClassId] = useState(
    initialDraft?.classId ?? journal.classes[0]?.id ?? '3B'
  );
  const [lessonDate, setLessonDate] = useState('2026-11-20');
  const [lessonNumber, setLessonNumber] = useState(initialDraft?.lessonNumber ?? 3);
  const [subjectId, setSubjectId] = useState(
    initialDraft?.subjectId ?? journal.subjects[0]?.id ?? 'mat'
  );
  const [selectedSyllabusId, setSelectedSyllabusId] = useState(
    initialDraft?.syllabusTopicId ?? ''
  );
  const [topic, setTopic] = useState(initialDraft?.topic ?? '');
  const [topicColor, setTopicColor] = useState(initialDraft?.color ?? '#7B2276');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const activeClass = useMemo(
    () =>
      journal.classes.find((c) => c.id === selectedClassId) ??
      journal.classes[0] ?? {
        id: '3B',
        name: '3B',
        homeroomTeacher: 'mgr Piotr Nowak',
        students: journal.classRoster,
      },
    [journal.classes, journal.classRoster, selectedClassId]
  );

  const activeLessonHours = getLessonHoursForClass(journal, activeClass.id);

  const incomingTempTransfers = useMemo(
    () =>
      (journal.temporaryTransfers ?? []).filter(
        (t) =>
          t.date === lessonDate &&
          (t.toClassId.toLowerCase() === activeClass.id.toLowerCase() ||
            t.toClassId.toLowerCase() === activeClass.name.toLowerCase())
      ),
    [journal.temporaryTransfers, lessonDate, activeClass.id, activeClass.name]
  );

  const outgoingTempTransfers = useMemo(
    () =>
      (journal.temporaryTransfers ?? []).filter(
        (t) =>
          t.date === lessonDate &&
          (t.fromClassId.toLowerCase() === activeClass.id.toLowerCase() ||
            t.fromClassId.toLowerCase() === activeClass.name.toLowerCase())
      ),
    [journal.temporaryTransfers, lessonDate, activeClass.id, activeClass.name]
  );

  const [rosterStatuses, setRosterStatuses] = useState<Record<string, AttendanceStatus>>({});

  const subjectObj = journal.subjects.find((s) => s.id === subjectId);
  const subjectSyllabus = journal.syllabusTopics.filter(
    (t) => t.classId === activeClass.id && t.subjectId === subjectId
  );
  const readyTopics = useMemo(
    () => (journal.readyTopics ?? []).filter((rt) => rt.subjectId === subjectId),
    [journal.readyTopics, subjectId]
  );

  const handleSelectSyllabus = (sylId: string) => {
    if (sylId.startsWith('rt::')) {
      const rtId = sylId.slice(4);
      const rt = readyTopics.find((t) => t.id === rtId);
      setSelectedSyllabusId(sylId);
      if (rt) {
        setTopic(rt.title);
        if (rt.color) setTopicColor(rt.color);
      }
      return;
    }
    setSelectedSyllabusId(sylId);
    const found = journal.syllabusTopics.find((t) => t.id === sylId);
    if (found) {
      setTopic(found.title);
      if (found.color) setTopicColor(found.color);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !subjectObj) return;
    const janStatus = rosterStatuses['st-14'] ?? 'ob';
    onLogLesson(
      activeClass.id,
      lessonDate,
      lessonNumber,
      subjectObj.name,
      topic.trim(),
      janStatus,
      topicColor,
      selectedSyllabusId && !selectedSyllabusId.startsWith('rt::')
        ? selectedSyllabusId
        : undefined
    );
    setSavedMsg(
      `Rozpoczęto i zapisano lekcję nr ${lessonNumber} dla klasy ${activeClass.name} (${subjectObj.name}): „${topic.trim()}”.`
    );
    setTopic('');
    setSelectedSyllabusId('');
    setTimeout(() => setSavedMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-[#7B2276]" />
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Interfejs lekcyjny — Rozpoczynanie i prowadzenie lekcji
            </h1>
            <p className="text-xs text-slate-500">
              Wybierz klasę, przedmiot i temat z rozkładu materiału (z kolorem) oraz sprawdź obecność
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-600 tabular-nums">
          Szczęśliwy numerek dziś: <strong className="text-[#7B2276]">{journal.luckyNumber}</strong>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {canTeach && (
        <form
          onSubmit={handleSubmit}
          className="border border-slate-200 rounded-md p-5 bg-slate-50/70 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data lekcji
              </label>
              <input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Klasa (Oddział)
              </label>
              <select
                value={activeClass.id}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSyllabusId('');
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold text-slate-900"
              >
                {journal.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Klasa {cls.name} ({cls.students.length} uczniów)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Godzina lekcyjna
              </label>
              <select
                value={lessonNumber}
                onChange={(e) => setLessonNumber(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    Lekcja {n} ({activeLessonHours[n].start}–{activeLessonHours[n].end})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Przedmiot</label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setSelectedSyllabusId('');
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
              >
                {journal.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Wybierz temat ({activeClass.name})
              </label>
              <select
                value={selectedSyllabusId}
                onChange={(e) => handleSelectSyllabus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
              >
                <option value="">
                  — Wybierz temat z rozkładu lub gotowych tematów —
                </option>
                {subjectSyllabus.length > 0 && (
                  <optgroup label={`Rozkład klasy ${activeClass.name}`}>
                    {subjectSyllabus.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.order}. {st.title} {st.completed ? '(zrealizowany)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {readyTopics.length > 0 && (
                  <optgroup label="Gotowe tematy (z kolorem)">
                    {readyTopics.map((rt) => (
                      <option key={rt.id} value={`rt::${rt.id}`}>
                        {rt.title} ({rt.hours} godz.)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Topic quick color chips from saved syllabus */}
          {subjectSyllabus.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Tematy z rozkładu:</span>
              {subjectSyllabus.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectSyllabus(st.id)}
                  className={`px-2.5 py-1 rounded border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    selectedSyllabusId === st.id
                      ? 'bg-white border-slate-900 text-slate-900 shadow-xs'
                      : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: st.color || '#7B2276' }}
                  />
                  <span>{st.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick color chips from custom ready topics */}
          {readyTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Gotowe tematy:</span>
              {readyTopics.map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => handleSelectSyllabus(`rt::${rt.id}`)}
                  className={`px-2.5 py-1 rounded border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    selectedSyllabusId === `rt::${rt.id}`
                      ? 'bg-white border-slate-900 text-slate-900 shadow-xs'
                      : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: rt.color || '#7B2276' }}
                  />
                  <span>{rt.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Topic input + color selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Temat lekcji (do dziennika)
              </label>
              <div className="relative flex items-center">
                <span
                  className="w-3 h-3 rounded-full absolute left-3 pointer-events-none"
                  style={{ backgroundColor: topicColor }}
                />
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Wpisz temat lekcji lub kliknij temat powyżej..."
                  className="w-full pl-8 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#7B2276]"
                />
              </div>
            </div>

            <div className="lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                <span>Kolor tematu</span>
              </label>
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5">
                {TOPIC_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setTopicColor(col)}
                    aria-label={`Wybierz kolor ${col}`}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                      topicColor === col ? 'ring-2 ring-offset-1 ring-slate-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
                <input
                  type="color"
                  value={topicColor}
                  onChange={(e) => setTopicColor(e.target.value)}
                  title="Własny kolor"
                  className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer ml-auto"
                />
              </div>
            </div>
          </div>

          {/* Lista obecności dla wybranej klasy */}
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span>
                Lista obecności — Klasa {activeClass.name} ({formatDatePl(lessonDate)})
                {incomingTempTransfers.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                    +{incomingTempTransfers.length} gościnnie na 1 dzień
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {(activeClass.students.length > 0 || incomingTempTransfers.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      const allOb: Record<string, AttendanceStatus> = {};
                      activeClass.students.forEach((st) => {
                        allOb[st.id] = 'ob';
                      });
                      incomingTempTransfers.forEach((t) => {
                        allOb[t.studentId] = 'ob';
                      });
                      setRosterStatuses(allOb);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[11px] font-semibold cursor-pointer"
                  >
                    Wszyscy obecni (ob)
                  </button>
                )}
                <span className="text-slate-500">
                  Gwiazdka oznacza Szczęśliwy numerek ({journal.luckyNumber})
                </span>
              </div>
            </div>
            {activeClass.students.length === 0 && incomingTempTransfers.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                Brak przypisanych uczniów w tej klasie. Dodaj uczniów w menu Organizacja szkoły → Klasy, uczniowie (1-dniowe/stałe) i tematy.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  {activeClass.students.map((st) => {
                    const status = rosterStatuses[st.id] ?? 'ob';
                    const isLucky = st.number === journal.luckyNumber;
                    const outgoing = outgoingTempTransfers.find((t) => t.studentId === st.id);
                    return (
                      <tr
                        key={st.id}
                        className={
                          outgoing
                            ? 'bg-amber-50/50'
                            : isLucky
                              ? 'bg-amber-50/70'
                              : ''
                        }
                      >
                        <td className="py-2 px-4 w-14 font-mono text-slate-600 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            {st.number}
                            {isLucky && (
                              <span title="Szczęśliwy numerek" className="inline-flex">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={outgoing ? 'text-slate-500' : ''}>{st.fullName}</span>
                            {outgoing && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-semibold">
                                Dziś w kl. {outgoing.toClassId}
                                {outgoing.reason ? ` (${outgoing.reason})` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="inline-flex gap-1">
                            {(['ob', 'nb', 'sp', 'zw'] as AttendanceStatus[]).map((code) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() =>
                                  setRosterStatuses((prev) => ({ ...prev, [st.id]: code }))
                                }
                                className={`px-2 py-1 rounded font-mono border cursor-pointer ${
                                  status === code
                                    ? 'bg-[#7B2276] text-white border-[#7B2276]'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {code}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {incomingTempTransfers.map((t) => {
                    const status = rosterStatuses[t.studentId] ?? 'ob';
                    return (
                      <tr key={`guest-${t.id}`} className="bg-indigo-50/60">
                        <td className="py-2 px-4 w-14 font-mono text-indigo-700 font-bold tabular-nums">
                          G
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{t.studentName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-300 text-indigo-900 text-[10px] font-semibold">
                              Gościnnie na 1 dzień z kl. {t.fromClassId}
                              {t.reason ? ` · ${t.reason}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="inline-flex gap-1">
                            {(['ob', 'nb', 'sp', 'zw'] as AttendanceStatus[]).map((code) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() =>
                                  setRosterStatuses((prev) => ({ ...prev, [t.studentId]: code }))
                                }
                                className={`px-2 py-1 rounded font-mono border cursor-pointer ${
                                  status === code
                                    ? 'bg-indigo-700 text-white border-indigo-700'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {code}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-bold rounded cursor-pointer"
            >
              Rozpocznij i zapisz lekcję
            </button>
          </div>
        </form>
      )}

      {/* Conducted lesson logs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#7B2276]" />
          <h2 className="font-display text-base font-bold text-slate-900">
            Zrealizowane tematy lekcji
          </h2>
        </div>

        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-28">Data</th>
                <th className="py-2.5 px-3 w-20 text-center">Klasa</th>
                <th className="py-2.5 px-3 w-16 text-center">Lekcja</th>
                <th className="py-2.5 px-4 w-40">Przedmiot</th>
                <th className="py-2.5 px-4">Temat zajęć</th>
                <th className="py-2.5 px-4 w-44">Nauczyciel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...journal.lessonLogs].reverse().map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                    {formatDatePl(log.date)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                    {log.classId || '3B'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                    {log.lessonNumber}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{log.subject}</td>
                  <td className="py-2.5 px-4 text-slate-800">
                    <div className="inline-flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: log.color || '#7B2276' }}
                      />
                      <span>{log.topic}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{log.teacher}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

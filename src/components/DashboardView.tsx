import React from 'react';
import { BookOpen, CalendarDays, Clock, Megaphone } from 'lucide-react';
import { ActiveTab, JournalState, UserAccount } from '../types/journal';
import {
  calculateWeightedAverage,
  formatAverage,
  formatDatePl,
  getAttendanceMeta,
  getGradeBadgeStyle,
  getLessonHoursForClass,
} from '../utils/grades';

import { getRoleMeta } from '../utils/permissions';

interface DashboardViewProps {
  journal: JournalState;
  user: UserAccount;
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ journal, user, onNavigate }) => {
  const realGrades = journal.grades.filter((g) => !g.isSimulated);
  const overallAvg = calculateWeightedAverage(realGrades);

  const totalLessons = journal.attendance.length;
  const presentCount = journal.attendance.filter(
    (a) => a.status === 'ob' || a.status === 'sp' || a.status === 'zw'
  ).length;
  const attendancePct = totalLessons > 0 ? (presentCount / totalLessons) * 100 : 100;
  const unexcusedCount = journal.attendance.filter((a) => a.status === 'nb').length;

  const unreadMessages = journal.messages.filter((m) => m.folder === 'inbox' && !m.read).length;
  const pendingHomework = journal.homework.filter((h) => !h.completed);

  const recentGrades = [...realGrades]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const activeClassId = user.className || journal.classes[0]?.id || '3B';
  const activeLessonHours = getLessonHoursForClass(journal, activeClassId);
  const fridayCancellation =
    (journal.cancelledDays ?? []).find(
      (c) => c.dayIndex === 4 && c.classId.toLowerCase() === activeClassId.toLowerCase()
    ) ??
    (journal.cancelledDays ?? []).find((c) => c.dayIndex === 4 && c.classId === 'ALL');
  const todayLessons = journal.timetable
    .filter((t) => t.dayIndex === 4 && (t.classId ?? '3B').toLowerCase() === activeClassId.toLowerCase())
    .sort((a, b) => a.lessonNumber - b.lessonNumber);

  const upcomingEvents = [...journal.calendarEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const subjectNameMap = new Map(journal.subjects.map((s) => [s.id, s.name]));
  const isLuckyMatch = user.studentNumber === journal.luckyNumber;
  const roleMeta = getRoleMeta(user.role);

  return (
    <div className="space-y-4">
      {/* Classic LIBRUS Synergia welcome bar */}
      <div className="bg-[#8D2877] text-white px-4 py-2 rounded-[2px] flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold tracking-wide uppercase">
          Pulpit główny — LIBRUS Synergia
        </div>
        <div className="text-[11px] text-purple-100 font-mono">
          Piątek, 20.11.2026 · Rok szkolny {journal.schoolYear}
        </div>
      </div>

      {/* Summary strip matching classic Librus table density */}
      <div className="border border-[#CFD5DC] bg-[#F8F9FB] rounded-[2px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Zalogowany: <strong className="text-slate-900">{user.fullName}</strong>
          </span>
          <span
            className={`inline-block px-1.5 py-0.5 rounded-[2px] border text-[11px] font-semibold ${roleMeta.badgeClass}`}
          >
            {roleMeta.label}
          </span>
          <span className="text-slate-500">({user.subtitle})</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-700">
          <button
            type="button"
            onClick={() => onNavigate('oceny')}
            className="hover:text-[#8D2877] cursor-pointer"
          >
            Średnia: <strong className="font-mono text-slate-900">{formatAverage(overallAvg)}</strong>
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => onNavigate('frekwencja')}
            className="hover:text-[#8D2877] cursor-pointer"
          >
            Frekwencja:{' '}
            <strong className="font-mono text-slate-900">
              {attendancePct.toFixed(1).replace('.', ',')}%
            </strong>
            {unexcusedCount > 0 && (
              <span className="text-rose-700 font-semibold"> ({unexcusedCount} nb)</span>
            )}
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => onNavigate('wiadomosci')}
            className="hover:text-[#8D2877] cursor-pointer"
          >
            Nieprzeczytane wiadomości:{' '}
            <strong className="font-mono text-[#8D2877]">{unreadMessages}</strong>
          </button>
        </div>
      </div>

      {/* Main 2-column classic LIBRUS portal layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left column (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Ostatnio dodane oceny */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-[#8D2877] flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Ostatnio wystawione oceny
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('oceny')}
                className="text-[11px] font-semibold text-[#8D2877] hover:underline cursor-pointer"
              >
                Zobacz wszystkie »
              </button>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E1E5EA] text-[11px] font-semibold text-slate-600">
                  <th className="py-1.5 px-3">Przedmiot</th>
                  <th className="py-1.5 px-3">Kategoria</th>
                  <th className="py-1.5 px-3 w-20 text-center">Data</th>
                  <th className="py-1.5 px-3 w-14 text-center">Ocena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF]">
                {recentGrades.map((grade, idx) => (
                  <tr
                    key={grade.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}
                  >
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {subjectNameMap.get(grade.subjectId) ?? 'Przedmiot'}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {grade.category}{' '}
                      <span className="text-[11px] text-slate-400 font-mono">
                        (waga {grade.weight})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500 tabular-nums">
                      {formatDatePl(grade.date)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-[2px] border font-mono font-bold text-xs tabular-nums ${getGradeBadgeStyle(
                          grade.value
                        )}`}
                      >
                        {grade.value}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Dzisiejszy plan lekcji */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-[#76A815] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#76A815]" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Plan lekcji — Piątek (20.11.2026)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('plan')}
                className="text-[11px] font-semibold text-[#8D2877] hover:underline cursor-pointer"
              >
                Pełny plan »
              </button>
            </div>
            {fridayCancellation && (
              <div className="px-3.5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="uppercase tracking-wide">Cały dzień odwołany</strong>
                  <span className="mx-1.5">·</span>
                  <span>
                    Powód: <strong>{fridayCancellation.reason}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-rose-700 font-semibold">
                  {fridayCancellation.classId === 'ALL'
                    ? 'Dotyczy całej szkoły'
                    : `Dotyczy kl. ${fridayCancellation.classId}`}
                </span>
              </div>
            )}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E1E5EA] text-[11px] font-semibold text-slate-600">
                  <th className="py-1.5 px-3 w-12 text-center">Nr</th>
                  <th className="py-1.5 px-3 w-24">Godzina</th>
                  <th className="py-1.5 px-3">Przedmiot</th>
                  <th className="py-1.5 px-3">Nauczyciel / Sala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF]">
                {todayLessons.map((lesson, idx) => {
                  const hours = activeLessonHours[lesson.lessonNumber];
                  const isCancelled = Boolean(fridayCancellation) || lesson.changeType === 'cancelled';
                  const isSub = !fridayCancellation && lesson.changeType === 'substitution';
                  return (
                    <tr
                      key={lesson.id}
                      className={
                        isCancelled
                          ? 'bg-rose-50/50'
                          : isSub
                            ? 'bg-amber-50/50'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-[#F8FAFC]'
                      }
                    >
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 tabular-nums">
                        {lesson.lessonNumber}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500 tabular-nums">
                        {hours?.start}–{hours?.end}
                      </td>
                      <td
                        className={`py-2 px-3 font-semibold ${
                          isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {lesson.subject}
                        {isSub && (
                          <span className="ml-1.5 text-[10px] font-bold text-amber-800">
                            [Zastępstwo]
                          </span>
                        )}
                        {isCancelled && (
                          <span className="ml-1.5 text-[10px] font-bold text-rose-700">
                            [Odwołana]
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {lesson.teacher} ({lesson.room})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Zadania domowe */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-[#1D70B8] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#1D70B8]" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Zadania domowe ({pendingHomework.length} do wykonania)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('zadania')}
                className="text-[11px] font-semibold text-[#8D2877] hover:underline cursor-pointer"
              >
                Wszystkie »
              </button>
            </div>
            <div className="divide-y divide-[#EAECEF] text-xs">
              {pendingHomework.slice(0, 4).map((hw, idx) => (
                <div
                  key={hw.id}
                  className={`px-3.5 py-2 flex items-center justify-between gap-3 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{hw.subject}:</span>{' '}
                    <span className="text-slate-700">{hw.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                    do {formatDatePl(hw.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          {/* Szczęśliwy numerek */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-[#8D2877] flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Szczęśliwy numerek
              </h2>
              <span className="text-[11px] font-mono text-slate-500">20.11.2026</span>
            </div>
            <div className="p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-[2px] bg-[#8D2877] text-white font-mono font-bold text-xl flex items-center justify-center tabular-nums shrink-0">
                {journal.luckyNumber}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">
                  Wylosowany numer na dziś: {journal.luckyNumber}
                </div>
                <div className="text-slate-600 mt-0.5">
                  {isLuckyMatch
                    ? 'Twój numer z dziennika został dziś wylosowany!'
                    : `Zachowanie przewidywane: ${journal.behaviorGrade}`}
                </div>
              </div>
            </div>
          </section>

          {/* Najbliższe w terminarzu */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-[#76A815] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-[#76A815]" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Terminarz
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('terminarz')}
                className="text-[11px] font-semibold text-[#8D2877] hover:underline cursor-pointer"
              >
                Kalendarz »
              </button>
            </div>
            <div className="divide-y divide-[#EAECEF] text-xs">
              {upcomingEvents.map((ev, idx) => (
                <div
                  key={ev.id}
                  className={`px-3.5 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-mono tabular-nums">{formatDatePl(ev.date)}</span>
                    <span
                      className={`font-semibold ${
                        ev.category === 'Sprawdzian'
                          ? 'text-rose-700'
                          : ev.category === 'Kartkówka'
                            ? 'text-amber-700'
                            : 'text-[#8D2877]'
                      }`}
                    >
                      {ev.category}
                      {ev.subject ? ` · ${ev.subject}` : ''}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">{ev.title}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Ogłoszenia */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-[#8D2877] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-[#8D2877]" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Ogłoszenia
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('ogloszenia')}
                className="text-[11px] font-semibold text-[#8D2877] hover:underline cursor-pointer"
              >
                Wszystkie »
              </button>
            </div>
            <div className="divide-y divide-[#EAECEF] text-xs">
              {journal.announcements.slice(0, 3).map((ann, idx) => (
                <div
                  key={ann.id}
                  className={`px-3.5 py-2.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}
                >
                  <div className="text-[11px] text-slate-500">
                    {formatDatePl(ann.date)} · {ann.author} ({ann.authorRole})
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">{ann.title}</div>
                  <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Ostatnie wpisy frekwencji */}
          <section className="border border-[#CFD5DC] rounded-[2px] overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-[#EFF2F5] border-b border-[#CFD5DC] border-l-4 border-l-emerald-600 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Ostatnie nieobecności i spóźnienia
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('frekwencja')}
                className="text-[11px] font-semibold text-[#8D2877] hover:underline cursor-pointer"
              >
                Szczegóły »
              </button>
            </div>
            <div className="divide-y divide-[#EAECEF] text-xs">
              {journal.attendance
                .filter((a) => a.status !== 'ob')
                .slice(-4)
                .reverse()
                .map((item, idx) => {
                  const meta = getAttendanceMeta(item.status);
                  return (
                    <div
                      key={item.id}
                      className={`px-3.5 py-2 flex items-center justify-between gap-2 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {item.subjectName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {formatDatePl(item.date)} · lekcja {item.lessonNumber}
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-[2px] border text-[11px] font-mono ${meta.className}`}
                      >
                        {meta.short}
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

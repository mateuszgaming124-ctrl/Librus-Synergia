import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  BookOpen,
  Building2,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  FolderPlus,
  GripVertical,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  CancelledDay,
  JournalState,
  SyllabusTopic,
  TimetableLesson,
  UserAccount,
} from '../types/journal';
import { getLessonHoursForClass, LESSON_HOURS, WEEKDAYS_PL } from '../utils/grades';
import { getEffectivePermissions, getRoleLabel, isStaffRole, isStudentRole } from '../utils/permissions';

interface TimetableViewProps {
  journal: JournalState;
  user: UserAccount;
  accounts?: UserAccount[];
  onSaveTimetableSlot: (slot: TimetableLesson) => void;
  onMoveTimetableSlot: (
    sourceId: string,
    targetDayIndex: number,
    targetLessonNumber: number,
    classId: string,
    markAsMoved: boolean
  ) => void;
  onDeleteTimetableSlot: (id: string) => void;
  onStartLessonFromSlot?: (slot: TimetableLesson) => void;
  onSaveClassLessonHours?: (
    classId: string,
    hours: Record<number, { start: string; end: string }>
  ) => void;
  onCancelWholeDay?: (classId: string, dayIndex: number, reason: string) => void;
  onRestoreWholeDay?: (id?: string, classId?: string, dayIndex?: number) => void;
  onCreateClass?: (name: string, homeroomTeacher: string) => void;
  onCreateClassRoom?: (name: string) => void;
  onDeleteClassRoom?: (name: string) => void;
}

const WEEKS = [
  {
    label: '09.11.2026 – 13.11.2026',
    note: 'Tydzień ubiegły',
    dates: ['09.11', '10.11', '11.11', '12.11', '13.11'],
  },
  {
    label: '16.11.2026 – 20.11.2026',
    note: 'Bieżący tydzień',
    dates: ['16.11', '17.11', '18.11', '19.11', '20.11'],
  },
  {
    label: '23.11.2026 – 27.11.2026',
    note: 'Przyszły tydzień',
    dates: ['23.11', '24.11', '25.11', '26.11', '27.11'],
  },
];

type DragPayload =
  | { kind: 'slot'; slotId: string }
  | { kind: 'subject'; subjectId: string }
  | { kind: 'topic'; topicId: string }
  | { kind: 'room'; roomName: string };

export const TimetableView: React.FC<TimetableViewProps> = ({
  journal,
  user,
  accounts = [],
  onSaveTimetableSlot,
  onMoveTimetableSlot,
  onDeleteTimetableSlot,
  onStartLessonFromSlot,
  onSaveClassLessonHours,
  onCancelWholeDay,
  onRestoreWholeDay,
  onCreateClass,
  onCreateClassRoom,
  onDeleteClassRoom,
}) => {
  const canEdit = getEffectivePermissions(user).editTimetable;
  const [weekIdx, setWeekIdx] = useState(1);
  const [mobileDay, setMobileDay] = useState(4);
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [selectedClassId, setSelectedClassId] = useState(journal.classes[0]?.id ?? '3B');
  const [selectedTeacher, setSelectedTeacher] = useState(
    isStaffRole(user.role) ? user.fullName : journal.subjects[0]?.teacher ?? 'mgr Piotr Nowak'
  );
  const [editMode, setEditMode] = useState(false);
  const [markMovesAsChanged, setMarkMovesAsChanged] = useState(false);
  const [paletteTab, setPaletteTab] = useState<'subjects' | 'topics' | 'rooms'>('subjects');
  const [paletteSubjectId, setPaletteSubjectId] = useState(journal.subjects[0]?.id ?? 'mat');
  const [newRoomInput, setNewRoomInput] = useState('');
  const [activeRoomPreset, setActiveRoomPreset] = useState('');
  const [createClassModal, setCreateClassModal] = useState<{
    name: string;
    homeroomTeacher: string;
  } | null>(null);

  React.useEffect(() => {
    if (
      journal.subjects.length > 0 &&
      !journal.subjects.some((s) => s.id === paletteSubjectId)
    ) {
      setPaletteSubjectId(journal.subjects[0].id);
    }
  }, [journal.subjects, paletteSubjectId]);

  React.useEffect(() => {
    if (
      journal.classes.length > 0 &&
      !journal.classes.some((c) => c.id === selectedClassId)
    ) {
      setSelectedClassId(journal.classes[0].id);
    }
  }, [journal.classes, selectedClassId]);

  // Drag-and-drop state
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal state for adding/editing a lesson slot
  const [editingSlot, setEditingSlot] = useState<{
    id?: string;
    classId: string;
    dayIndex: number;
    lessonNumber: number;
    subject: string;
    teacher: string;
    room: string;
    changeType: NonNullable<TimetableLesson['changeType']>;
    changeNote: string;
    originalSubject: string;
    plannedTopic: string;
    plannedTopicColor: string;
    plannedTopicId: string;
    fromDropPrompt?: boolean;
  } | null>(null);

  // Cancel whole day modal state
  const [cancelDayModal, setCancelDayModal] = useState<{
    classId: string;
    dayIndex: number;
    reason: string;
  } | null>(null);

  const lessonNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
  const activeLessonHours = getLessonHoursForClass(
    journal,
    viewMode === 'class' ? selectedClassId : undefined
  );
  const editorLessonHours = getLessonHoursForClass(
    journal,
    editingSlot?.classId ?? selectedClassId
  );

  const hasCustomClassHours = useMemo(() => {
    if (viewMode !== 'class' || !selectedClassId || !journal.classLessonHours) return false;
    const upper = selectedClassId.trim().toUpperCase();
    return Object.keys(journal.classLessonHours).some((k) => k.trim().toUpperCase() === upper);
  }, [viewMode, selectedClassId, journal.classLessonHours]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursClassId, setHoursClassId] = useState(selectedClassId);
  const [hoursDraft, setHoursDraft] = useState<Record<number, { start: string; end: string }>>(() =>
    getLessonHoursForClass(journal, selectedClassId)
  );
  const hoursDirtyRef = useRef(false);
  const lastModalHoursKeyRef = useRef('');

  React.useEffect(() => {
    if (!showHoursModal) {
      hoursDirtyRef.current = false;
      lastModalHoursKeyRef.current = '';
      return;
    }
    const key = hoursClassId;
    if (lastModalHoursKeyRef.current !== key) {
      lastModalHoursKeyRef.current = key;
      hoursDirtyRef.current = false;
      setHoursDraft(getLessonHoursForClass(journal, hoursClassId));
    } else if (!hoursDirtyRef.current) {
      setHoursDraft(getLessonHoursForClass(journal, hoursClassId));
    }
  }, [showHoursModal, hoursClassId, journal.classLessonHours]);

  const getCancelledDay = (dayIdx: number): CancelledDay | undefined => {
    const list = journal.cancelledDays ?? [];
    if (viewMode === 'class') {
      const upper = selectedClassId.trim().toUpperCase();
      return (
        list.find((d) => d.dayIndex === dayIdx && d.classId.toUpperCase() === upper) ??
        list.find((d) => d.dayIndex === dayIdx && d.classId === 'ALL')
      );
    }
    return list.find((d) => d.dayIndex === dayIdx && d.classId === 'ALL');
  };

  const uniqueTeachers = useMemo(() => {
    const set = new Set<string>();
    accounts
      .filter((a) => !isStudentRole(a.role) && a.role !== 'parent')
      .forEach((a) => set.add(a.fullName));
    journal.subjects.forEach((s) => set.add(s.teacher));
    journal.classes.forEach((c) => set.add(c.homeroomTeacher));
    journal.timetable.forEach((t) => set.add(t.teacher));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [accounts, journal.subjects, journal.classes, journal.timetable]);

  const teacherSelectOptions = useMemo(() => {
    const map = new Map<string, string>();
    accounts
      .filter((a) => !isStudentRole(a.role) && a.role !== 'parent')
      .forEach((a) => map.set(a.fullName, `${a.fullName} (${getRoleLabel(a.role)})`));
    journal.subjects.forEach((s) => {
      if (!map.has(s.teacher)) map.set(s.teacher, `${s.teacher} (${s.name})`);
    });
    journal.classes.forEach((c) => {
      if (!map.has(c.homeroomTeacher)) map.set(c.homeroomTeacher, `${c.homeroomTeacher} (Wych. ${c.name})`);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [accounts, journal.subjects, journal.classes]);

  const availableClassRooms = useMemo(() => {
    const seen = new Map<string, string>();
    (journal.classRooms ?? []).forEach((rm) => {
      const trimmed = rm.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.set(trimmed.toLowerCase(), trimmed);
      }
    });
    journal.timetable.forEach((t) => {
      const trimmed = t.room.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, 'pl', { numeric: true })
    );
  }, [journal.classRooms, journal.timetable]);

  const handleQuickCreateRoom = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    onCreateClassRoom?.(trimmed);
    setActiveRoomPreset(trimmed);
    setNewRoomInput('');
    notify(`Utworzono klasę-salę „${trimmed}” i ustawiono jako aktywną.`);
  };

  const getSlot = (dayIndex: number, lessonNumber: number) => {
    const slot = journal.timetable.find((t) => {
      const slotClass = t.classId ?? '3B';
      if (viewMode === 'class' && slotClass !== selectedClassId) return false;
      if (viewMode === 'teacher' && t.teacher !== selectedTeacher) return false;
      return t.dayIndex === dayIndex && t.lessonNumber === lessonNumber;
    });
    return slot;
  };

  const classTopicsForSubject: SyllabusTopic[] = useMemo(() => {
    return journal.syllabusTopics
      .filter((t) => t.classId === selectedClassId && t.subjectId === paletteSubjectId)
      .sort((a, b) => a.order - b.order);
  }, [journal.syllabusTopics, selectedClassId, paletteSubjectId]);

  const openSlotEditor = (dayIndex: number, lessonNumber: number, existing?: TimetableLesson) => {
    if (!canEdit) return;
    if (existing) {
      setEditingSlot({
        id: existing.id,
        classId: existing.classId ?? selectedClassId,
        dayIndex,
        lessonNumber,
        subject: existing.subject.replace(' (Zastępstwo)', ''),
        teacher: existing.teacher,
        room: existing.room,
        changeType: existing.changeType ?? 'normal',
        changeNote: existing.changeNote ?? '',
        originalSubject: existing.originalSubject ?? existing.subject,
        plannedTopic: existing.plannedTopic ?? '',
        plannedTopicColor: existing.plannedTopicColor ?? '#7B2276',
        plannedTopicId: existing.plannedTopicId ?? '',
      });
    } else {
      const defaultSubj = journal.subjects[0];
      setEditingSlot({
        classId: selectedClassId,
        dayIndex,
        lessonNumber,
        subject: defaultSubj?.name ?? 'Matematyka',
        teacher:
          viewMode === 'teacher'
            ? selectedTeacher
            : defaultSubj?.teacher ?? 'mgr Piotr Nowak',
        room: 's. 208',
        changeType: 'normal',
        changeNote: '',
        originalSubject: '',
        plannedTopic: '',
        plannedTopicColor: '#7B2276',
        plannedTopicId: '',
      });
    }
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    const isSub = editingSlot.changeType === 'substitution';
    const finalSubject = isSub
      ? `${editingSlot.subject.replace(' (Zastępstwo)', '')} (Zastępstwo)`
      : editingSlot.subject.replace(' (Zastępstwo)', '');
    const rawClass = editingSlot.classId.trim().toUpperCase() || selectedClassId;
    const matchedCls = journal.classes.find(
      (c) => c.id.toUpperCase() === rawClass || c.name.toUpperCase() === rawClass
    );
    const canonicalClassId = matchedCls?.id ?? rawClass;
    const finalTeacher = editingSlot.teacher.trim() || 'Nauczyciel';

    if (!matchedCls && onCreateClass) {
      onCreateClass(canonicalClassId, finalTeacher);
    }

    onSaveTimetableSlot({
      id:
        editingSlot.id ??
        `tt-${canonicalClassId}-${editingSlot.dayIndex}-${editingSlot.lessonNumber}-${Date.now()}`,
      classId: canonicalClassId,
      dayIndex: editingSlot.dayIndex,
      lessonNumber: editingSlot.lessonNumber,
      subject: finalSubject,
      teacher: finalTeacher,
      room: editingSlot.room.trim() || 's. 101',
      changeType: editingSlot.changeType,
      changeNote:
        editingSlot.changeType !== 'normal' ? editingSlot.changeNote.trim() : undefined,
      originalSubject: isSub
        ? editingSlot.originalSubject || editingSlot.subject
        : undefined,
      plannedTopic: editingSlot.plannedTopic.trim() || undefined,
      plannedTopicColor: editingSlot.plannedTopic.trim()
        ? editingSlot.plannedTopicColor
        : undefined,
      plannedTopicId: editingSlot.plannedTopicId || undefined,
    });
    if (viewMode === 'class') {
      setSelectedClassId(canonicalClassId);
    }
    setEditingSlot(null);
    notify(`Zapisano lekcję (${finalSubject}) dla klasy ${canonicalClassId} — ${finalTeacher}.`);
  };

  const handleDropOnCell = (targetDayIndex: number, targetLessonNumber: number) => {
    setHoverCell(null);
    if (!canEdit || !editMode || !dragPayload) return;

    if (dragPayload.kind === 'slot') {
      const source = journal.timetable.find((t) => t.id === dragPayload.slotId);
      if (!source) return;
      if (source.dayIndex === targetDayIndex && source.lessonNumber === targetLessonNumber) {
        setDragPayload(null);
        return;
      }
      const targetExisting = getSlot(targetDayIndex, targetLessonNumber);
      onMoveTimetableSlot(
        dragPayload.slotId,
        targetDayIndex,
        targetLessonNumber,
        selectedClassId,
        markMovesAsChanged
      );
      if (targetExisting) {
        notify(
          `Zamieniono lekcje: ${source.subject} ↔ ${targetExisting.subject}.`
        );
      } else {
        notify(
          `Przeniesiono „${source.subject}” na ${WEEKDAYS_PL[targetDayIndex]}, lekcja ${targetLessonNumber}.`
        );
      }
    } else if (dragPayload.kind === 'subject') {
      const subj = journal.subjects.find((s) => s.id === dragPayload.subjectId);
      if (!subj) return;
      const existing = getSlot(targetDayIndex, targetLessonNumber);
      setEditingSlot({
        id: existing?.id,
        classId: selectedClassId,
        dayIndex: targetDayIndex,
        lessonNumber: targetLessonNumber,
        subject: subj.name,
        teacher: viewMode === 'teacher' ? selectedTeacher : subj.teacher,
        room: activeRoomPreset || existing?.room || availableClassRooms[0] || 's. 201',
        changeType: 'normal',
        changeNote: '',
        originalSubject: '',
        plannedTopic: existing?.plannedTopic ?? '',
        plannedTopicColor: existing?.plannedTopicColor ?? '#7B2276',
        plannedTopicId: existing?.plannedTopicId ?? '',
        fromDropPrompt: true,
      });
    } else if (dragPayload.kind === 'room') {
      const existing = getSlot(targetDayIndex, targetLessonNumber);
      if (existing) {
        onSaveTimetableSlot({
          ...existing,
          room: dragPayload.roomName,
        });
        notify(
          `Przypisano klasę-salę „${dragPayload.roomName}” do przedmiotu ${existing.subject} (${WEEKDAYS_PL[targetDayIndex]}, L${targetLessonNumber}).`
        );
      } else {
        const defaultSubj = journal.subjects[0];
        setEditingSlot({
          classId: selectedClassId,
          dayIndex: targetDayIndex,
          lessonNumber: targetLessonNumber,
          subject: defaultSubj?.name ?? 'Matematyka',
          teacher:
            viewMode === 'teacher'
              ? selectedTeacher
              : defaultSubj?.teacher ?? 'mgr Piotr Nowak',
          room: dragPayload.roomName,
          changeType: 'normal',
          changeNote: '',
          originalSubject: '',
          plannedTopic: '',
          plannedTopicColor: '#7B2276',
          plannedTopicId: '',
          fromDropPrompt: true,
        });
      }
    } else if (dragPayload.kind === 'topic') {
      const topic = journal.syllabusTopics.find((t) => t.id === dragPayload.topicId);
      if (!topic) return;
      const subj = journal.subjects.find((s) => s.id === topic.subjectId);
      const existing = getSlot(targetDayIndex, targetLessonNumber);
      setEditingSlot({
        id: existing?.id,
        classId: selectedClassId,
        dayIndex: targetDayIndex,
        lessonNumber: targetLessonNumber,
        subject: existing?.subject.replace(' (Zastępstwo)', '') ?? subj?.name ?? 'Matematyka',
        teacher:
          existing?.teacher ??
          (viewMode === 'teacher' ? selectedTeacher : subj?.teacher ?? 'Nauczyciel'),
        room: existing?.room ?? 's. 201',
        changeType: existing?.changeType ?? 'normal',
        changeNote: existing?.changeNote ?? '',
        originalSubject: existing?.originalSubject ?? '',
        plannedTopic: topic.title,
        plannedTopicColor: topic.color,
        plannedTopicId: topic.id,
        fromDropPrompt: true,
      });
    }

    setDragPayload(null);
  };

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header & controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 print:pb-2 print:border-slate-300">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 print:text-lg">
            Plan lekcji — {viewMode === 'class' ? `Klasa ${selectedClassId}` : selectedTeacher}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 print:hidden">
            Tygodniowy plan zajęć · Przeciągnij i upuść w trybie planowania, aby przenosić lekcje i tematy
          </p>
          <p className="hidden print:block text-xs text-slate-600 mt-0.5">
            Tydzień: <span className="font-mono font-semibold">{WEEKS[weekIdx].label}</span> · Rok szkolny{' '}
            <span className="font-mono">{journal.schoolYear}</span> · LIBRUS Synergia
          </p>
        </div>

        <div className="print:hidden flex flex-wrap items-center gap-2">
          {/* View mode switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded">
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer ${
                viewMode === 'class' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Plan klasy
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer ${
                viewMode === 'teacher' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Plan nauczyciela
            </button>
          </div>

          {viewMode === 'class' ? (
            <div className="inline-flex items-center gap-1.5">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-800"
              >
                {journal.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Klasa {cls.name}
                  </option>
                ))}
              </select>
              {canEdit && onCreateClass && (
                <button
                  type="button"
                  onClick={() =>
                    setCreateClassModal({
                      name: '',
                      homeroomTeacher: teacherSelectOptions[0]?.value ?? user.fullName,
                    })
                  }
                  title="Utwórz nową klasę (oddział)"
                  className="px-2.5 py-1.5 text-xs font-semibold text-[#7B2276] bg-[#FAF5FB] border border-[#D8BFE2] hover:bg-[#F5EEF8] rounded inline-flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Nowa klasa</span>
                </button>
              )}
            </div>
          ) : (
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-medium text-slate-800"
            >
              {uniqueTeachers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Week selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={weekIdx === 0}
              onClick={() => setWeekIdx((w) => Math.max(0, w - 1))}
              aria-label="Poprzedni tydzień"
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 rounded bg-slate-50 border border-slate-200 text-center">
              <div className="text-xs font-semibold text-slate-900 font-mono tabular-nums">
                {WEEKS[weekIdx].label}
              </div>
            </div>
            <button
              type="button"
              disabled={weekIdx === WEEKS.length - 1}
              onClick={() => setWeekIdx((w) => Math.min(WEEKS.length - 1, w + 1))}
              aria-label="Następny tydzień"
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border flex items-center gap-1.5 cursor-pointer ${
                editMode
                  ? 'bg-[#7B2276] text-white border-[#7B2276]'
                  : 'bg-white text-[#7B2276] border-[#7B2276] hover:bg-[#F5EEF8]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{editMode ? 'Zakończ edycję planu' : 'Edytuj plan lekcji'}</span>
            </button>
          )}

          {canEdit && onCancelWholeDay && (
            <button
              type="button"
              onClick={() =>
                setCancelDayModal({
                  classId: viewMode === 'class' ? selectedClassId : 'ALL',
                  dayIndex: mobileDay,
                  reason: '',
                })
              }
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 rounded flex items-center gap-1.5 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Odwołaj cały dzień</span>
            </button>
          )}

          {(canEdit || user.role === 'director') && onSaveClassLessonHours && (
            <button
              type="button"
              onClick={() => {
                hoursDirtyRef.current = false;
                lastModalHoursKeyRef.current = selectedClassId;
                setHoursClassId(selectedClassId);
                setHoursDraft(getLessonHoursForClass(journal, selectedClassId));
                setShowHoursModal(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[#7B2276] bg-white border border-[#7B2276]/50 hover:bg-[#F5EEF8] rounded flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Dzwonki (godziny lekcji)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            title="Otwórz okno drukowania planu lekcji"
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#7B2276]" />
            <span>Drukuj plan</span>
          </button>
        </div>
      </div>

      {hasCustomClassHours && (
        <div className="print:hidden px-3.5 py-2 rounded bg-[#FAF5FB] border border-[#D8BFE2] text-xs text-[#521F61] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#7B2276]" />
            <span>
              Klasa <strong>{selectedClassId}</strong> korzysta z indywidualnego rozkładu dzwonków.
            </span>
          </div>
          {(canEdit || user.role === 'director') && onSaveClassLessonHours && (
            <button
              type="button"
              onClick={() => {
                hoursDirtyRef.current = false;
                lastModalHoursKeyRef.current = selectedClassId;
                setHoursClassId(selectedClassId);
                setHoursDraft(getLessonHoursForClass(journal, selectedClassId));
                setShowHoursModal(true);
              }}
              className="text-xs font-semibold text-[#7B2276] underline cursor-pointer"
            >
              Zmień dzwonki
            </button>
          )}
        </div>
      )}

      {(journal.cancelledDays ?? []).length > 0 && (
        <div className="print:hidden space-y-1.5">
          {(journal.cancelledDays ?? [])
            .filter((cd) => viewMode !== 'class' || cd.classId === 'ALL' || cd.classId === selectedClassId)
            .map((cd) => (
              <div
                key={cd.id}
                className="px-3.5 py-2 rounded bg-rose-50 border border-rose-300 text-rose-900 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Odwołany cały dzień:</strong> {WEEKDAYS_PL[cd.dayIndex]} (
                    {cd.classId === 'ALL' ? 'Wszystkie klasy' : `Klasa ${cd.classId}`}) — Powód:{' '}
                    <strong>{cd.reason}</strong>
                  </span>
                </div>
                {canEdit && onRestoreWholeDay && (
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreWholeDay(cd.id, cd.classId, cd.dayIndex);
                      notify(`Przywrócono zajęcia w dniu: ${WEEKDAYS_PL[cd.dayIndex]}.`);
                    }}
                    className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 text-[11px] font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Przywróć dzień</span>
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {toast && (
        <div className="print:hidden px-4 py-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {toast}
        </div>
      )}

      {/* Librus 1:1 Planowanie lekcji bar with drag-and-drop palette */}
      {editMode && canEdit && (
        <section className="print:hidden p-4 rounded-md bg-[#F8F1F8] border border-[#D8BFE2] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="text-xs text-[#521F61]">
              <strong>Tryb planowania lekcji (przeciągnij i upuść):</strong> chwyć kafelek
              lekcji w siatce, aby <strong>przenieść go lub zamienić miejscami</strong> z inną
              godziną, albo przeciągnij temat/przedmiot z paska poniżej na wybraną kratkę.
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D8BFE2] rounded text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markMovesAsChanged}
                  onChange={(e) => setMarkMovesAsChanged(e.target.checked)}
                  className="rounded border-slate-300 text-[#7B2276]"
                />
                <span>Oznaczaj przeniesione jako zmianę w planie</span>
              </label>

              <button
                type="button"
                onClick={() => openSlotEditor(0, 1)}
                className="px-3 py-1.5 bg-[#7B2276] text-white text-xs font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Dodaj ręcznie</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E6D4ED] rounded p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap p-0.5 bg-slate-100 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setPaletteTab('subjects')}
                  className={`px-3 py-1 rounded-sm font-semibold cursor-pointer ${
                    paletteTab === 'subjects'
                      ? 'bg-white text-[#7B2276] shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Przeciągnij przedmiot do planu
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteTab('rooms')}
                  className={`px-3 py-1 rounded-sm font-semibold cursor-pointer ${
                    paletteTab === 'rooms'
                      ? 'bg-white text-[#7B2276] shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Klasy-sale (utwórz i przypisz)
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteTab('topics')}
                  className={`px-3 py-1 rounded-sm font-semibold cursor-pointer ${
                    paletteTab === 'topics'
                      ? 'bg-white text-[#7B2276] shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Przeciągnij temat (z kolorem)
                </button>
              </div>

              {paletteTab === 'topics' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Przedmiot ({selectedClassId}):</span>
                  <select
                    value={paletteSubjectId}
                    onChange={(e) => setPaletteSubjectId(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium"
                  >
                    {journal.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {paletteTab === 'subjects' ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 p-2 rounded bg-[#FAF5FB] border border-[#E6D4ED] text-xs">
                  <Building2 className="w-3.5 h-3.5 text-[#7B2276] shrink-0" />
                  <span className="font-semibold text-slate-700">
                    Aktywna klasa-sala przy wrzucaniu przedmiotu:
                  </span>
                  <select
                    value={activeRoomPreset}
                    onChange={(e) => setActiveRoomPreset(e.target.value)}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium"
                  >
                    <option value="">(domyślna / zapytaj przy wrzuceniu)</option>
                    {availableClassRooms.map((rm) => (
                      <option key={rm} value={rm}>
                        {rm}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="text"
                      value={newRoomInput}
                      onChange={(e) => setNewRoomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickCreateRoom(newRoomInput);
                        }
                      }}
                      placeholder="Utwórz klasę-salę (np. s. 210)"
                      className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded w-48"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickCreateRoom(newRoomInput)}
                      className="px-2.5 py-1 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded cursor-pointer whitespace-nowrap"
                    >
                      + Utwórz klasę-salę
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {journal.subjects.map((s) => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => setDragPayload({ kind: 'subject', subjectId: s.id })}
                      onDragEnd={() => {
                        setDragPayload(null);
                        setHoverCell(null);
                      }}
                      className="px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-[#F5EEF8] hover:border-[#7B2276] text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : paletteTab === 'rooms' ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newRoomInput}
                    onChange={(e) => setNewRoomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateRoom(newRoomInput);
                      }
                    }}
                    placeholder="Wpisz nazwę klasy-sali, np. s. 210, Gabinet 4, Aula"
                    className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickCreateRoom(newRoomInput)}
                    className="px-3 py-1.5 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Utwórz klasę-salę</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Przeciągnij dowolną klasę-salę bezpośrednio na przedmiot w planie lekcji, aby od razu przypisać mu tę salę (lub kliknij ją, aby była aktywna przy dodawaniu przedmiotów).
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableClassRooms.map((rm) => {
                    const isActive = activeRoomPreset === rm;
                    const isCustom = (journal.classRooms ?? []).some(
                      (cr) => cr.toLowerCase() === rm.toLowerCase()
                    );
                    return (
                      <div
                        key={rm}
                        draggable
                        onClick={() => setActiveRoomPreset(isActive ? '' : rm)}
                        onDragStart={() => setDragPayload({ kind: 'room', roomName: rm })}
                        onDragEnd={() => {
                          setDragPayload(null);
                          setHoverCell(null);
                        }}
                        className={`px-2.5 py-1.5 rounded border text-xs font-semibold inline-flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none ${
                          isActive
                            ? 'bg-[#7B2276] text-white border-[#7B2276]'
                            : 'bg-slate-50 hover:bg-[#F5EEF8] border-slate-300 hover:border-[#7B2276] text-slate-800'
                        }`}
                      >
                        <GripVertical className={`w-3.5 h-3.5 ${isActive ? 'text-purple-200' : 'text-slate-400'}`} />
                        <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-purple-100' : 'text-[#7B2276]'}`} />
                        <span>{rm}</span>
                        {isCustom && onDeleteClassRoom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeRoomPreset === rm) setActiveRoomPreset('');
                              onDeleteClassRoom(rm);
                              notify(`Usunięto klasę-salę „${rm}”.`);
                            }}
                            title="Usuń klasę-salę"
                            className={`ml-0.5 rounded p-0.5 cursor-pointer ${
                              isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-100 text-rose-500'
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : classTopicsForSubject.length === 0 ? (
              <div className="text-xs text-slate-500 py-1">
                Brak tematów dla klasy {selectedClassId} z wybranego przedmiotu. Dodaj je w
                zakładce „Rozkłady materiału” lub „Organizacja szkoły”.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classTopicsForSubject.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragPayload({ kind: 'topic', topicId: t.id })}
                    onDragEnd={() => {
                      setDragPayload(null);
                      setHoverCell(null);
                    }}
                    className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:border-slate-900 text-xs font-medium text-slate-800 inline-flex items-center gap-2 cursor-grab active:cursor-grabbing select-none shadow-2xs"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color || '#7B2276' }}
                    />
                    <span>
                      {t.order}. {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Mobile day selector */}
      <div className="lg:hidden print:hidden flex items-center gap-1 p-1 bg-slate-100 rounded overflow-x-auto">
        {WEEKDAYS_PL.map((day, idx) => (
          <button
            key={day}
            type="button"
            onClick={() => setMobileDay(idx)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-sm whitespace-nowrap cursor-pointer ${
              mobileDay === idx
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {day.slice(0, 3)} ({WEEKS[weekIdx].dates[idx]})
          </button>
        ))}
      </div>

      {/* Mobile single-day list */}
      <section className="lg:hidden print:hidden border border-slate-200 rounded divide-y divide-slate-100">
        {(() => {
          const mobileCancelled = getCancelledDay(mobileDay);
          if (!mobileCancelled) return null;
          return (
            <div className="p-3 bg-rose-50 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2">
              <span>
                Cały dzień odwołany — Powód: {mobileCancelled.reason}
              </span>
              {canEdit && onRestoreWholeDay && (
                <button
                  type="button"
                  onClick={() => onRestoreWholeDay(mobileCancelled.id, mobileCancelled.classId, mobileCancelled.dayIndex)}
                  className="px-2 py-1 bg-white border border-rose-300 rounded text-[11px] text-rose-700 cursor-pointer"
                >
                  Przywróć
                </button>
              )}
            </div>
          );
        })()}
        {lessonNumbers.map((num) => {
          const slot = getSlot(mobileDay, num);
          const hours = activeLessonHours[num];
          const mobileCancelled = getCancelledDay(mobileDay);
          return (
            <div key={num} className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-20 shrink-0">
                  <div className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                    Nr {num}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {hours.start}–{hours.end}
                  </div>
                </div>
                {slot ? (
                  <div className="min-w-0">
                    <div
                      className={`font-semibold text-sm ${
                        slot.changeType === 'cancelled' || mobileCancelled
                          ? 'line-through text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {slot.subject}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      - {slot.teacher} · {slot.room}
                    </div>
                    {slot.plannedTopic && (
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: slot.plannedTopicColor || '#7B2276' }}
                        />
                        <span>{slot.plannedTopic}</span>
                      </div>
                    )}
                    {slot.changeType === 'substitution' && !mobileCancelled && (
                      <div className="text-xs font-semibold text-amber-800 mt-1">
                        Zastępstwo (za: {slot.originalSubject})
                      </div>
                    )}
                    {slot.changeType === 'moved' && !mobileCancelled && (
                      <div className="text-xs font-semibold text-[#1D70B8] mt-1">
                        Przeniesiona{slot.changeNote ? ` · ${slot.changeNote}` : ''}
                      </div>
                    )}
                    {(slot.changeType === 'cancelled' || mobileCancelled) && (
                      <div className="text-xs font-semibold text-rose-700 mt-1">
                        Odwołane · {mobileCancelled?.reason ?? slot.changeNote ?? 'Lekcja odwołana'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    {mobileCancelled ? `Dzień odwołany (${mobileCancelled.reason})` : 'Brak zajęć'}
                  </div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => openSlotEditor(mobileDay, num, slot)}
                  className="px-2 py-1 text-xs font-semibold text-[#7B2276] border border-[#D8BFE2] rounded shrink-0 cursor-pointer"
                >
                  {slot ? 'Edytuj' : '+ Dodaj'}
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* Desktop 1:1 Librus Synergia matrix: Nr | Godz. | Poniedziałek..Piątek */}
      <section className="hidden lg:block print:block border border-slate-300 rounded overflow-hidden print:overflow-visible print:border-slate-400">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-[#76A815] text-white text-xs font-semibold">
                <th className="py-2.5 px-2 w-12 text-center border-r border-white/25">Nr</th>
                <th className="py-2.5 px-2.5 w-28 text-center border-r border-white/25">Godz.</th>
                {WEEKDAYS_PL.map((day, idx) => {
                  const dayCancelled = getCancelledDay(idx);
                  return (
                    <th
                      key={day}
                      className={`py-2 px-3 text-center border-r border-white/25 last:border-r-0 ${
                        dayCancelled ? 'bg-rose-700 text-white' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{day}</span>
                        {canEdit && onCancelWholeDay && !dayCancelled && (
                          <button
                            type="button"
                            title={`Odwołaj cały dzień (${day})`}
                            onClick={() =>
                              setCancelDayModal({
                                classId: viewMode === 'class' ? selectedClassId : 'ALL',
                                dayIndex: idx,
                                reason: '',
                              })
                            }
                            className="print:hidden p-0.5 rounded hover:bg-white/20 text-white/85 hover:text-white cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] font-mono font-normal opacity-90 tabular-nums">
                        {WEEKS[weekIdx].dates[idx]}.2026
                      </div>
                      {dayCancelled && (
                        <div className="mt-1 px-1.5 py-0.5 rounded bg-white/95 text-rose-800 text-[10px] font-bold leading-tight">
                          ODWOŁANY: {dayCancelled.reason}
                          {canEdit && onRestoreWholeDay && (
                            <button
                              type="button"
                              onClick={() =>
                                onRestoreWholeDay(dayCancelled.id, dayCancelled.classId, dayCancelled.dayIndex)
                              }
                              className="print:hidden block mx-auto mt-0.5 underline text-[9px] text-rose-700 cursor-pointer"
                            >
                              Przywróć dzień
                            </button>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {lessonNumbers.map((num, rowIdx) => {
                const hours = activeLessonHours[num];
                return (
                  <tr key={num} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200 tabular-nums">
                      {num}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 tabular-nums whitespace-nowrap">
                      {hours.start} – {hours.end}
                    </td>
                    {[0, 1, 2, 3, 4].map((dayIdx) => {
                      const slot = getSlot(dayIdx, num);
                      const cellKey = `${dayIdx}-${num}`;
                      const isDropHover = hoverCell === cellKey && editMode && canEdit;
                      const dayCancelled = getCancelledDay(dayIdx);

                      if (!slot) {
                        return (
                          <td
                            key={dayIdx}
                            onDragOver={(e) => {
                              if (editMode && canEdit && dragPayload) {
                                e.preventDefault();
                                setHoverCell(cellKey);
                              }
                            }}
                            onDragLeave={() => hoverCell === cellKey && setHoverCell(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropOnCell(dayIdx, num);
                            }}
                            onClick={() => editMode && canEdit && openSlotEditor(dayIdx, num)}
                            className={`py-3 px-2.5 border-r border-slate-200 last:border-r-0 text-center align-middle transition-colors ${
                              isDropHover
                                ? 'bg-[#EADBF0] ring-2 ring-inset ring-[#7B2276] text-[#7B2276]'
                                : dayCancelled
                                  ? 'bg-rose-50/60 text-rose-500'
                                  : editMode && canEdit
                                    ? 'hover:bg-[#F5EEF8] cursor-pointer text-[#7B2276]'
                                    : 'text-slate-300'
                            }`}
                          >
                            {isDropHover ? (
                              <span className="print:hidden text-[11px] font-bold">Upuść tutaj</span>
                            ) : dayCancelled ? (
                              <span className="text-[10px] font-semibold text-rose-600">
                                Dzień odwołany
                              </span>
                            ) : editMode && canEdit ? (
                              <>
                                <span className="print:hidden inline-flex items-center gap-1 text-[11px] font-medium">
                                  <Plus className="w-3 h-3" /> Dodaj
                                </span>
                                <span className="hidden print:inline text-slate-300">—</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      }

                      const isCan = Boolean(dayCancelled) || (slot.changeType === 'cancelled' && weekIdx === 1);
                      const isSub = !isCan && slot.changeType === 'substitution' && weekIdx === 1;
                      const isMoved = !isCan && slot.changeType === 'moved';
                      const isDraggingThis =
                        dragPayload?.kind === 'slot' && dragPayload.slotId === slot.id;

                      return (
                        <td
                          key={dayIdx}
                          draggable={editMode && canEdit}
                          onDragStart={() => {
                            if (editMode && canEdit) {
                              setDragPayload({ kind: 'slot', slotId: slot.id });
                            }
                          }}
                          onDragEnd={() => {
                            setDragPayload(null);
                            setHoverCell(null);
                          }}
                          onDragOver={(e) => {
                            if (editMode && canEdit && dragPayload) {
                              e.preventDefault();
                              setHoverCell(cellKey);
                            }
                          }}
                          onDragLeave={() => hoverCell === cellKey && setHoverCell(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropOnCell(dayIdx, num);
                          }}
                          onClick={() => editMode && canEdit && openSlotEditor(dayIdx, num, slot)}
                          className={`group relative py-2.5 px-3 border-r border-slate-200 last:border-r-0 align-top transition-colors ${
                            isDropHover
                              ? 'bg-[#EADBF0] ring-2 ring-inset ring-[#7B2276]'
                              : isCan
                                ? 'bg-rose-50/75'
                                : isSub
                                  ? 'bg-amber-50/80'
                                  : isMoved
                                    ? 'bg-sky-50/80'
                                    : ''
                          } ${isDraggingThis ? 'opacity-40' : ''} ${
                            editMode && canEdit
                              ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-inset hover:ring-[#7B2276]'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div
                              className={`font-bold text-[12px] leading-snug ${
                                isCan ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {slot.subject}
                            </div>

                            {canEdit && (
                              <div className="print:hidden flex items-center gap-0.5 shrink-0">
                                {editMode && (
                                  <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <button
                                  type="button"
                                  title="Edytuj lekcję"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSlotEditor(dayIdx, num, slot);
                                  }}
                                  className={`p-0.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer ${
                                    editMode ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Usuń lekcję"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTimetableSlot(slot.id);
                                    notify(`Usunięto lekcję: ${slot.subject}`);
                                  }}
                                  className={`p-0.5 text-rose-500 hover:bg-rose-100 rounded cursor-pointer ${
                                    editMode ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-slate-600 mt-0.5">- {slot.teacher}</div>
                          <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                            {slot.room}
                          </div>

                          {slot.plannedTopic && (
                            <div
                              className="mt-1.5 px-1.5 py-1 rounded border text-[10px] font-semibold text-slate-800 bg-white/90 flex items-start gap-1.5"
                              style={{
                                borderColor: slot.plannedTopicColor || '#7B2276',
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0 mt-1"
                                style={{
                                  backgroundColor: slot.plannedTopicColor || '#7B2276',
                                }}
                              />
                              <span className="leading-tight line-clamp-2">{slot.plannedTopic}</span>
                            </div>
                          )}

                          {isSub && (
                            <div className="mt-1 text-[10px] font-bold text-amber-800 flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>Zastępstwo (za: {slot.originalSubject})</span>
                            </div>
                          )}
                          {isMoved && (
                            <div className="mt-1 text-[10px] font-bold text-[#1D70B8] flex items-start gap-1">
                              <ArrowRightLeft className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>
                                Przeniesiona{slot.changeNote ? ` (${slot.changeNote})` : ''}
                              </span>
                            </div>
                          )}
                          {isCan && (
                            <div className="mt-1 text-[10px] font-bold text-rose-700">
                              Odwołane{slot.changeNote ? ` · ${slot.changeNote}` : ''}
                            </div>
                          )}

                          {canEdit && !editMode && !isCan && onStartLessonFromSlot && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartLessonFromSlot(slot);
                              }}
                              className="print:hidden mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 bg-[#76A815] hover:bg-[#659011] text-white text-[10px] font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>Rozpocznij lekcję</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit / Add lesson modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">
                  Klasa {editingSlot.classId} · {WEEKDAYS_PL[editingSlot.dayIndex]} · Lekcja{' '}
                  {editingSlot.lessonNumber} ({editorLessonHours[editingSlot.lessonNumber]?.start}–
                  {editorLessonHours[editingSlot.lessonNumber]?.end})
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">
                  {editingSlot.id ? 'Edycja lekcji w planie' : 'Dodaj lekcję do planu'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3.5 mt-4 text-sm">
              {editingSlot.fromDropPrompt && (
                <div className="p-2.5 rounded bg-[#FAF5FB] border border-[#D8BFE2] text-xs text-[#521F61] font-medium">
                  Przerzucono <strong>{editingSlot.subject}</strong> na {WEEKDAYS_PL[editingSlot.dayIndex]} (L{editingSlot.lessonNumber}). Wybierz nauczyciela i wpisz klasę, aby zapisać.
                </div>
              )}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Klasa (wpisz lub wybierz)</label>
                  <input
                    type="text"
                    required
                    list="timetable-classes-datalist"
                    value={editingSlot.classId}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, classId: e.target.value })
                    }
                    placeholder="np. 8A, 5A"
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded font-bold uppercase"
                  />
                  <datalist id="timetable-classes-datalist">
                    {journal.classes.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        Klasa {cls.name}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dzień</label>
                  <select
                    value={editingSlot.dayIndex}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, dayIndex: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded"
                  >
                    {WEEKDAYS_PL.map((d, idx) => (
                      <option key={d} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lekcja</label>
                  <select
                    value={editingSlot.lessonNumber}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, lessonNumber: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded font-mono"
                  >
                    {lessonNumbers.map((n) => (
                      <option key={n} value={n}>
                        L{n} ({editorLessonHours[n].start})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Przedmiot</label>
                <select
                  value={editingSlot.subject}
                  onChange={(e) => {
                    const subj = journal.subjects.find((s) => s.name === e.target.value);
                    setEditingSlot({
                      ...editingSlot,
                      subject: e.target.value,
                      teacher: subj?.teacher ?? editingSlot.teacher,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  {journal.subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nauczyciel
                  </label>
                  <select
                    value={
                      teacherSelectOptions.some((t) => t.value === editingSlot.teacher)
                        ? editingSlot.teacher
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditingSlot({ ...editingSlot, teacher: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded mb-1.5"
                  >
                    <option value="">— Wybierz nauczyciela z listy —</option>
                    {teacherSelectOptions.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={editingSlot.teacher}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, teacher: e.target.value })
                    }
                    placeholder="Lub wpisz nauczyciela ręcznie..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Klasa-sala
                  </label>
                  <select
                    value={
                      availableClassRooms.includes(editingSlot.room)
                        ? editingSlot.room
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditingSlot({ ...editingSlot, room: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded mb-1.5"
                  >
                    <option value="">— Wybierz utworzoną klasę-salę —</option>
                    {availableClassRooms.map((rm) => (
                      <option key={rm} value={rm}>
                        {rm}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={editingSlot.room}
                    onChange={(e) => setEditingSlot({ ...editingSlot, room: e.target.value })}
                    placeholder="Lub wpisz np. s. 210"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Planned topic picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#7B2276]" />
                  <span>Zaplanowany temat lekcji (opcjonalnie)</span>
                </label>
                <input
                  type="text"
                  value={editingSlot.plannedTopic}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, plannedTopic: e.target.value })
                  }
                  placeholder="np. Twierdzenie Bézouta"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingSlot.changeType}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      changeType: e.target.value as NonNullable<TimetableLesson['changeType']>,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  <option value="normal">Normalne zajęcia</option>
                  <option value="moved">Przeniesiona</option>
                  <option value="substitution">Zastępstwo</option>
                  <option value="cancelled">Lekcja odwołana</option>
                </select>
              </div>

              {editingSlot.changeType !== 'normal' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Informacja dodatkowa
                  </label>
                  <input
                    type="text"
                    value={editingSlot.changeNote}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, changeNote: e.target.value })
                    }
                    placeholder="np. Przeniesiona z wtorku"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingSlot.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTimetableSlot(editingSlot.id!);
                      setEditingSlot(null);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Usuń lekcję</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                  >
                    Zapisz w planie
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHoursModal && onSaveClassLessonHours && (
        <div className="print:hidden fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Godziny lekcyjne dla klasy
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHoursModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                hoursDirtyRef.current = false;
                onSaveClassLessonHours(hoursClassId, hoursDraft);
                setViewMode('class');
                setSelectedClassId(hoursClassId);
                setShowHoursModal(false);
                notify(`Zapisano indywidualne dzwonki dla klasy ${hoursClassId}.`);
              }}
              className="mt-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">Klasa:</label>
                  <select
                    value={hoursClassId}
                    onChange={(e) => {
                      hoursDirtyRef.current = false;
                      setHoursClassId(e.target.value);
                    }}
                    className="px-3 py-1.5 text-sm font-semibold bg-white border border-slate-300 rounded"
                  >
                    {journal.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Klasa {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    hoursDirtyRef.current = true;
                    setHoursDraft({ ...LESSON_HOURS });
                  }}
                  className="text-xs font-semibold text-[#7B2276] hover:underline cursor-pointer"
                >
                  Przywróć domyślne dzwonki (08:00–15:20)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <div
                    key={num}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  >
                    <span className="font-mono font-bold text-slate-700 w-16 shrink-0">
                      Lekcja {num}
                    </span>
                    <input
                      type="time"
                      value={hoursDraft[num]?.start ?? LESSON_HOURS[num].start}
                      onChange={(e) => {
                        hoursDirtyRef.current = true;
                        const val = e.target.value;
                        setHoursDraft((prev) => ({
                          ...prev,
                          [num]: {
                            start: val,
                            end: prev[num]?.end ?? LESSON_HOURS[num].end,
                          },
                        }));
                      }}
                      className="w-24 px-2 py-1 font-mono bg-white border border-slate-300 rounded text-center"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      value={hoursDraft[num]?.end ?? LESSON_HOURS[num].end}
                      onChange={(e) => {
                        hoursDirtyRef.current = true;
                        const val = e.target.value;
                        setHoursDraft((prev) => ({
                          ...prev,
                          [num]: {
                            start: prev[num]?.start ?? LESSON_HOURS[num].start,
                            end: val,
                          },
                        }));
                      }}
                      className="w-24 px-2 py-1 font-mono bg-white border border-slate-300 rounded text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowHoursModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  Zapisz dzwonki dla klasy {hoursClassId}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Whole Day Modal */}
      {cancelDayModal && onCancelWholeDay && (
        <div className="print:hidden fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Odwołaj cały dzień z powodem
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCancelDayModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!cancelDayModal.reason.trim()) return;
                onCancelWholeDay(
                  cancelDayModal.classId,
                  cancelDayModal.dayIndex,
                  cancelDayModal.reason.trim()
                );
                notify(
                  `Odwołano cały dzień (${WEEKDAYS_PL[cancelDayModal.dayIndex]}, ${cancelDayModal.classId === 'ALL' ? 'wszystkie klasy' : `klasa ${cancelDayModal.classId}`}) — ${cancelDayModal.reason.trim()}.`
                );
                setCancelDayModal(null);
              }}
              className="mt-4 space-y-3.5 text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Klasa</label>
                  <select
                    value={cancelDayModal.classId}
                    onChange={(e) =>
                      setCancelDayModal({ ...cancelDayModal, classId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded font-semibold"
                  >
                    <option value="ALL">Wszystkie klasy (cała szkoła)</option>
                    {journal.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Klasa {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dzień tygodnia
                  </label>
                  <select
                    value={cancelDayModal.dayIndex}
                    onChange={(e) =>
                      setCancelDayModal({ ...cancelDayModal, dayIndex: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded font-semibold"
                  >
                    {WEEKDAYS_PL.map((d, idx) => (
                      <option key={d} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Szybki wybór powodu
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Wycieczka szkolna',
                    'Dzień wolny od zajęć',
                    'Rekolekcje',
                    'Święto szkoły',
                    'Rada Pedagogiczna',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancelDayModal({ ...cancelDayModal, reason: preset })}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-rose-50 hover:text-rose-800 border border-slate-200 rounded cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Powód odwołania całego dnia
                </label>
                <input
                  type="text"
                  required
                  value={cancelDayModal.reason}
                  onChange={(e) =>
                    setCancelDayModal({ ...cancelDayModal, reason: e.target.value })
                  }
                  placeholder="np. Wycieczka szkolna lub Dzień dyrektorski"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancelDayModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Odwołaj cały dzień</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create New School Class Modal */}
      {createClassModal && onCreateClass && (
        <div className="print:hidden fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Utwórz nową klasę (oddział)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateClassModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = createClassModal.name.trim().toUpperCase();
                if (!clean) return;
                onCreateClass(clean, createClassModal.homeroomTeacher.trim() || 'Wychowawca');
                setSelectedClassId(clean);
                setCreateClassModal(null);
                notify(`Utworzono nową klasę: ${clean}.`);
              }}
              className="mt-4 space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Symbol klasy (np. 7A, 6B, 1A)
                </label>
                <input
                  type="text"
                  required
                  value={createClassModal.name}
                  onChange={(e) =>
                    setCreateClassModal({ ...createClassModal, name: e.target.value })
                  }
                  placeholder="np. 7A"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wychowawca klasy
                </label>
                <select
                  value={
                    teacherSelectOptions.some((t) => t.value === createClassModal.homeroomTeacher)
                      ? createClassModal.homeroomTeacher
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      setCreateClassModal({
                        ...createClassModal,
                        homeroomTeacher: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded mb-1.5"
                >
                  <option value="">— Wybierz nauczyciela —</option>
                  {teacherSelectOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={createClassModal.homeroomTeacher}
                  onChange={(e) =>
                    setCreateClassModal({
                      ...createClassModal,
                      homeroomTeacher: e.target.value,
                    })
                  }
                  placeholder="Imię i nazwisko wychowawcy"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateClassModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  Utwórz klasę
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

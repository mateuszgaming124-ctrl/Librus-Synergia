import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Award,
  Ban,
  BookMarked,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Clock,
  Dices,
  Edit3,
  FolderPlus,
  GripVertical,
  KeyRound,
  Megaphone,
  Palette,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Shield,
  Tags,
  Trash2,
  UserPlus,
  Wrench,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  AccountPermissions,
  AnnouncementItem,
  AttendanceStatus,
  BehaviorNote,
  CalendarCategory,
  CalendarEvent,
  GradeCategory,
  GradeEntry,
  HomeworkItem,
  JournalState,
  MaintenanceBreak,
  SchoolClass,
  SyllabusTopic,
  TimetableLesson,
  UserAccount,
  UserRole,
} from '../types/journal';
import { formatDatePl, getLessonHoursForClass, LESSON_HOURS, WEEKDAYS_PL } from '../utils/grades';
import { DEFAULT_GRADE_CATEGORIES } from '../data/initialJournalData';
import {
  getDefaultPermissionsForRole,
  getEffectivePermissions,
  getRoleLabel,
  getRoleMeta,
  getRolePermissionSummary,
  isStudentRole,
  PERMISSION_LABELS,
  ROLE_OPTIONS,
} from '../utils/permissions';
import { CertificateGeneratorView } from './CertificateGeneratorView';

export type StaffSection =
  | 'classes_topics'
  | 'lesson_hours'
  | 'logins'
  | 'certificates'
  | 'director'
  | 'maintenance'
  | 'grades'
  | 'attendance'
  | 'events';

interface StaffPanelViewProps {
  journal: JournalState;
  user: UserAccount;
  accounts: UserAccount[];
  initialSection?: StaffSection;
  onAddGrade: (grade: Omit<GradeEntry, 'id'>) => void;
  onTakeAttendance: (
    date: string,
    lessonNumber: number,
    subjectName: string,
    statusForJan: AttendanceStatus,
    topic: string
  ) => void;
  onAddBehaviorNote: (
    type: 'positive' | 'negative',
    category: string,
    description: string,
    points: number
  ) => void;
  onUpdateBehaviorNote: (note: BehaviorNote) => void;
  onDeleteBehaviorNote: (id: string) => void;
  onAddAnnouncement: (title: string, content: string, pinned: boolean) => void;
  onUpdateAnnouncement: (item: AnnouncementItem) => void;
  onDeleteAnnouncement: (id: string) => void;
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
  onAddHomework: (
    subject: string,
    dueDate: string,
    title: string,
    description: string
  ) => void;
  onUpdateHomework: (item: HomeworkItem) => void;
  onDeleteHomework: (id: string) => void;
  onUpdateTimetableChange: (
    lessonId: string,
    changeType: TimetableLesson['changeType'],
    subjectOverride?: string,
    teacherOverride?: string,
    changeNote?: string
  ) => void;
  onUpdateLuckyNumber: (num: number) => void;
  onUpdateBehaviorGrade: (grade: string) => void;
  onCreateClass: (name: string, homeroomTeacher: string) => void;
  onUpdateClass: (oldClassId: string, newName: string, homeroomTeacher: string) => void;
  onDeleteClass: (classId: string) => void;
  onAddStudentToClass: (classId: string, fullName: string, number: number) => void;
  onDeleteStudentFromClass?: (classId: string, studentId: string) => void;
  onMoveStudentBetweenClasses?: (
    fromClassId: string,
    toClassId: string,
    studentId: string,
    targetNumber?: number
  ) => void;
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
  onCreateAccount: (account: Omit<UserAccount, 'id'>) => void;
  onUpdateAccount: (account: UserAccount) => void;
  onDeleteAccount: (id: string) => void;
  onApplyAutoPermissions?: (targetRole?: UserRole) => void;
  onSaveSubjectFinalGrade: (subjectId: string, finalYear: string) => void;
  onSaveMaintenance?: (maintenance: MaintenanceBreak) => void;
  onCreateSubject?: (name: string, teacher: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onCreateGradeCategory?: (name: string, defaultWeight: number, countsToAverage: boolean) => void;
  onDeleteGradeCategory?: (categoryId: string) => void;
  onSaveClassLessonHours?: (
    classId: string,
    hours: Record<number, { start: string; end: string }>
  ) => void;
  onCancelWholeDay?: (classId: string, dayIndex: number, reason: string) => void;
  onRestoreWholeDay?: (id?: string, classId?: string, dayIndex?: number) => void;
  onTempMoveStudent?: (
    fromClassId: string,
    toClassId: string,
    studentId: string,
    date: string,
    reason?: string
  ) => void;
  onDeleteTempStudent?: (id: string) => void;
  onCreateClassRoom?: (name: string) => void;
  onDeleteClassRoom?: (name: string) => void;
}

const GRADE_OPTIONS = ['6', '5+', '5', '5-', '4+', '4', '4-', '3+', '3', '3-', '2+', '2', '1'];
const BEHAVIOR_GRADES = [
  'Wzorowe',
  'Bardzo dobre',
  'Dobre',
  'Poprawne',
  'Nieodpowiednie',
  'Naganne',
];
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

export const StaffPanelView: React.FC<StaffPanelViewProps> = ({
  journal,
  user,
  accounts,
  initialSection,
  onAddGrade,
  onTakeAttendance,
  onAddBehaviorNote,
  onUpdateBehaviorNote,
  onDeleteBehaviorNote,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onAddCalendarEvent,
  onUpdateCalendarEvent,
  onDeleteCalendarEvent,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  onUpdateTimetableChange,
  onUpdateLuckyNumber,
  onUpdateBehaviorGrade,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onAddStudentToClass,
  onDeleteStudentFromClass,
  onMoveStudentBetweenClasses,
  onAddSyllabusTopic,
  onAddSyllabusTopicsBulk,
  onReorderSyllabusTopic,
  onUpdateSyllabusTopic,
  onDeleteSyllabusTopic,
  onCreateReadyTopic,
  onDeleteReadyTopic,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onApplyAutoPermissions,
  onSaveSubjectFinalGrade,
  onSaveMaintenance,
  onCreateSubject,
  onDeleteSubject,
  onCreateGradeCategory,
  onDeleteGradeCategory,
  onSaveClassLessonHours,
  onCancelWholeDay,
  onRestoreWholeDay,
  onTempMoveStudent,
  onDeleteTempStudent,
  onCreateClassRoom,
  onDeleteClassRoom,
}) => {
  const perms = getEffectivePermissions(user);

  const defaultSection: StaffSection =
    initialSection ??
    (perms.manageAccounts
      ? 'logins'
      : perms.editClassesAndTopics
        ? 'classes_topics'
        : perms.editGrades
          ? 'grades'
          : perms.editAttendance
            ? 'attendance'
            : perms.editCalendar
              ? 'events'
              : perms.editTimetable || perms.editAnnouncements
                ? 'director'
                : 'certificates');

  const [section, setSection] = useState<StaffSection>(defaultSection);

  useEffect(() => {
    if (initialSection) {
      setSection(initialSection);
    }
  }, [initialSection]);

  const [feedback, setFeedback] = useState<string | null>(null);

  // Memoized selectable lists for Homeroom Teachers, Substitutions, Terminarz and Students
  const teacherOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    accounts
      .filter((a) => !isStudentRole(a.role) && a.role !== 'parent')
      .forEach((a) => {
        const cleanName = a.fullName.trim();
        const key = cleanName.toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            value: cleanName,
            label: `${cleanName} (login: ${a.login} · ${getRoleLabel(a.role)})`,
          });
        }
      });
    journal.classes.forEach((c) => {
      const name = c.homeroomTeacher.trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { value: name, label: name });
      }
    });
    journal.subjects.forEach((s) => {
      const name = s.teacher.trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { value: name, label: name });
      }
    });
    return Array.from(map.values());
  }, [accounts, journal.classes, journal.subjects]);

  const studentOptions = useMemo(() => {
    const map = new Map<string, { fullName: string; number?: number; hint?: string }>();
    accounts
      .filter((a) => isStudentRole(a.role))
      .forEach((a) => {
        const key = a.fullName.trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            fullName: a.fullName.trim(),
            number: a.studentNumber,
            hint: a.className ? `Konto · Klasa ${a.className}` : 'Konto ucznia',
          });
        }
      });
    journal.classes.forEach((c) => {
      c.students.forEach((st) => {
        const key = st.fullName.trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            fullName: st.fullName.trim(),
            number: st.number,
            hint: `Klasa ${c.name} · nr ${st.number}`,
          });
        }
      });
    });
    journal.classRoster.forEach((st) => {
      const key = st.fullName.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          fullName: st.fullName.trim(),
          number: st.number,
          hint: `Dziennik · nr ${st.number}`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'pl'));
  }, [accounts, journal.classes, journal.classRoster]);

  // Director: Create Class & ClassRoom
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeacher, setNewClassTeacher] = useState(
    () => teacherOptions[0]?.value ?? 'mgr Piotr Nowak'
  );
  const [newClassRoomName, setNewClassRoomName] = useState('');

  // Director: Add Student to Class
  const [studentTargetClassId, setStudentTargetClassId] = useState(
    journal.classes[0]?.id ?? '3B'
  );
  const [newStudentName, setNewStudentName] = useState(
    () => studentOptions[0]?.fullName ?? ''
  );
  const [newStudentNumber, setNewStudentNumber] = useState(1);

  // Director / Teacher: Move Student between classes (e.g. 8A -> 5A, 1 day or permanent)
  const [moveMode, setMoveMode] = useState<'temp' | 'permanent'>('temp');
  const [moveFromClassId, setMoveFromClassId] = useState(
    () => journal.classes.find((c) => c.students.length > 0)?.id ?? journal.classes[0]?.id ?? ''
  );
  const [moveToClassId, setMoveToClassId] = useState(() => {
    const firstFrom =
      journal.classes.find((c) => c.students.length > 0)?.id ?? journal.classes[0]?.id ?? '';
    return journal.classes.find((c) => c.id !== firstFrom)?.id ?? '';
  });
  const [moveStudentId, setMoveStudentId] = useState(
    () =>
      (journal.classes.find((c) => c.students.length > 0) ?? journal.classes[0])?.students[0]?.id ??
      ''
  );
  const [moveTargetNumber, setMoveTargetNumber] = useState(1);
  const [moveTempDate, setMoveTempDate] = useState('2026-11-20');
  const [moveTempReason, setMoveTempReason] = useState('');
  const [movingStudentModal, setMovingStudentModal] = useState<{
    fromClassId: string;
    fromClassName: string;
    studentId: string;
    fullName: string;
    currentNumber: number;
    toClassId: string;
    targetNumber: number;
    mode: 'temp' | 'permanent';
    date: string;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (!newClassTeacher && teacherOptions.length > 0) {
      setNewClassTeacher(teacherOptions[0].value);
    }
  }, [teacherOptions, newClassTeacher]);

  useEffect(() => {
    if (!newStudentName && studentOptions.length > 0) {
      setNewStudentName(studentOptions[0].fullName);
      if (studentOptions[0].number) {
        setNewStudentNumber(studentOptions[0].number);
      }
    }
  }, [studentOptions, newStudentName]);

  useEffect(() => {
    const classIds = journal.classes.map((c) => c.id);
    if (!classIds.includes(moveFromClassId)) {
      const fallbackFrom =
        journal.classes.find((c) => c.students.length > 0)?.id ?? journal.classes[0]?.id ?? '';
      setMoveFromClassId(fallbackFrom);
      return;
    }
    const sourceCls = journal.classes.find((c) => c.id === moveFromClassId);
    if (sourceCls && !sourceCls.students.some((s) => s.id === moveStudentId)) {
      setMoveStudentId(sourceCls.students[0]?.id ?? '');
    }
    if (!classIds.includes(moveToClassId) || moveToClassId === moveFromClassId) {
      const nextTo = journal.classes.find((c) => c.id !== moveFromClassId)?.id ?? '';
      setMoveToClassId(nextTo);
    }
  }, [journal.classes, moveFromClassId, moveToClassId, moveStudentId]);

  useEffect(() => {
    const destCls = journal.classes.find((c) => c.id === moveToClassId);
    if (destCls) {
      const nextFree = destCls.students.reduce((m, s) => Math.max(m, s.number || 0), 0) + 1;
      setMoveTargetNumber(nextFree);
    }
  }, [moveToClassId, journal.classes]);

  // Director: Create & Select Ready Topics with Color for Class & Subject
  const [topicClassId, setTopicClassId] = useState(journal.classes[0]?.id ?? '3B');
  const [topicSubjectId, setTopicSubjectId] = useState(journal.subjects[0]?.id ?? 'mat');
  const savedReadyTopics = useMemo(
    () => (journal.readyTopics ?? []).filter((rt) => rt.subjectId === topicSubjectId),
    [journal.readyTopics, topicSubjectId]
  );
  const [selectedReadyTopicId, setSelectedReadyTopicId] = useState(
    () => (journal.readyTopics ?? []).find((rt) => rt.subjectId === (journal.subjects[0]?.id ?? 'mat'))?.id ?? ''
  );
  const [newReadyTitle, setNewReadyTitle] = useState('');
  const [newReadyHours, setNewReadyHours] = useState(2);
  const [newReadyColor, setNewReadyColor] = useState('#7B2276');
  const [customTopicMode, setCustomTopicMode] = useState(false);
  const [customTopicTitle, setCustomTopicTitle] = useState('');
  const [topicHours, setTopicHours] = useState(2);
  const [topicColor, setTopicColor] = useState('#7B2276');

  useEffect(() => {
    if (savedReadyTopics.length > 0 && !savedReadyTopics.some((t) => t.id === selectedReadyTopicId)) {
      const first = savedReadyTopics[0];
      setSelectedReadyTopicId(first.id);
      setTopicHours(first.hours);
      setTopicColor(first.color || '#7B2276');
    } else if (savedReadyTopics.length === 0 && selectedReadyTopicId) {
      setSelectedReadyTopicId('');
    }
  }, [savedReadyTopics, selectedReadyTopicId]);

  // Topic drag-and-drop & edit modal
  const [dragTopicId, setDragTopicId] = useState<string | null>(null);
  const [hoverTopicId, setHoverTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<SyllabusTopic | null>(null);

  // Account creation + granular permissions
  const [accFullName, setAccFullName] = useState('');
  const [accRole, setAccRole] = useState<UserRole>('teacher');
  const [accPermissions, setAccPermissions] = useState<AccountPermissions>(
    getDefaultPermissionsForRole('teacher')
  );
  const [accClassName, setAccClassName] = useState(journal.classes[0]?.name ?? '3B');
  const [accStudentNumber, setAccStudentNumber] = useState(15);

  // Per-class lesson hours editor (Director)
  const [hoursClassId, setHoursClassId] = useState(journal.classes[0]?.id ?? '');
  const [hoursDraft, setHoursDraft] = useState<Record<number, { start: string; end: string }>>(() =>
    getLessonHoursForClass(journal, journal.classes[0]?.id ?? '')
  );
  const hoursDirtyRef = useRef(false);
  const lastHoursClassRef = useRef(journal.classes[0]?.id ?? '');

  useEffect(() => {
    if (!hoursClassId) return;
    if (lastHoursClassRef.current !== hoursClassId) {
      lastHoursClassRef.current = hoursClassId;
      hoursDirtyRef.current = false;
      setHoursDraft(getLessonHoursForClass(journal, hoursClassId));
    } else if (!hoursDirtyRef.current) {
      setHoursDraft(getLessonHoursForClass(journal, hoursClassId));
    }
  }, [hoursClassId, journal.classLessonHours]);

  // Subject & Grade category creation states
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjTeacher, setNewSubjTeacher] = useState(
    () => teacherOptions[0]?.value ?? user.fullName
  );
  const [newCatName, setNewCatName] = useState('');
  const [newCatWeight, setNewCatWeight] = useState(2);
  const [newCatCounts, setNewCatCounts] = useState(true);

  useEffect(() => {
    const classIds = journal.classes.map((c) => c.id);
    const firstId = classIds[0] ?? '';
    if (!classIds.includes(studentTargetClassId)) {
      setStudentTargetClassId(firstId);
    }
    if (!classIds.includes(topicClassId)) {
      setTopicClassId(firstId);
    }
    if (!classIds.includes(accClassName)) {
      setAccClassName(firstId);
    }
    if (!classIds.includes(hoursClassId)) {
      setHoursClassId(firstId);
    }
  }, [journal.classes, studentTargetClassId, topicClassId, accClassName, hoursClassId]);
  const [accLogin, setAccLogin] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<UserAccount | null>(null);

  // Class edit and delete modals & roster expand
  const [editingClass, setEditingClass] = useState<{
    id: string;
    name: string;
    homeroomTeacher: string;
  } | null>(null);
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  // Announcement / Calendar / Behavior / Homework inline edit modals
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [editingBehaviorNote, setEditingBehaviorNote] = useState<BehaviorNote | null>(null);
  const [editingHomework, setEditingHomework] = useState<HomeworkItem | null>(null);

  const categoriesList = useMemo(
    () =>
      journal.gradeCategories && journal.gradeCategories.length > 0
        ? journal.gradeCategories
        : DEFAULT_GRADE_CATEGORIES,
    [journal.gradeCategories]
  );

  const allStudents = useMemo(() => {
    const map = new Map<
      string,
      { id: string; number: number; fullName: string; className?: string }
    >();
    journal.classes.forEach((c) => {
      c.students.forEach((st) => {
        if (!map.has(st.id)) {
          map.set(st.id, { ...st, className: c.name });
        }
      });
    });
    journal.classRoster.forEach((st) => {
      if (!map.has(st.id)) {
        map.set(st.id, st);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.number - b.number);
  }, [journal.classes, journal.classRoster]);

  // Grade form
  const [selectedStudentId, setSelectedStudentId] = useState(() => allStudents[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(() => journal.subjects[0]?.id ?? 'mat');
  const [gradeValue, setGradeValue] = useState('5');
  const [gradeWeight, setGradeWeight] = useState(3);
  const [gradeCategory, setGradeCategory] = useState<GradeCategory>(
    () => categoriesList[0]?.name ?? 'Sprawdzian'
  );
  const [gradePeriod, setGradePeriod] = useState<1 | 2>(1);
  const [gradeComment, setGradeComment] = useState('');

  useEffect(() => {
    if (allStudents.length > 0 && !allStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(allStudents[0].id);
    } else if (allStudents.length === 0 && selectedStudentId) {
      setSelectedStudentId('');
    }
  }, [allStudents, selectedStudentId]);

  useEffect(() => {
    if (journal.subjects.length > 0 && !journal.subjects.some((s) => s.id === subjectId)) {
      setSubjectId(journal.subjects[0].id);
    }
  }, [journal.subjects, subjectId]);

  useEffect(() => {
    if (categoriesList.length > 0 && !categoriesList.some((c) => c.name === gradeCategory)) {
      setGradeCategory(categoriesList[0].name);
      setGradeWeight(categoriesList[0].defaultWeight);
    }
  }, [categoriesList, gradeCategory]);

  // Attendance form
  const [attLessonNum, setAttLessonNum] = useState(4);
  const [attSubject, setAttSubject] = useState('Matematyka');
  const [attTopic, setAttTopic] = useState('Funkcje wymierne — ćwiczenia');
  const [rosterStatuses, setRosterStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    allStudents.forEach((s) => {
      init[s.id] = 'ob';
    });
    return init;
  });

  // Behavior / Homework / Calendar form
  const [entryType, setEntryType] = useState<'behavior' | 'calendar' | 'homework'>('behavior');
  const [noteType, setNoteType] = useState<'positive' | 'negative'>('positive');
  const [noteCategory, setNoteCategory] = useState('Pochwała');
  const [notePoints, setNotePoints] = useState(15);
  const [noteDescription, setNoteDescription] = useState('');

  const [calDate, setCalDate] = useState('2026-11-26');
  const [calTitle, setCalTitle] = useState('');
  const [calSubject, setCalSubject] = useState('Matematyka');
  const [calCategory, setCalCategory] = useState<CalendarCategory>('Sprawdzian');
  const [calTeacher, setCalTeacher] = useState(() => teacherOptions[0]?.value ?? user.fullName);
  const [calDesc, setCalDesc] = useState('');

  const [hwSubject, setHwSubject] = useState('Matematyka');
  const [hwDueDate, setHwDueDate] = useState('2026-11-24');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');

  // Director controls state
  const [luckyInput, setLuckyInput] = useState(journal.luckyNumber);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPinned, setAnnPinned] = useState(true);

  const [subLessonId, setSubLessonId] = useState(journal.timetable[0]?.id ?? '');
  const [subChangeType, setSubChangeType] =
    useState<TimetableLesson['changeType']>('substitution');
  const [subSubjectOverride, setSubSubjectOverride] = useState('Godzina z Dyrektorem');
  const [subTeacherOverride, setSubTeacherOverride] = useState(user.fullName);
  const [subNote, setSubNote] = useState('Zastępstwo wyznaczone przez dyrekcję');

  // Cancel whole day state (Director)
  const [cancelDayClassId, setCancelDayClassId] = useState('ALL');
  const [cancelDayIdx, setCancelDayIdx] = useState(4);
  const [cancelDayReason, setCancelDayReason] = useState('');

  // Maintenance break state
  const [maintFrom, setMaintFrom] = useState(journal.maintenance?.from ?? '');
  const [maintTo, setMaintTo] = useState(journal.maintenance?.to ?? '');
  const [maintMessage, setMaintMessage] = useState(
    journal.maintenance?.message || 'Ze względu na nowe udostępnienie'
  );
  const [maintBlockNonDirector, setMaintBlockNonDirector] = useState(
    Boolean(journal.maintenance?.blockNonDirector)
  );

  useEffect(() => {
    if (journal.maintenance) {
      setMaintFrom(journal.maintenance.from ?? '');
      setMaintTo(journal.maintenance.to ?? '');
      if (journal.maintenance.message) {
        setMaintMessage(journal.maintenance.message);
      }
      setMaintBlockNonDirector(Boolean(journal.maintenance.blockNonDirector));
    }
  }, [journal.maintenance]);

  const handleActivateMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: MaintenanceBreak = {
      enabled: true,
      from: maintFrom.trim(),
      to: maintTo.trim(),
      message: maintMessage.trim() || 'Ze względu na nowe udostępnienie',
      blockNonDirector: maintBlockNonDirector,
      updatedBy: user.fullName,
    };
    onSaveMaintenance?.(payload);
    showToast(
      `Włączono przerwę techniczną na pulpicie logowania (${payload.message}${payload.from || payload.to ? ` od ${payload.from || '...'} do ${payload.to || '...'}` : ''}).`
    );
  };

  const handleDisableMaintenance = () => {
    const payload: MaintenanceBreak = {
      enabled: false,
      from: maintFrom.trim(),
      to: maintTo.trim(),
      message: maintMessage.trim() || 'Ze względu na nowe udostępnienie',
      blockNonDirector: maintBlockNonDirector,
      updatedBy: user.fullName,
    };
    onSaveMaintenance?.(payload);
    showToast('Wyłączono przerwę techniczną. Pulpit logowania wrócił do normy.');
  };

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim().toUpperCase();
    if (!trimmed) return;
    if (journal.classes.some((c) => c.name.toUpperCase() === trimmed)) {
      showToast(`Klasa ${trimmed} już istnieje.`);
      return;
    }
    onCreateClass(trimmed, newClassTeacher.trim() || 'Wychowawca');
    setTopicClassId(trimmed);
    setStudentTargetClassId(trimmed);
    setAccClassName(trimmed);
    setNewClassName('');
    showToast(`Utworzono nową klasę: ${trimmed}. Możesz teraz wybrać do niej tematy i konta.`);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    onAddStudentToClass(studentTargetClassId, newStudentName.trim(), newStudentNumber);
    setNewStudentNumber((n) => n + 1);
    showToast(`Dodano ucznia ${newStudentName.trim()} do klasy ${studentTargetClassId}.`);
  };

  const handleMoveStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveFromClassId || !moveToClassId || !moveStudentId) return;
    if (moveFromClassId === moveToClassId) {
      showToast('Wybierz inną klasę docelową.');
      return;
    }
    const fromCls = journal.classes.find((c) => c.id === moveFromClassId);
    const toCls = journal.classes.find((c) => c.id === moveToClassId);
    const st = fromCls?.students.find((s) => s.id === moveStudentId);
    if (!fromCls || !toCls || !st) return;

    if (moveMode === 'temp') {
      if (!onTempMoveStudent || !moveTempDate) return;
      onTempMoveStudent(
        moveFromClassId,
        moveToClassId,
        moveStudentId,
        moveTempDate,
        moveTempReason.trim() || undefined
      );
      setMoveTempReason('');
      showToast(
        `Przypisano ucznia ${st.fullName} z klasy ${fromCls.name} do klasy ${toCls.name} na 1 dzień (${formatDatePl(moveTempDate)}).`
      );
      return;
    }

    if (!onMoveStudentBetweenClasses) return;
    onMoveStudentBetweenClasses(moveFromClassId, moveToClassId, moveStudentId, moveTargetNumber);
    showToast(
      `Przeniesiono ucznia ${st.fullName} z klasy ${fromCls.name} do klasy ${toCls.name} na stałe (nr ${moveTargetNumber}).`
    );
  };

  const handleAddTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedReady = savedReadyTopics.find((t) => t.id === selectedReadyTopicId);
    const titleToUse = customTopicMode
      ? customTopicTitle.trim()
      : (matchedReady?.title.trim() ?? '');
    if (!titleToUse) {
      showToast('Najpierw utwórz gotowy temat z kolorem albo wpisz własny temat.');
      return;
    }
    const colorToUse = customTopicMode ? topicColor : (topicColor || matchedReady?.color || '#7B2276');
    onAddSyllabusTopic(topicClassId, topicSubjectId, titleToUse, topicHours, colorToUse);
    const subjName = journal.subjects.find((s) => s.id === topicSubjectId)?.name ?? '';
    if (customTopicMode) setCustomTopicTitle('');
    showToast(
      `Dodano temat „${titleToUse}” dla klasy ${topicClassId} (${subjName}) w wybranym kolorze.`
    );
  };

  const handleCreateReadyTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReadyTitle.trim();
    if (!trimmed || !onCreateReadyTopic) return;
    onCreateReadyTopic(topicSubjectId, trimmed, newReadyHours, newReadyColor);
    const subjName = journal.subjects.find((s) => s.id === topicSubjectId)?.name ?? '';
    setNewReadyTitle('');
    setTopicHours(newReadyHours);
    setTopicColor(newReadyColor);
    showToast(`Zapisano gotowy temat „${trimmed}” (${subjName}) z kolorem ${newReadyColor}.`);
  };

  const handleQuickAssignTemplate = (tpl: { title: string; hours: number; color?: string }) => {
    onAddSyllabusTopic(
      topicClassId,
      topicSubjectId,
      tpl.title,
      tpl.hours,
      tpl.color || topicColor
    );
    const subjName = journal.subjects.find((s) => s.id === topicSubjectId)?.name ?? '';
    showToast(`Dodano wybrany temat „${tpl.title}” do klasy ${topicClassId} (${subjName}).`);
  };

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLogin = accLogin.trim();
    if (!cleanLogin || !accPassword || !accFullName.trim()) return;
    if (accounts.some((a) => a.login.toLowerCase() === cleanLogin.toLowerCase())) {
      showToast(`Login „${cleanLogin}” jest już zajęty. Wybierz inny.`);
      return;
    }

    const roleLabel = getRoleLabel(accRole);
    const roleSubtitle = isStudentRole(accRole)
      ? `${roleLabel} · Klasa ${accClassName} · nr ${accStudentNumber}`
      : `${roleLabel} · Klasa ${accClassName}`;

    onCreateAccount({
      login: cleanLogin,
      password: accPassword,
      role: accRole,
      fullName: accFullName.trim(),
      subtitle: roleSubtitle,
      schoolName: '',
      className: accClassName,
      studentNumber: isStudentRole(accRole) ? accStudentNumber : undefined,
      authProvider: 'synergia',
      permissions: accPermissions,
    });

    setAccFullName('');
    setAccLogin('');
    setAccPassword('');
    showToast(
      `Utworzono konto (${roleLabel}): login „${cleanLogin}” (${accFullName.trim()}) dla klasy ${accClassName}.`
    );
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;
    const subj = journal.subjects.find((s) => s.id === subjectId);
    const student = allStudents.find((s) => s.id === selectedStudentId);
    const catMeta = categoriesList.find((c) => c.name === gradeCategory);
    onAddGrade({
      subjectId,
      value: gradeValue,
      weight: gradeWeight,
      category: gradeCategory,
      period: gradePeriod,
      date: '2026-11-20',
      teacher: user.fullName,
      comment:
        gradeComment.trim() ||
        (student ? `${student.fullName} · Wpisano przez: ${user.fullName}` : `Wpisano przez: ${user.fullName}`),
      countsToAverage: catMeta?.countsToAverage !== false,
    });
    setGradeComment('');
    showToast(
      `Wystawiono ocenę ${gradeValue} z przedmiotu ${subj?.name ?? ''}${
        student ? ` dla ucznia: ${student.fullName}` : ''
      }.`
    );
  };

  const handleAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstStudentId = allStudents[0]?.id;
    const statusVal = (firstStudentId ? rosterStatuses[firstStudentId] : undefined) ?? 'ob';
    onTakeAttendance('2026-11-20', attLessonNum, attSubject, statusVal, attTopic);
    showToast(
      `Zapisano frekwencję dla lekcji ${attLessonNum} (${attSubject}).`
    );
  };

  const handleCreateSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubjName.trim();
    if (!trimmed) return;
    if (journal.subjects.some((s) => s.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Przedmiot „${trimmed}” już istnieje.`);
      return;
    }
    onCreateSubject?.(trimmed, newSubjTeacher.trim() || user.fullName);
    setNewSubjName('');
    showToast(`Dodano nowy przedmiot: ${trimmed}.`);
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categoriesList.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Kategoria „${trimmed}” już istnieje.`);
      return;
    }
    onCreateGradeCategory?.(trimmed, newCatWeight, newCatCounts);
    setNewCatName('');
    showToast(`Dodano nową kategorię ocen: ${trimmed}.`);
  };

  const handleSaveHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoursClassId) return;
    hoursDirtyRef.current = false;
    onSaveClassLessonHours?.(hoursClassId, hoursDraft);
    showToast(`Zapisano indywidualne dzwonki dla klasy ${hoursClassId}.`);
  };

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entryType === 'behavior') {
      if (!noteDescription.trim()) return;
      onAddBehaviorNote(
        noteType,
        noteCategory,
        noteDescription.trim(),
        noteType === 'positive' ? Math.abs(notePoints) : -Math.abs(notePoints)
      );
      setNoteDescription('');
      showToast('Dodano wpis zachowania do dziennika ucznia.');
    } else if (entryType === 'calendar') {
      if (!calTitle.trim()) return;
      onAddCalendarEvent(
        calDate,
        calTitle.trim(),
        calSubject,
        calCategory,
        calDesc.trim(),
        undefined,
        calTeacher || undefined
      );
      setCalTitle('');
      setCalDesc('');
      showToast('Dodano wydarzenie do terminarza.');
    } else {
      if (!hwTitle.trim()) return;
      onAddHomework(hwSubject, hwDueDate, hwTitle.trim(), hwDesc.trim());
      setHwTitle('');
      setHwDesc('');
      showToast('Zadanie domowe zostało opublikowane dla klasy 3B.');
    }
  };

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    onAddAnnouncement(annTitle.trim(), annContent.trim(), annPinned);
    setAnnTitle('');
    setAnnContent('');
    showToast('Ogłoszenie dyrekcji zostało opublikowane w dzienniku.');
  };

  const handleTimetableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subLessonId) return;
    onUpdateTimetableChange(
      subLessonId,
      subChangeType,
      subChangeType === 'substitution' ? subSubjectOverride : undefined,
      subChangeType === 'substitution' ? subTeacherOverride : undefined,
      subNote
    );
    showToast('Zaktualizowano plan lekcji.');
  };

  const filteredTopicsPreview = journal.syllabusTopics
    .filter((t) => t.classId === topicClassId && t.subjectId === topicSubjectId)
    .sort((a, b) => a.order - b.order);

  const manageableAccounts = accounts.filter((a) => a.id !== 'acc-director');

  const renderClassLessonHoursCard = () => (
    <section className="border border-slate-200 rounded-md p-5 bg-white space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#7B2276]" />
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Godziny lekcyjne (dzwonki) dla klasy
            </h2>
            <p className="text-xs text-slate-500">
              Ustaw indywidualne godziny rozpoczęcia i zakończenia lekcji dla wybranej klasy (np. dla 8A lekcja 1: 16:00–16:45)
            </p>
          </div>
        </div>
        {hoursClassId && (
          <button
            type="button"
            onClick={() => {
              hoursDirtyRef.current = false;
              setHoursDraft({ ...LESSON_HOURS });
              onSaveClassLessonHours?.(hoursClassId, { ...LESSON_HOURS });
              showToast(`Przywrócono domyślne godziny dzwonków dla klasy ${hoursClassId}.`);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
          >
            Przywróć domyślne
          </button>
        )}
      </div>

      {journal.classes.length === 0 ? (
        <div className="text-xs text-slate-500 p-4 border border-dashed border-slate-300 rounded text-center">
          Najpierw utwórz klasę w module „Klasy i wybór tematów”, aby ustawić dla niej godziny lekcji.
        </div>
      ) : (
        <form onSubmit={handleSaveHoursSubmit} className="space-y-4">
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wybierz klasę
            </label>
            <select
              value={hoursClassId}
              onChange={(e) => {
                hoursDirtyRef.current = false;
                setHoursClassId(e.target.value);
              }}
              className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded"
            >
              {journal.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Klasa {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
              const fallback = LESSON_HOURS[num] ?? { start: '08:00', end: '08:45' };
              const slot = hoursDraft[num] ?? fallback;
              return (
                <div
                  key={num}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1.5"
                >
                  <div className="text-xs font-bold text-[#7B2276]">Lekcja {num}</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) => {
                        hoursDirtyRef.current = true;
                        const val = e.target.value;
                        setHoursDraft((prev) => ({
                          ...prev,
                          [num]: {
                            start: val,
                            end: prev[num]?.end ?? fallback.end,
                          },
                        }));
                      }}
                      className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                    />
                    <span className="text-slate-400 text-xs">–</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) => {
                        hoursDirtyRef.current = true;
                        const val = e.target.value;
                        setHoursDraft((prev) => ({
                          ...prev,
                          [num]: {
                            start: prev[num]?.start ?? fallback.start,
                            end: val,
                          },
                        }));
                      }}
                      className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Zapisz dzwonki dla klasy {hoursClassId}</span>
          </button>
        </form>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="print:hidden pb-4 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#7B2276]" />
              <h1 className="font-display text-xl font-bold text-slate-900">
                Organizacja szkoły
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Konta i loginy Synergii, rangi, uprawnienia, oddziały, tematy, zastępstwa i wzory świadectw
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Wszystkie zmiany zapisują się automatycznie</span>
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center">
          <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded border border-slate-200 self-start">
            {perms.editClassesAndTopics && (
              <button
                type="button"
                onClick={() => setSection('classes_topics')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'classes_topics'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Klasy i wybór tematów
              </button>
            )}
            {perms.manageAccounts && (
              <button
                type="button"
                onClick={() => setSection('logins')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'logins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Konta, rangi i uprawnienia
              </button>
            )}
            {perms.generateCertificates && (
              <button
                type="button"
                onClick={() => setSection('certificates')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'certificates'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Wzory świadectw
              </button>
            )}
            {(perms.editTimetable || perms.editAnnouncements) && (
              <button
                type="button"
                onClick={() => setSection('director')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'director' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Zastępstwa i ogłoszenia
              </button>
            )}
            {(perms.editTimetable || perms.editClassesAndTopics || user.role === 'director') && (
              <button
                type="button"
                onClick={() => setSection('lesson_hours')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  section === 'lesson_hours'
                    ? 'bg-white text-[#7B2276] shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Godziny lekcji</span>
              </button>
            )}
            {(user.role === 'director' || perms.manageAccounts || perms.editAnnouncements) && (
              <button
                type="button"
                onClick={() => setSection('maintenance')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  section === 'maintenance'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : journal.maintenance?.enabled
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-slate-600'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>
                  Przerwa techniczna{journal.maintenance?.enabled ? ' (Aktywna)' : ''}
                </span>
              </button>
            )}
            {perms.editGrades && (
              <button
                type="button"
                onClick={() => setSection('grades')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'grades' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Oceny
              </button>
            )}
            {perms.editAttendance && (
              <button
                type="button"
                onClick={() => setSection('attendance')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Frekwencja
              </button>
            )}
            {perms.editCalendar && (
              <button
                type="button"
                onClick={() => setSection('events')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer whitespace-nowrap ${
                  section === 'events' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Terminarz, uwagi i zadania
              </button>
            )}
          </div>
          </div>

        {feedback && (
          <div className="mt-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </section>

      {section === 'lesson_hours' &&
        (perms.editTimetable || perms.editClassesAndTopics || user.role === 'director') && (
          <div className="space-y-6">{renderClassLessonHoursCard()}</div>
        )}

      {/* CLASSES & SELECTABLE SUBJECT TOPICS WITH COLOR */}
      {perms.editClassesAndTopics && section === 'classes_topics' && (
        <div className="space-y-6">
          {/* Top Full-Width Class Management Card */}
          <section className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-xs">
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-[#FAF5FB] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FolderPlus className="w-5 h-5 text-[#7B2276]" />
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Oddziały szkolne — Edycja i Usuwanie klas ({journal.classes.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Zarządzaj klasami w szkole: kliknij „Edytuj” lub czerwony przycisk „Usuń klasę”
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {journal.classes.map((cls) => {
                const isExpanded = expandedClassId === cls.id;
                return (
                  <div
                    key={cls.id}
                    className="p-3.5 bg-white border-2 border-slate-200 hover:border-[#7B2276]/40 rounded-md shadow-xs flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2.5 py-0.5 bg-[#8D2877] text-white text-xs font-bold rounded">
                          Klasa {cls.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {cls.students.length} uczniów {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                      <div className="text-xs text-slate-700">
                        <span className="text-slate-500">Wychowawca:</span>{' '}
                        <strong className="text-slate-900">{cls.homeroomTeacher}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingClass({
                            id: cls.id,
                            name: cls.name,
                            homeroomTeacher: cls.homeroomTeacher,
                          })
                        }
                        title="Edytuj nazwę i wychowawcę"
                        className="flex-1 py-1.5 px-2 text-xs font-semibold text-[#7B2276] bg-[#F5EEF8] hover:bg-[#EBDCF2] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edytuj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingClass(cls)}
                        title={`Usuń oddział: Klasa ${cls.name}`}
                        className="flex-1 py-1.5 px-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usuń klasę</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Uczniowie w klasie ({cls.students.length}):
                        </div>
                        {cls.students.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">Brak uczniów.</div>
                        ) : (
                          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                            {cls.students.map((st) => (
                              <div
                                key={st.id}
                                className="text-[11px] flex items-center justify-between bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                              >
                                <span className="truncate">
                                  <strong>{st.number}.</strong> {st.fullName}
                                </span>
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  {onMoveStudentBetweenClasses && journal.classes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const otherCls = journal.classes.find((c) => c.id !== cls.id);
                                        const nextNum = otherCls
                                          ? otherCls.students.reduce((m, s) => Math.max(m, s.number || 0), 0) + 1
                                          : 1;
                                        setMovingStudentModal({
                                          fromClassId: cls.id,
                                          fromClassName: cls.name,
                                          studentId: st.id,
                                          fullName: st.fullName,
                                          currentNumber: st.number,
                                          toClassId: otherCls?.id ?? '',
                                          targetNumber: nextNum,
                                          mode: 'temp',
                                          date: '2026-11-20',
                                          reason: '',
                                        });
                                      }}
                                      title="Przenieś ucznia do innej klasy"
                                      className="text-[#7B2276] hover:bg-[#F5EEF8] p-0.5 rounded cursor-pointer"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {onDeleteStudentFromClass && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteStudentFromClass(cls.id, st.id)}
                                      title="Wypisz ucznia"
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left column: Create Class + Add Student */}
          <div className="xl:col-span-5 space-y-6">
            <section className="border border-slate-200 rounded-md p-5 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <FolderPlus className="w-5 h-5 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Utwórz nową klasę (np. A, 1A, 2B)
                </h2>
              </div>

              <form onSubmit={handleCreateClassSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Symbol klasy
                    </label>
                    <input
                      type="text"
                      required
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="np. A lub 1A"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wybierz wychowawcę
                    </label>
                    <select
                      value={newClassTeacher}
                      onChange={(e) => setNewClassTeacher(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                    >
                      {teacherOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Utwórz klasę</span>
                </button>
              </form>

              {onCreateClassRoom && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Utwórz klasę-salę (salę lekcyjną do planu lekcji)
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newClassRoomName}
                      onChange={(e) => setNewClassRoomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newClassRoomName.trim()) {
                          e.preventDefault();
                          onCreateClassRoom(newClassRoomName.trim());
                          showToast(`Utworzono klasę-salę: ${newClassRoomName.trim()}.`);
                          setNewClassRoomName('');
                        }
                      }}
                      placeholder="np. s. 210, Gabinet fizyczny"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newClassRoomName.trim()) return;
                        onCreateClassRoom(newClassRoomName.trim());
                        showToast(`Utworzono klasę-salę: ${newClassRoomName.trim()}.`);
                        setNewClassRoomName('');
                      }}
                      className="px-3 py-1.5 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded cursor-pointer whitespace-nowrap"
                    >
                      + Dodaj salę
                    </button>
                  </div>
                  {(journal.classRooms ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(journal.classRooms ?? []).map((rm) => (
                        <span
                          key={rm}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700"
                        >
                          <span>{rm}</span>
                          {onDeleteClassRoom && (
                            <button
                              type="button"
                              onClick={() => onDeleteClassRoom(rm)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Usuń klasę-salę"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Istniejące klasy w szkole ({journal.classes.length}):
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Edytuj lub usuwaj oddziały szkolne
                  </span>
                </div>
                <div className="space-y-2">
                  {journal.classes.map((cls) => {
                    const isExpanded = expandedClassId === cls.id;
                    return (
                      <div
                        key={cls.id}
                        className="p-3 bg-white border border-slate-200 rounded shadow-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#F5EEF8] border border-[#E4CAEC] text-[#7B2276] font-bold rounded">
                              Klasa {cls.name}
                            </span>
                            <span className="text-slate-600 font-medium">
                              Wychowawca: <strong className="text-slate-900">{cls.homeroomTeacher}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer tabular-nums"
                            >
                              {cls.students.length} uczniów {isExpanded ? '▲' : '▼'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingClass({
                                  id: cls.id,
                                  name: cls.name,
                                  homeroomTeacher: cls.homeroomTeacher,
                                })
                              }
                              title="Edytuj nazwę klasy i wychowawcę"
                              className="px-2 py-1 text-[11px] font-semibold text-[#7B2276] hover:bg-[#F5EEF8] border border-[#E4CAEC] rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edytuj</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingClass(cls)}
                              title={`Usuń oddział: Klasa ${cls.name}`}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs rounded inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Usuń klasę</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded student roster for this class */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-[11px] font-semibold text-slate-500 mb-1">
                              Lista uczniów w klasie {cls.name}:
                            </div>
                            {cls.students.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic py-1">
                                Brak dopisanych uczniów. Użyj formularza poniżej, aby dopisać uczniów.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                {cls.students.map((st) => (
                                  <div
                                    key={st.id}
                                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-[11px]"
                                  >
                                    <span className="truncate">
                                      <strong className="font-mono text-slate-600 mr-1.5">
                                        {st.number}.
                                      </strong>
                                      {st.fullName}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      {onMoveStudentBetweenClasses && journal.classes.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const otherCls = journal.classes.find((c) => c.id !== cls.id);
                                            const nextNum = otherCls
                                              ? otherCls.students.reduce((m, s) => Math.max(m, s.number || 0), 0) + 1
                                              : 1;
                                            setMovingStudentModal({
                                              fromClassId: cls.id,
                                              fromClassName: cls.name,
                                              studentId: st.id,
                                              fullName: st.fullName,
                                              currentNumber: st.number,
                                              toClassId: otherCls?.id ?? '',
                                              targetNumber: nextNum,
                                              mode: 'temp',
                                              date: '2026-11-20',
                                              reason: '',
                                            });
                                          }}
                                          title="Przenieś ucznia do innej klasy"
                                          className="text-[#7B2276] hover:bg-[#F5EEF8] p-0.5 rounded cursor-pointer"
                                        >
                                          <ArrowRightLeft className="w-3 h-3" />
                                        </button>
                                      )}
                                      {onDeleteStudentFromClass && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteStudentFromClass(cls.id, st.id);
                                            showToast(`Usunięto ucznia ${st.fullName} z klasy ${cls.name}`);
                                          }}
                                          title="Wypisz ucznia z klasy"
                                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Add student to a class */}
            <section className="border border-slate-200 rounded-md p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Dopisz ucznia do klasy
                </h2>
              </div>
              <form onSubmit={handleAddStudentSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Klasa</label>
                    <select
                      value={studentTargetClassId}
                      onChange={(e) => setStudentTargetClassId(e.target.value)}
                      className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded"
                    >
                      {journal.classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wybierz ucznia z listy
                    </label>
                    <select
                      required
                      value={newStudentName}
                      onChange={(e) => {
                        const chosen = e.target.value;
                        setNewStudentName(chosen);
                        const found = studentOptions.find((s) => s.fullName === chosen);
                        if (found?.number) {
                          setNewStudentNumber(found.number);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                    >
                      {studentOptions.length === 0 ? (
                        <option value="">Brak uczniów — utwórz najpierw konto ucznia</option>
                      ) : (
                        studentOptions.map((st) => (
                          <option key={st.fullName} value={st.fullName}>
                            {st.fullName}
                            {st.hint ? ` (${st.hint})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="w-28">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nr w dzienniku
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={newStudentNumber}
                      onChange={(e) => setNewStudentNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded cursor-pointer"
                  >
                    Dodaj ucznia
                  </button>
                </div>
              </form>
            </section>

            {/* Move student from one class to another (1-day guest or permanent e.g. 8A -> 5A) */}
            {(onMoveStudentBetweenClasses || onTempMoveStudent) && (
              <section className="border border-slate-200 rounded-md p-5 bg-[#FAF5FB]/60 space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-[#7B2276]" />
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Przenieś / przypisz ucznia z klasy do klasy
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Daj ucznia do innej klasy na 1 dzień (gościnnie, np. z 8A do 5A) albo przenieś na stałe
                    </p>
                  </div>
                </div>

                {journal.classes.length < 2 ? (
                  <div className="p-3 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded text-center">
                    Utwórz co najmniej dwie klasy, aby móc przenosić uczniów między nimi.
                  </div>
                ) : (
                  <form onSubmit={handleMoveStudentSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-[#D8BFE2] rounded">
                      <button
                        type="button"
                        onClick={() => setMoveMode('temp')}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-sm cursor-pointer transition-colors ${
                          moveMode === 'temp'
                            ? 'bg-[#7B2276] text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Na 1 dzień (gościnnie)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMoveMode('permanent')}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-sm cursor-pointer transition-colors ${
                          moveMode === 'permanent'
                            ? 'bg-[#7B2276] text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Na stałe (zmiana klasy)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Z klasy (źródłowej)
                        </label>
                        <select
                          value={moveFromClassId}
                          onChange={(e) => setMoveFromClassId(e.target.value)}
                          className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded font-semibold"
                        >
                          {journal.classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              Klasa {cls.name} ({cls.students.length})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Do klasy (docelowej)
                        </label>
                        <select
                          value={moveToClassId}
                          onChange={(e) => setMoveToClassId(e.target.value)}
                          className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded font-semibold text-[#7B2276]"
                        >
                          {journal.classes
                            .filter((cls) => cls.id !== moveFromClassId)
                            .map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                Klasa {cls.name} ({cls.students.length})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const sourceStudents =
                        journal.classes.find((c) => c.id === moveFromClassId)?.students ?? [];
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Wybierz ucznia z klasy {moveFromClassId}
                            </label>
                            <select
                              required
                              value={moveStudentId}
                              onChange={(e) => setMoveStudentId(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                            >
                              {sourceStudents.length === 0 ? (
                                <option value="">Brak uczniów w wybranej klasie</option>
                              ) : (
                                sourceStudents.map((st) => (
                                  <option key={st.id} value={st.id}>
                                    {st.number}. {st.fullName}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                          {moveMode === 'temp' ? (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Na dzień (data)
                              </label>
                              <input
                                type="date"
                                required
                                value={moveTempDate}
                                onChange={(e) => setMoveTempDate(e.target.value)}
                                className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Nowy nr w klasie
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={moveTargetNumber}
                                onChange={(e) => setMoveTargetNumber(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {moveMode === 'temp' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Powód / uwaga na ten dzień (opcjonalnie)
                        </label>
                        <input
                          type="text"
                          value={moveTempReason}
                          onChange={(e) => setMoveTempReason(e.target.value)}
                          placeholder="np. Opieka podczas wycieczki klasy / zajęcia łączone"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        !moveStudentId || !moveToClassId || moveFromClassId === moveToClassId
                      }
                      className="px-4 py-2 bg-[#76A815] hover:bg-[#659011] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>
                        {moveMode === 'temp'
                          ? `Przypisz z ${moveFromClassId} do ${moveToClassId} na 1 dzień (${formatDatePl(moveTempDate)})`
                          : `Przenieś na stałe z ${moveFromClassId} do ${moveToClassId}`}
                      </span>
                    </button>
                  </form>
                )}

                {(journal.temporaryTransfers ?? []).length > 0 && (
                  <div className="pt-3 border-t border-[#D8BFE2] space-y-2">
                    <div className="text-xs font-bold text-[#521F61]">
                      Uczniowie przypisani do innej klasy na 1 dzień ({(journal.temporaryTransfers ?? []).length}):
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {(journal.temporaryTransfers ?? []).map((tr) => (
                        <div
                          key={tr.id}
                          className="p-2.5 bg-white border border-slate-200 rounded flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {tr.studentName}{' '}
                              <span className="font-mono text-[#7B2276]">
                                ({tr.fromClassId} → {tr.toClassId})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Data: <strong className="font-mono">{formatDatePl(tr.date)}</strong>
                              {tr.reason ? ` · ${tr.reason}` : ''}
                            </div>
                          </div>
                          {onDeleteTempStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTempStudent(tr.id);
                                showToast(`Cofnięto 1-dniowe przeniesienie ucznia ${tr.studentName}.`);
                              }}
                              title="Cofnij przeniesienie na 1 dzień"
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer shrink-0"
                            >
                              Cofnij
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right column: Create Ready Topics with Color + Assign to Class & Subject */}
          <div className="xl:col-span-7">
            <section className="border border-slate-200 rounded-md p-5 bg-white space-y-5">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-[#7B2276]" />
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Gotowe tematy z kolorem i wybór tematów do klasy
                  </h2>
                  <p className="text-xs text-slate-500">
                    Twórz własne gotowe tematy z wybranym kolorem, a następnie wybieraj je do wybranej klasy i przedmiotu
                  </p>
                </div>
              </div>

              {/* Creator form for Ready Topics with Color */}
              <form
                onSubmit={handleCreateReadyTopicSubmit}
                className="p-4 bg-[#FAF5FB] border border-[#D8BFE2] rounded space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#521F61]">
                    Stwórz gotowy temat z kolorem ({journal.subjects.find((s) => s.id === topicSubjectId)?.name})
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Zapisane gotowe tematy są dostępne u każdego nauczyciela
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nazwa gotowego tematu
                    </label>
                    <input
                      type="text"
                      required
                      value={newReadyTitle}
                      onChange={(e) => setNewReadyTitle(e.target.value)}
                      placeholder="np. Funkcja liniowa — wykres i własności"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Godziny
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newReadyHours}
                      onChange={(e) => setNewReadyHours(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kolor gotowego tematu
                    </label>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2 py-1.5">
                      {TOPIC_COLORS.slice(0, 5).map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setNewReadyColor(col)}
                          className={`w-5 h-5 rounded-full cursor-pointer ${
                            newReadyColor === col ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                      <input
                        type="color"
                        value={newReadyColor}
                        onChange={(e) => setNewReadyColor(e.target.value)}
                        className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer ml-auto"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Zapisz gotowy temat z kolorem</span>
                </button>
              </form>

              <form onSubmit={handleAddTopicSubmit} className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wybierz klasę
                    </label>
                    <select
                      value={topicClassId}
                      onChange={(e) => setTopicClassId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold"
                    >
                      {journal.classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          Klasa {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wybierz przedmiot
                    </label>
                    <select
                      value={topicSubjectId}
                      onChange={(e) => setTopicSubjectId(e.target.value)}
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
                      Wymiar godzin
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={topicHours}
                      onChange={(e) => setTopicHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#7B2276]" />
                    <span>Kolor tematu w rozkładzie klasy {topicClassId}</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-300 rounded px-3 py-2">
                    {TOPIC_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setTopicColor(col)}
                        aria-label={`Wybierz kolor ${col}`}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                          topicColor === col ? 'ring-2 ring-offset-1 ring-slate-900 scale-110' : ''
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                    <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <span>Własny:</span>
                      <input
                        type="color"
                        value={topicColor}
                        onChange={(e) => setTopicColor(e.target.value)}
                        className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Selectable Ready Topics vs optional Custom */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      {customTopicMode
                        ? 'Własna treść tematu'
                        : `Wybierz gotowy temat z kolorem (${savedReadyTopics.length}):`}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomTopicMode((v) => !v)}
                      className="text-xs font-semibold text-[#7B2276] hover:underline cursor-pointer"
                    >
                      {customTopicMode ? '← Wróć do wyboru gotowego tematu' : 'Wpisz własny temat'}
                    </button>
                  </div>

                  {!customTopicMode ? (
                    <div className="space-y-2.5">
                      {savedReadyTopics.length === 0 ? (
                        <div className="p-3.5 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded text-center">
                          Brak zapisanych gotowych tematów dla tego przedmiotu. Utwórz gotowy temat z kolorem powyżej albo kliknij „Wpisz własny temat”.
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedReadyTopicId}
                            onChange={(e) => {
                              setSelectedReadyTopicId(e.target.value);
                              const match = savedReadyTopics.find((t) => t.id === e.target.value);
                              if (match) {
                                setTopicHours(match.hours);
                                setTopicColor(match.color || '#7B2276');
                              }
                            }}
                            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded font-medium text-slate-900"
                          >
                            {savedReadyTopics.map((rt) => (
                              <option key={rt.id} value={rt.id}>
                                {rt.title} ({rt.hours} godz.)
                              </option>
                            ))}
                          </select>

                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <span className="text-[11px] text-slate-500">
                                Szybkie dodawanie kliknięciem (zachowuje zapisany kolor):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onAddSyllabusTopicsBulk) {
                                    onAddSyllabusTopicsBulk(
                                      topicClassId,
                                      topicSubjectId,
                                      savedReadyTopics.map((rt) => ({
                                        title: rt.title,
                                        hours: rt.hours,
                                        color: rt.color || topicColor,
                                      }))
                                    );
                                  } else {
                                    savedReadyTopics.forEach((rt) => {
                                      if (!filteredTopicsPreview.some((t) => t.title === rt.title)) {
                                        onAddSyllabusTopic(
                                          topicClassId,
                                          topicSubjectId,
                                          rt.title,
                                          rt.hours,
                                          rt.color || topicColor
                                        );
                                      }
                                    });
                                  }
                                  showToast(
                                    `Dodano gotowe tematy do klasy ${topicClassId}!`
                                  );
                                }}
                                className="px-2.5 py-1 bg-[#76A815] hover:bg-[#659011] text-white text-[11px] font-semibold rounded cursor-pointer"
                              >
                                + Dodaj wszystkie gotowe ({savedReadyTopics.length})
                              </button>
                            </div>
                            <div className="max-h-56 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                              {savedReadyTopics.map((rt) => {
                                const alreadyAdded = filteredTopicsPreview.some(
                                  (t) => t.title === rt.title
                                );
                                return (
                                  <div
                                    key={rt.id}
                                    className={`inline-flex items-center rounded border text-xs font-medium overflow-hidden transition-colors ${
                                      alreadyAdded
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-white border-slate-300 text-slate-700 hover:border-[#7B2276] hover:bg-[#F5EEF8]'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAssignTemplate(rt)}
                                      className="px-2.5 py-1.5 inline-flex items-center gap-1.5 text-left cursor-pointer"
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: rt.color || topicColor }}
                                      />
                                      <span>{alreadyAdded ? `✓ ${rt.title}` : `+ ${rt.title}`}</span>
                                    </button>
                                    {onDeleteReadyTopic && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteReadyTopic(rt.id);
                                          showToast(`Usunięto gotowy temat: ${rt.title}`);
                                        }}
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
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={customTopicTitle}
                      onChange={(e) => setCustomTopicTitle(e.target.value)}
                      placeholder="np. Wprowadzenie do funkcji wykładniczej"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Dodaj wybrany temat do klasy {topicClassId}</span>
                </button>
              </form>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Tematy przypisane do klasy {topicClassId} (
                    {journal.subjects.find((s) => s.id === topicSubjectId)?.name}):
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Przeciągnij wiersz, aby zmienić kolejność
                  </span>
                </div>
                {filteredTopicsPreview.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 border border-dashed border-slate-300 rounded text-center">
                    Brak tematów dla tej klasy i przedmiotu. Kliknij temat powyżej, aby go dodać.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {filteredTopicsPreview.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragTopicId(t.id)}
                        onDragEnd={() => {
                          setDragTopicId(null);
                          setHoverTopicId(null);
                        }}
                        onDragOver={(e) => {
                          if (dragTopicId) {
                            e.preventDefault();
                            setHoverTopicId(t.id);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragTopicId && dragTopicId !== t.id) {
                            onReorderSyllabusTopic(topicClassId, topicSubjectId, dragTopicId, t.id);
                          }
                          setDragTopicId(null);
                          setHoverTopicId(null);
                        }}
                        className={`px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                          hoverTopicId === t.id && dragTopicId !== t.id
                            ? 'bg-[#F5EEF8]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab shrink-0" />
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: t.color || '#7B2276' }}
                          />
                          <span className="font-mono text-slate-400">{t.order}.</span>
                          <span className="font-medium text-slate-900 truncate">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-mono text-slate-500 tabular-nums">
                            {t.hours} godz.
                          </span>
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
                            onClick={() => {
                              onDeleteSyllabusTopic(t.id);
                              showToast(`Usunięto temat: ${t.title}`);
                            }}
                            title="Usuń temat"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Subjects management + Per-class lesson hours (Director) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 border border-slate-200 rounded-md p-5 bg-white space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#7B2276]" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Przedmioty szkolne ({journal.subjects.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Twórz nowe przedmioty i przypisuj nauczycieli (widoczne w ocenach, planie i tematach)
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubjectSubmit} className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nazwa nowego przedmiotu
                </label>
                <input
                  type="text"
                  required
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="np. Muzyka, Plastyka, EDB, Robotyka"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nauczyciel prowadzący
                </label>
                <select
                  value={teacherOptions.some((t) => t.value === newSubjTeacher) ? newSubjTeacher : ''}
                  onChange={(e) => {
                    if (e.target.value) setNewSubjTeacher(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded mb-1.5"
                >
                  <option value="">— Wybierz nauczyciela z listy —</option>
                  {teacherOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSubjTeacher}
                  onChange={(e) => setNewSubjTeacher(e.target.value)}
                  placeholder="Lub wpisz nauczyciela ręcznie..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj przedmiot</span>
              </button>
            </form>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded max-h-60 overflow-y-auto">
              {journal.subjects.map((subj) => (
                <div
                  key={subj.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{subj.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{subj.teacher}</div>
                  </div>
                  {onDeleteSubject && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSubject(subj.id);
                        showToast(`Usunięto przedmiot: ${subj.name}.`);
                      }}
                      title="Usuń przedmiot"
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="xl:col-span-7">
            {renderClassLessonHoursCard()}
          </div>
        </div>
        </div>
      )}

      {/* CREATE SYNERGIA ACCOUNTS, RANKS & PERMISSIONS */}
      {perms.manageAccounts && section === 'logins' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 border border-slate-200 rounded-md p-5 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#7B2276]" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Tworzenie kont, rang i uprawnień
                </h2>
                <p className="text-xs text-slate-500">
                  Utwórz konto Synergii, wybierz rangę (np. Dyrektor, Psycholog, Logopeda,
                  Nauczyciel, Rodzic, Uczeń) i przypisz uprawnienia
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Imię i nazwisko użytkownika
                </label>
                <input
                  type="text"
                  required
                  value={accFullName}
                  onChange={(e) => setAccFullName(e.target.value)}
                  placeholder="np. Anna Nowak"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-[2px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wybierz lub wygeneruj login do dziennika
                </label>
                {(() => {
                  const cleanSlug = accFullName
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/ł/g, 'l')
                    .replace(/[^a-z0-9\s]+/g, '')
                    .trim();
                  const parts = cleanSlug.split(/\s+/).filter(Boolean);
                  const nameDot =
                    parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || '';
                  const initialDot =
                    parts.length >= 2 ? `${parts[0][0]}.${parts[parts.length - 1]}` : '';
                  const rolePrefix = isStudentRole(accRole)
                    ? 'uczen'
                    : accRole === 'parent'
                      ? 'rodzic'
                      : accRole === 'director'
                        ? 'dyrektor'
                        : 'nauczyciel';
                  const classSlug = (accClassName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  const suggestedOptions = [
                    ...(initialDot ? [{ label: `${initialDot} (z imienia i nazwiska)`, value: initialDot }] : []),
                    ...(nameDot && nameDot !== initialDot
                      ? [{ label: `${nameDot} (pełne imię.nazwisko)`, value: nameDot }]
                      : []),
                    ...(classSlug
                      ? [{ label: `${rolePrefix}.${classSlug} (rola + klasa)`, value: `${rolePrefix}.${classSlug}` }]
                      : []),
                    { label: `3863219 (numer Librus)`, value: '3863219' },
                    { label: `1234225 (przykładowy nr Librus)`, value: '1234225' },
                    { label: `4819203 (przykładowy nr Librus)`, value: '4819203' },
                  ];
                  return (
                    <select
                      value={
                        accounts.some((a) => a.login === accLogin) ||
                        suggestedOptions.some((o) => o.value === accLogin)
                          ? accLogin
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) setAccLogin(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-[2px] mb-2"
                    >
                      <option value="">— Wybierz propozycję loginu z listy (lub wpisz niżej) —</option>
                      {suggestedOptions.map((opt) => (
                        <option key={opt.label} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {accounts.length > 0 && (
                        <optgroup label="Istniejące loginy w systemie">
                          {accounts.map((a) => (
                            <option key={a.id} value={a.login}>
                              {a.login} — {a.fullName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  );
                })()}
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={accLogin}
                    onChange={(e) => setAccLogin(e.target.value)}
                    placeholder="np. 1234225 lub a.nowak"
                    className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-[2px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = Math.floor(1000000 + Math.random() * 8999999);
                      setAccLogin(String(num));
                    }}
                    className="px-2.5 py-2 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-[2px] cursor-pointer whitespace-nowrap"
                  >
                    Wylosuj nr
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ranga (Stanowisko)
                  </label>
                  <select
                    value={accRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setAccRole(nextRole);
                      setAccPermissions(getDefaultPermissionsForRole(nextRole));
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-[2px]"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 p-2 bg-purple-50/80 border border-purple-200 rounded text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#8D2877]">
                        Auto-uprawnienia: {getRoleLabel(accRole)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAccPermissions(getDefaultPermissionsForRole(accRole));
                          showToast(`Ustawiono auto-uprawnienia dla rangi ${getRoleLabel(accRole)}`);
                        }}
                        className="text-[10px] font-semibold text-[#8D2877] underline hover:no-underline cursor-pointer"
                      >
                        Ustaw domyślne
                      </button>
                    </div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      {getRolePermissionSummary(accRole)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Klasa</label>
                  <select
                    value={accClassName}
                    onChange={(e) => setAccClassName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {journal.classes.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        Klasa {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isStudentRole(accRole) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Numer w dzienniku
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={accStudentNumber}
                      onChange={(e) => setAccStudentNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
                    />
                  </div>
                )}

                <div className={isStudentRole(accRole) ? '' : 'sm:col-span-2'}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hasło</label>
                  <input
                    type="password"
                    required
                    value={accPassword}
                    onChange={(e) => setAccPassword(e.target.value)}
                    placeholder="Nadaj hasło"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Granular permissions selector */}
              <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#7B2276]" />
                    <span>Uprawnienia w dzienniku</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allTrue = PERMISSION_LABELS.every((p) => accPermissions[p.key]);
                      const next = {} as AccountPermissions;
                      PERMISSION_LABELS.forEach((p) => {
                        next[p.key] = !allTrue;
                      });
                      setAccPermissions(next);
                    }}
                    className="text-[11px] font-semibold text-[#7B2276] hover:underline cursor-pointer"
                  >
                    {PERMISSION_LABELS.every((p) => accPermissions[p.key])
                      ? 'Odznacz wszystkie'
                      : 'Zaznacz wszystkie'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PERMISSION_LABELS.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={accPermissions[perm.key]}
                        onChange={(e) =>
                          setAccPermissions({
                            ...accPermissions,
                            [perm.key]: e.target.checked,
                          })
                        }
                        className="mt-0.5 rounded border-slate-300 text-[#7B2276]"
                      />
                      <span className="leading-tight font-medium">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Utwórz konto Synergia
              </button>
            </form>
          </section>

          <section className="xl:col-span-7 border border-slate-200 rounded-md overflow-hidden bg-white">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Konta użytkowników, rangi i uprawnienia ({manageableAccounts.length})
                </h2>
                <span className="text-xs text-slate-500">Zarządzaj loginami, hasłami i uprawnieniami</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onApplyAutoPermissions) {
                    onApplyAutoPermissions();
                    showToast('Pomyślnie ustawiono auto-uprawnienia dla wszystkich kont wg ich rang!');
                  }
                }}
                className="px-3 py-1.5 bg-[#8D2877] hover:bg-[#721F60] text-white text-xs font-semibold rounded shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Zastosuj auto-uprawnienia dla rang</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Imię i nazwisko</th>
                    <th className="py-2.5 px-3">Ranga</th>
                    <th className="py-2.5 px-3">Login</th>
                    <th className="py-2.5 px-3">Aktywne uprawnienia</th>
                    <th className="py-2.5 px-4 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manageableAccounts.map((acc) => {
                    const roleMeta = getRoleMeta(acc.role);
                    const effPerms = getEffectivePermissions(acc);
                    const activeCount = PERMISSION_LABELS.filter((p) => effPerms[p.key]).length;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          <div>{acc.fullName}</div>
                          <div className="text-[11px] font-normal text-slate-500">
                            Klasa {acc.className}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-[2px] border text-[11px] font-semibold ${roleMeta.badgeClass}`}
                          >
                            {roleMeta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-semibold">
                          {acc.login}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            {activeCount}/{PERMISSION_LABELS.length}
                          </span>{' '}
                          <span className="text-[11px]">modułów</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const autoP = getDefaultPermissionsForRole(acc.role);
                                onUpdateAccount({
                                  ...acc,
                                  permissions: autoP,
                                });
                                showToast(`Zastosowano auto-uprawnienia (${getRoleLabel(acc.role)}) dla ${acc.fullName}`);
                              }}
                              title={`Ustaw automatyczne uprawnienia dla rangi ${getRoleLabel(acc.role)}`}
                              className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Shield className="w-3 h-3 text-emerald-600" />
                              <span>Auto</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingAccount({
                                  ...acc,
                                  permissions: getEffectivePermissions(acc),
                                })
                              }
                              title="Edytuj login, hasło, rangę i uprawnienia"
                              className="px-2 py-1 text-xs font-semibold text-[#7B2276] hover:bg-[#F5EEF8] border border-[#E4CAEC] rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edytuj login</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingAccount(acc)}
                              title={
                                acc.id === 'acc-director'
                                  ? 'Główne konto Dyrektora jest chronione'
                                  : 'Usuń konto z dziennika'
                              }
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Class Management in Logins Section */}
          <section className="xl:col-span-12 border border-slate-200 rounded-md overflow-hidden bg-white shadow-xs">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#7B2276]" />
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Oddziały i klasy w szkole ({journal.classes.length}) — Edycja i Usuwanie
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSection('classes_topics')}
                className="text-xs text-[#7B2276] hover:underline font-semibold cursor-pointer"
              >
                Przejdź do pełnego modułu klas &rarr;
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {journal.classes.map((cls) => (
                <div key={cls.id} className="p-3 bg-slate-50/70 border border-slate-200 rounded flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#7B2276]">Klasa {cls.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{cls.students.length} uczniów</span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    Wychowawca: <strong>{cls.homeroomTeacher}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingClass({ id: cls.id, name: cls.name, homeroomTeacher: cls.homeroomTeacher })}
                      className="flex-1 py-1 px-2 text-[11px] font-semibold text-[#7B2276] bg-white border border-[#E4CAEC] hover:bg-[#F5EEF8] rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edytuj</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingClass(cls)}
                      className="flex-1 py-1 px-2 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Usuń klasę</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* PRZERWA TECHNICZNA (DEDICATED DIRECTOR TAB) */}
      {(user.role === 'director' || perms.manageAccounts || perms.editAnnouncements) &&
        section === 'maintenance' && (
          <section className="border-2 border-amber-300 bg-amber-50/40 rounded-md p-5 max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Przerwa techniczna (Panel Dyrektora)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Wpisz powód oraz od kiedy do kiedy trwa przerwa i naciśnij Enter — komunikat
                    pojawi się od razu u każdego na pulpicie logowania.
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  journal.maintenance?.enabled
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {journal.maintenance?.enabled ? 'AKTYWNA NA LOGOWANIU' : 'WYŁĄCZONA'}
              </span>
            </div>

            <form onSubmit={handleActivateMaintenance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Od kiedy
                  </label>
                  <input
                    type="text"
                    required
                    value={maintFrom}
                    onChange={(e) => setMaintFrom(e.target.value)}
                    placeholder="np. 14:00 lub 23.11.2026 14:00"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Do kiedy
                  </label>
                  <input
                    type="text"
                    required
                    value={maintTo}
                    onChange={(e) => setMaintTo(e.target.value)}
                    placeholder="np. 16:00 lub 23.11.2026 16:00"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Treść komunikatu od Dyrektora (co ma pisać na pulpicie logowania)
                </label>
                <input
                  type="text"
                  required
                  value={maintMessage}
                  onChange={(e) => setMaintMessage(e.target.value)}
                  placeholder="np. Ze względu na nowe udostępnienie"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintBlockNonDirector}
                  onChange={(e) => setMaintBlockNonDirector(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600"
                />
                <span>
                  Zablokuj logowanie dla uczniów, rodziców i nauczycieli podczas przerwy (Dyrektor
                  zawsze może się zalogować)
                </span>
              </label>

              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 space-y-1">
                <div className="font-bold uppercase text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Podgląd na pulpicie logowania:</span>
                </div>
                <div className="font-semibold text-sm">
                  Przerwa techniczna: {maintMessage || 'Ze względu na nowe udostępnienie'}{' '}
                  {maintFrom ? `od ${maintFrom}` : 'od ...'}{' '}
                  {maintTo ? `do ${maintTo}` : 'do ...'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded cursor-pointer"
                >
                  Włącz / Zapisz przerwę techniczną (Enter)
                </button>
                {journal.maintenance?.enabled && (
                  <button
                    type="button"
                    onClick={handleDisableMaintenance}
                    className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded cursor-pointer"
                  >
                    Wyłącz przerwę techniczną
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

      {/* SUBSTITUTIONS & ANNOUNCEMENTS (CREATE, EDIT, DELETE) */}
      {(perms.editTimetable || perms.editAnnouncements) && section === 'director' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-6 space-y-6">
            <section className="border border-slate-200 rounded-md p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Szczęśliwy numerek i ocena zachowania
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Dzisiejszy szczęśliwy numerek (1–32)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={luckyInput}
                      onChange={(e) => setLuckyInput(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clamped = Math.max(1, Math.min(32, luckyInput || 1));
                        setLuckyInput(clamped);
                        onUpdateLuckyNumber(clamped);
                        showToast(`Ustawiono szczęśliwy numerek na: ${clamped}.`);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7B2276] hover:bg-[#621A5E] rounded cursor-pointer"
                    >
                      Zapisz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = Math.floor(Math.random() * 28) + 1;
                        setLuckyInput(rand);
                        onUpdateLuckyNumber(rand);
                        showToast(`Wylosowano nowy szczęśliwy numerek: ${rand}.`);
                      }}
                      title="Wylosuj losowy numerek"
                      className="p-1.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Przewidywana ocena zachowania
                  </label>
                  <select
                    value={journal.behaviorGrade}
                    onChange={(e) => {
                      onUpdateBehaviorGrade(e.target.value);
                      showToast(`Zmieniono ocenę zachowania na: ${e.target.value}.`);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                  >
                    {BEHAVIOR_GRADES.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="border border-slate-200 rounded-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Zastępstwa i odwołania w planie lekcji
                </h2>
              </div>

              <form onSubmit={handleTimetableSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Wybierz lekcję z planu
                  </label>
                  <select
                    value={subLessonId}
                    onChange={(e) => setSubLessonId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {journal.timetable.map((t) => {
                      const clsHours = getLessonHoursForClass(journal, t.classId ?? '3B');
                      return (
                        <option key={t.id} value={t.id}>
                          {t.classId ? `${t.classId} · ` : ''}
                          {WEEKDAYS_PL[t.dayIndex]} · L{t.lessonNumber} (
                          {clsHours[t.lessonNumber]?.start}) — {t.subject}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rodzaj zmiany
                    </label>
                    <select
                      value={subChangeType}
                      onChange={(e) =>
                        setSubChangeType(e.target.value as TimetableLesson['changeType'])
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                    >
                      <option value="substitution">Zastępstwo</option>
                      <option value="cancelled">Odwołana lekcja</option>
                      <option value="normal">Przywróć normalną</option>
                    </select>
                  </div>

                  {subChangeType === 'substitution' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Przedmiot zastępczy
                      </label>
                      <input
                        type="text"
                        value={subSubjectOverride}
                        onChange={(e) => setSubSubjectOverride(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                      />
                    </div>
                  )}
                </div>

                {subChangeType === 'substitution' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nauczyciel zastępujący
                    </label>
                    <select
                      value={
                        teacherOptions.some((t) => t.value === subTeacherOverride)
                          ? subTeacherOverride
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) setSubTeacherOverride(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white mb-1.5"
                    >
                      <option value="">— Wybierz nauczyciela z listy —</option>
                      {teacherOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={subTeacherOverride}
                      onChange={(e) => setSubTeacherOverride(e.target.value)}
                      placeholder="Lub wpisz nauczyciela ręcznie..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                    />
                  </div>
                )}

                {subChangeType !== 'normal' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Adnotacja
                    </label>
                    <input
                      type="text"
                      value={subNote}
                      onChange={(e) => setSubNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#7B2276] hover:bg-[#621A5E] rounded cursor-pointer"
                >
                  Zastosuj zmianę w planie lekcji
                </button>
              </form>
            </section>

            {/* Cancel whole day with reason */}
            {onCancelWholeDay && (
              <section className="border border-rose-200 rounded-md p-5 bg-rose-50/40 space-y-4">
                <div className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-600" />
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Odwołanie całego dnia z powodem
                    </h2>
                    <p className="text-xs text-slate-500">
                      Odwołaj wszystkie lekcje wybranego dnia dla całej szkoły lub jednej klasy
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cancelDayReason.trim()) return;
                    onCancelWholeDay(cancelDayClassId, cancelDayIdx, cancelDayReason.trim());
                    showToast(
                      `Odwołano cały dzień (${WEEKDAYS_PL[cancelDayIdx]}, ${cancelDayClassId === 'ALL' ? 'wszystkie klasy' : `klasa ${cancelDayClassId}`}) — ${cancelDayReason.trim()}.`
                    );
                    setCancelDayReason('');
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Klasa
                      </label>
                      <select
                        value={cancelDayClassId}
                        onChange={(e) => setCancelDayClassId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold"
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
                        value={cancelDayIdx}
                        onChange={(e) => setCancelDayIdx(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold"
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
                      Powód odwołania całego dnia
                    </label>
                    <input
                      type="text"
                      required
                      value={cancelDayReason}
                      onChange={(e) => setCancelDayReason(e.target.value)}
                      placeholder="np. Wycieczka szkolna, Dzień dyrektorski, Rekolekcje"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Odwołaj cały dzień</span>
                  </button>
                </form>

                {(journal.cancelledDays ?? []).length > 0 && (
                  <div className="pt-3 border-t border-rose-200 space-y-2">
                    <div className="text-xs font-bold text-rose-900">
                      Aktywne odwołania całych dni ({(journal.cancelledDays ?? []).length}):
                    </div>
                    <div className="space-y-1.5">
                      {(journal.cancelledDays ?? []).map((cd) => (
                        <div
                          key={cd.id}
                          className="p-2.5 bg-white border border-rose-200 rounded flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-rose-900">
                              {WEEKDAYS_PL[cd.dayIndex]} ·{' '}
                              {cd.classId === 'ALL' ? 'Wszystkie klasy' : `Klasa ${cd.classId}`}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              Powód: {cd.reason}
                            </div>
                          </div>
                          {onRestoreWholeDay && (
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreWholeDay(cd.id, cd.classId, cd.dayIndex);
                                showToast(`Przywrócono dzień: ${WEEKDAYS_PL[cd.dayIndex]}.`);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded inline-flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Przywróć</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="xl:col-span-6 space-y-6">
            {perms.editAnnouncements && (
              <>
                <section className="border border-slate-200 rounded-md p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Megaphone className="w-5 h-5 text-[#7B2276]" />
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Opublikuj ogłoszenie
                    </h2>
                  </div>

                  <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tytuł ogłoszenia
                      </label>
                      <input
                        type="text"
                        required
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder="np. Zarządzenie w sprawie skróconych lekcji"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Treść komunikatu
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={annPinned}
                        onChange={(e) => setAnnPinned(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#7B2276]"
                      />
                      <span>Przypnij ogłoszenie na górze listy</span>
                    </label>
                    <div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#7B2276] hover:bg-[#621A5E] rounded cursor-pointer"
                      >
                        Opublikuj ogłoszenie
                      </button>
                    </div>
                  </form>
                </section>

                <section className="border border-slate-200 rounded-md overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Lista ogłoszeń ({journal.announcements.length})
                    </h3>
                    <span className="text-xs text-slate-500">Edycja i usuwanie</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {journal.announcements.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Brak opublikowanych ogłoszeń.
                      </div>
                    ) : (
                      journal.announcements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">
                              <span className="font-mono tabular-nums">{formatDatePl(ann.date)}</span> ·{' '}
                              {ann.author}
                              {ann.pinned && (
                                <span className="ml-1.5 font-semibold text-[#7B2276]">
                                  (Przypięte)
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                              {ann.title}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {ann.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingAnnouncement({ ...ann })}
                              title="Edytuj ogłoszenie"
                              className="p-1.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteAnnouncement(ann.id);
                                showToast(`Usunięto ogłoszenie: ${ann.title}`);
                              }}
                              title="Usuń ogłoszenie"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {(perms.editTimetable || perms.editAnnouncements) && section === 'director' && (
        <div className="mt-6">{renderClassLessonHoursCard()}</div>
      )}

      {/* GRADES + CATEGORIES & SUBJECTS SECTION */}
      {perms.editGrades && section === 'grades' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-6 border border-slate-200 rounded-md p-5">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-5 h-5 text-[#7B2276]" />
              <h2 className="font-display text-base font-bold text-slate-900">
                Wystaw ocenę bieżącą
              </h2>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Uczeń
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {allStudents.length === 0 ? (
                      <option value="">Brak przypisanych uczniów (ocena ogólna)</option>
                    ) : (
                      allStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.className ? `[${st.className}] ` : ''}nr {st.number} · {st.fullName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Przedmiot</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {journal.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ocena</label>
                  <select
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded"
                  >
                    {GRADE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Waga</label>
                  <select
                    value={gradeWeight}
                    onChange={(e) => setGradeWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
                  >
                    {[0, 1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        Waga {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kategoria</label>
                  <select
                    value={gradeCategory}
                    onChange={(e) => {
                      const catName = e.target.value;
                      setGradeCategory(catName);
                      const match = categoriesList.find((c) => c.name === catName);
                      if (match) setGradeWeight(match.defaultWeight);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Okres</label>
                  <select
                    value={gradePeriod}
                    onChange={(e) => setGradePeriod(Number(e.target.value) as 1 | 2)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    <option value={1}>Okres 1</option>
                    <option value={2}>Okres 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Komentarz</label>
                <input
                  type="text"
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  placeholder="np. Sprawdzian działowy"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Zapisz ocenę</span>
              </button>
            </form>
          </section>

          <section className="xl:col-span-6 border border-slate-200 rounded-md p-5 space-y-5 bg-white">
            <div className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-[#7B2276]" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Kategorie ocen i przedmioty
                </h2>
                <p className="text-xs text-slate-500">
                  Twórz własne kategorie ocen (z domyślną wagą) oraz nowe przedmioty szkolne
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nowa kategoria oceny
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="np. Próbna matura, Referat"
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Domyślna waga
                  </label>
                  <select
                    value={newCatWeight}
                    onChange={(e) => setNewCatWeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                  >
                    {[0, 1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        Waga {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCatCounts}
                    onChange={(e) => setNewCatCounts(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#7B2276]"
                  />
                  <span>Wliczaj do średniej</span>
                </label>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj kategorię</span>
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs flex items-center gap-1.5"
                >
                  <span className="font-semibold text-slate-800">{cat.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">w.{cat.defaultWeight}</span>
                  {onDeleteGradeCategory && categoriesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteGradeCategory(cat.id);
                        showToast(`Usunięto kategorię: ${cat.name}.`);
                      }}
                      title="Usuń kategorię"
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateSubjectSubmit} className="space-y-2.5 pt-3 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-700">Szybkie dodanie przedmiotu:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="Nazwa przedmiotu"
                  className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                />
                <select
                  value={teacherOptions.some((t) => t.value === newSubjTeacher) ? newSubjTeacher : ''}
                  onChange={(e) => {
                    if (e.target.value) setNewSubjTeacher(e.target.value);
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                >
                  <option value="">— Wybierz nauczyciela —</option>
                  {teacherOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj przedmiot</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ATTENDANCE SECTION */}
      {perms.editAttendance && section === 'attendance' && (
        <section className="border border-slate-200 rounded-md p-5">
          <h2 className="font-display text-base font-bold text-slate-900 mb-4">
            Sprawdź obecność — Piątek 20.11.2026
          </h2>

          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Godzina lekcyjna
                </label>
                <select
                  value={attLessonNum}
                  onChange={(e) => setAttLessonNum(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                    const clsHours = getLessonHoursForClass(
                      journal,
                      journal.classes[0]?.id ?? '3B'
                    );
                    return (
                      <option key={n} value={n}>
                        Lekcja {n} ({clsHours[n].start}–{clsHours[n].end})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Przedmiot</label>
                <select
                  value={attSubject}
                  onChange={(e) => setAttSubject(e.target.value)}
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Temat</label>
                <input
                  type="text"
                  required
                  value={attTopic}
                  onChange={(e) => setAttTopic(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <th className="py-2 px-4 w-16">Nr</th>
                    <th className="py-2 px-4">Uczeń</th>
                    <th className="py-2 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allStudents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 px-4 text-center text-xs text-slate-500">
                        Brak przypisanych uczniów. Dodaj uczniów w module „Klasy i wybór tematów” lub „Konta”.
                      </td>
                    </tr>
                  ) : (
                    allStudents.map((st) => {
                      const current = rosterStatuses[st.id] ?? 'ob';
                      return (
                        <tr key={st.id}>
                          <td className="py-2 px-4 font-mono text-slate-500 tabular-nums">
                            {st.number}
                          </td>
                          <td className="py-2 px-4 font-medium text-slate-900">
                            {st.fullName}
                            {st.className && (
                              <span className="ml-1.5 text-[11px] text-slate-400">
                                ({st.className})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              {(['ob', 'nb', 'sp', 'zw'] as AttendanceStatus[]).map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() =>
                                    setRosterStatuses((prev) => ({ ...prev, [st.id]: code }))
                                  }
                                  className={`px-2 py-1 rounded font-mono border cursor-pointer ${
                                    current === code
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded cursor-pointer"
            >
              Zapisz listę obecności
            </button>
          </form>
        </section>
      )}

      {/* EVENTS / BEHAVIOR / HOMEWORK WITH FULL EDIT & DELETE */}
      {perms.editCalendar && section === 'events' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-6 border border-slate-200 rounded-md p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Dodaj wpis do dziennika
                </h2>
              </div>

              <div className="inline-flex p-1 bg-slate-100 rounded">
                <button
                  type="button"
                  onClick={() => setEntryType('behavior')}
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    entryType === 'behavior' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Uwaga / Pochwała
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('calendar')}
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    entryType === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Terminarz
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('homework')}
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    entryType === 'homework' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Zadanie domowe
                </button>
              </div>
            </div>

            <form onSubmit={handleEntrySubmit} className="space-y-4">
              {entryType === 'behavior' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rodzaj</label>
                      <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value as 'positive' | 'negative')}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                      >
                        <option value="positive">Pochwała (+)</option>
                        <option value="negative">Uwaga (-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Kategoria</label>
                      <input
                        type="text"
                        value={noteCategory}
                        onChange={(e) => setNoteCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Punkty</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={notePoints}
                        onChange={(e) => setNotePoints(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Treść uwagi / pochwały
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={noteDescription}
                      onChange={(e) => setNoteDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded"
                    />
                  </div>
                </>
              )}

              {entryType === 'calendar' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
                      <input
                        type="date"
                        required
                        value={calDate}
                        onChange={(e) => setCalDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Przedmiot</label>
                      <select
                        value={calSubject}
                        onChange={(e) => setCalSubject(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                      >
                        <option value="">Wydarzenie ogólne</option>
                        {journal.subjects.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Kategoria</label>
                      <select
                        value={calCategory}
                        onChange={(e) => setCalCategory(e.target.value as CalendarCategory)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                      >
                        <option value="Sprawdzian">Sprawdzian</option>
                        <option value="Kartkówka">Kartkówka</option>
                        <option value="Wydarzenie">Wydarzenie</option>
                        <option value="Dzień wolny">Dzień wolny</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Osoba prowadząca / Login
                    </label>
                    <select
                      value={calTeacher}
                      onChange={(e) => setCalTeacher(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                    >
                      <option value="">— Wybierz osobę / login —</option>
                      {teacherOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tytuł</label>
                    <input
                      type="text"
                      required
                      value={calTitle}
                      onChange={(e) => setCalTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Zakres</label>
                    <textarea
                      rows={3}
                      value={calDesc}
                      onChange={(e) => setCalDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded"
                    />
                  </div>
                </>
              )}

              {entryType === 'homework' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Przedmiot</label>
                      <select
                        value={hwSubject}
                        onChange={(e) => setHwSubject(e.target.value)}
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
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Termin oddania
                      </label>
                      <input
                        type="date"
                        required
                        value={hwDueDate}
                        onChange={(e) => setHwDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tytuł</label>
                    <input
                      type="text"
                      required
                      value={hwTitle}
                      onChange={(e) => setHwTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Instrukcja</label>
                    <textarea
                      rows={3}
                      value={hwDesc}
                      onChange={(e) => setHwDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="px-5 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Zapisz wpis w dzienniku
              </button>
            </form>
          </section>

          {/* Right column: Manage existing entries (Edit / Delete) */}
          <section className="xl:col-span-6 border border-slate-200 rounded-md overflow-hidden bg-white">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900">
                {entryType === 'calendar'
                  ? `Wpisy w terminarzu (${journal.calendarEvents.length})`
                  : entryType === 'behavior'
                    ? `Uwagi i pochwały (${journal.behaviorNotes.length})`
                    : `Zadania domowe (${journal.homework.length})`}
              </h3>
              <span className="text-xs text-slate-500">Edytuj lub usuń</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {entryType === 'calendar' &&
                (journal.calendarEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">Brak wpisów w terminarzu.</div>
                ) : (
                  [...journal.calendarEvents]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((ev) => (
                      <div key={ev.id} className="p-3.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-700 tabular-nums">
                              {formatDatePl(ev.date)}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-[#7B2276]">{ev.category}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                            {ev.subject ? `${ev.subject}: ${ev.title}` : ev.title}
                          </div>
                          {ev.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {ev.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingCalendarEvent({ ...ev })}
                            title="Edytuj wpis w terminarzu"
                            className="p-1.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCalendarEvent(ev.id);
                              showToast(`Usunięto wpis z terminarza: ${ev.title}`);
                            }}
                            title="Usuń wpis"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                ))}

              {entryType === 'behavior' &&
                (journal.behaviorNotes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">Brak uwag i pochwał.</div>
                ) : (
                  journal.behaviorNotes.map((note) => (
                    <div key={note.id} className="p-3.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-mono tabular-nums">{formatDatePl(note.date)}</span>
                          <span>·</span>
                          <span
                            className={`font-semibold ${
                              note.points >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {note.category} ({note.points > 0 ? `+${note.points}` : note.points} pkt)
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 mt-0.5 line-clamp-2">
                          {note.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingBehaviorNote({ ...note })}
                          title="Edytuj uwagę"
                          className="p-1.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteBehaviorNote(note.id);
                            showToast('Usunięto uwagę / pochwałę.');
                          }}
                          title="Usuń uwagę"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ))}

              {entryType === 'homework' &&
                (journal.homework.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">Brak zadań domowych.</div>
                ) : (
                  journal.homework.map((hw) => (
                    <div key={hw.id} className="p-3.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold text-[#7B2276]">{hw.subject}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            Termin: {formatDatePl(hw.dueDate)}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                          {hw.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingHomework({ ...hw })}
                          title="Edytuj zadanie"
                          className="p-1.5 text-[#7B2276] hover:bg-[#F5EEF8] rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteHomework(hw.id);
                            showToast(`Usunięto zadanie: ${hw.title}`);
                          }}
                          title="Usuń zadanie"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ))}
            </div>
          </section>
        </div>
      )}

      {/* OFFICIAL CERTIFICATE TEMPLATES */}
      {perms.generateCertificates && section === 'certificates' && (
        <CertificateGeneratorView
          journal={journal}
          user={user}
          onSaveSubjectFinalGrade={onSaveSubjectFinalGrade}
        />
      )}

      {/* Edit syllabus topic modal inside Dyrekcja */}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingTopic.title.trim()) return;
                onUpdateSyllabusTopic({ ...editingTopic, title: editingTopic.title.trim() });
                setEditingTopic(null);
                showToast('Zaktualizowano temat.');
              }}
              className="space-y-3.5 mt-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Godziny</label>
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
                    {TOPIC_COLORS.slice(0, 4).map((col) => (
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
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account & Permissions Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-lg w-full p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Edycja konta, loginu i uprawnień
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Użytkownik: {editingAccount.fullName} · {editingAccount.email || editingAccount.login}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanLogin = editingAccount.login.trim();
                if (!cleanLogin) {
                  showToast('Login nie może być pusty.');
                  return;
                }
                const duplicate = accounts.some(
                  (a) => a.id !== editingAccount.id && a.login.toLowerCase() === cleanLogin.toLowerCase()
                );
                if (duplicate) {
                  showToast(`Login „${cleanLogin}” jest już przypisany do innego użytkownika.`);
                  return;
                }
                const cleanRoleLabel = getRoleLabel(editingAccount.role);
                const studentNum = isStudentRole(editingAccount.role)
                  ? editingAccount.studentNumber || 1
                  : undefined;
                onUpdateAccount({
                  ...editingAccount,
                  login: cleanLogin,
                  fullName: editingAccount.fullName.trim(),
                  studentNumber: studentNum,
                  subtitle: isStudentRole(editingAccount.role)
                    ? `${cleanRoleLabel} · Klasa ${editingAccount.className} · nr ${studentNum}`
                    : `${cleanRoleLabel} · Klasa ${editingAccount.className}`,
                });
                setEditingAccount(null);
                showToast(`Zaktualizowano dane i login konta: ${editingAccount.fullName} (${cleanLogin})`);
              }}
              className="space-y-3.5 mt-4 text-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Imię i nazwisko
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAccount.fullName}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ranga (Stanowisko)
                  </label>
                  <select
                    value={editingAccount.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      const nextLabel = getRoleLabel(nextRole);
                      const nextNum = isStudentRole(nextRole)
                        ? editingAccount.studentNumber ?? 1
                        : undefined;
                      setEditingAccount({
                        ...editingAccount,
                        role: nextRole,
                        studentNumber: nextNum,
                        subtitle: isStudentRole(nextRole)
                          ? `${nextLabel} · Klasa ${editingAccount.className} · nr ${nextNum}`
                          : `${nextLabel} · Klasa ${editingAccount.className}`,
                        permissions: getDefaultPermissionsForRole(nextRole),
                      });
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-[2px]"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wybierz lub wpisz login do e-dziennika
                </label>
                {(() => {
                  const cleanSlug = editingAccount.fullName
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/ł/g, 'l')
                    .replace(/[^a-z0-9\s]+/g, '')
                    .trim();
                  const parts = cleanSlug.split(/\s+/).filter(Boolean);
                  const nameDot =
                    parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || '';
                  const initialDot =
                    parts.length >= 2 ? `${parts[0][0]}.${parts[parts.length - 1]}` : '';
                  const editSuggestions = [
                    { label: `${editingAccount.login} (obecny login)`, value: editingAccount.login },
                    ...(initialDot && initialDot !== editingAccount.login
                      ? [{ label: `${initialDot} (z imienia i nazwiska)`, value: initialDot }]
                      : []),
                    ...(nameDot && nameDot !== initialDot && nameDot !== editingAccount.login
                      ? [{ label: `${nameDot} (pełne imię.nazwisko)`, value: nameDot }]
                      : []),
                    { label: '3863219 (numer Librus)', value: '3863219' },
                  ];
                  return (
                    <select
                      value={
                        editSuggestions.some((s) => s.value === editingAccount.login) ||
                        accounts.some((a) => a.login === editingAccount.login)
                          ? editingAccount.login
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingAccount({ ...editingAccount, login: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded mb-2"
                    >
                      <option value="">— Wybierz login z listy —</option>
                      {editSuggestions.map((opt) => (
                        <option key={opt.label} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {accounts
                        .filter((a) => a.id !== editingAccount.id)
                        .map((a) => (
                          <option key={a.id} value={a.login}>
                            {a.login} — {a.fullName}
                          </option>
                        ))}
                    </select>
                  );
                })()}
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editingAccount.login}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, login: e.target.value })
                    }
                    placeholder="np. 1234225 lub a.nowak"
                    className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = Math.floor(1000000 + Math.random() * 8999999);
                      setEditingAccount({ ...editingAccount, login: String(num) });
                    }}
                    className="px-2.5 py-2 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded cursor-pointer whitespace-nowrap"
                  >
                    Wylosuj nr
                  </button>
                </div>
                {accounts.some(
                  (a) =>
                    a.id !== editingAccount.id &&
                    a.login.trim().toLowerCase() === editingAccount.login.trim().toLowerCase()
                ) && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    Uwaga: Ten login jest już zajęty przez inne konto!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Klasa</label>
                  <select
                    value={editingAccount.className}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, className: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                  >
                    {journal.classes.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        Klasa {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hasło logowania
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAccount.password}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, password: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
                {isStudentRole(editingAccount.role) && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Numer w dzienniku
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={editingAccount.studentNumber ?? 1}
                      onChange={(e) =>
                        setEditingAccount({
                          ...editingAccount,
                          studentNumber: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                    />
                  </div>
                )}
              </div>

              <div className="bg-purple-50/80 border border-purple-200 rounded p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#8D2877]">
                    Auto-uprawnienia dla rangi: {getRoleLabel(editingAccount.role)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const autoPerms = getDefaultPermissionsForRole(editingAccount.role);
                      setEditingAccount({
                        ...editingAccount,
                        permissions: autoPerms,
                      });
                      showToast(`Ustawiono auto-uprawnienia dla rangi ${getRoleLabel(editingAccount.role)}`);
                    }}
                    className="px-2.5 py-1 bg-[#8D2877] text-white text-[11px] font-semibold rounded hover:bg-[#721F60] cursor-pointer"
                  >
                    Ustaw auto-uprawnienia rangi
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  {getRolePermissionSummary(editingAccount.role)}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  Zakres uprawnień w dzienniku:
                </div>
                <div className="space-y-2">
                  {PERMISSION_LABELS.map((perm) => {
                    const currentPerms =
                      editingAccount.permissions ?? getEffectivePermissions(editingAccount);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={currentPerms[perm.key]}
                          onChange={(e) =>
                            setEditingAccount({
                              ...editingAccount,
                              permissions: {
                                ...currentPerms,
                                [perm.key]: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 rounded border-slate-300 text-[#7B2276]"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{perm.label}</div>
                          <div className="text-[11px] text-slate-500">{perm.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  Zapisz zmiany i login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Potwierdzenie usunięcia konta
              </h2>
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm">
              <p className="text-slate-700">
                Czy na pewno chcesz bezpowrotnie usunąć konto użytkownika z dziennika?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5 font-mono">
                <div><span className="text-slate-500 font-sans">Użytkownik:</span> <strong>{deletingAccount.fullName}</strong></div>
                <div><span className="text-slate-500 font-sans">Login do dziennika:</span> <strong>{deletingAccount.login}</strong></div>
                <div><span className="text-slate-500 font-sans">Ranga:</span> {getRoleLabel(deletingAccount.role)}</div>
                <div><span className="text-slate-500 font-sans">Klasa:</span> Klasa {deletingAccount.className}</div>
              </div>
              {deletingAccount.id === 'acc-director' ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  Główne konto Dyrektora Szkoły jest chronione przed usunięciem.
                </div>
              ) : deletingAccount.id === user.id ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  Nie możesz usunąć konta, na którym jesteś aktualnie zalogowany.
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={deletingAccount.id === 'acc-director' || deletingAccount.id === user.id}
                onClick={() => {
                  onDeleteAccount(deletingAccount.id);
                  showToast(`Usunięto konto: ${deletingAccount.login} (${deletingAccount.fullName})`);
                  setDeletingAccount(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded cursor-pointer"
              >
                Usuń konto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Edycja oddziału / klasy
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmedName = editingClass.name.trim().toUpperCase();
                const trimmedTeacher = editingClass.homeroomTeacher.trim();
                if (!trimmedName) return;

                const duplicate = journal.classes.some(
                  (c) => c.id !== editingClass.id && c.name.toUpperCase() === trimmedName
                );
                if (duplicate) {
                  showToast(`Klasa o nazwie ${trimmedName} już istnieje.`);
                  return;
                }

                onUpdateClass(editingClass.id, trimmedName, trimmedTeacher || 'Wychowawca');
                showToast(`Zaktualizowano oddział: Klasa ${trimmedName}.`);
                setEditingClass(null);
              }}
              className="space-y-4 mt-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Symbol / oznaczenie klasy
                </label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, name: e.target.value })
                  }
                  placeholder="np. 3B, 4A, 1C"
                  className="w-full px-3 py-2 text-sm uppercase font-bold border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wybierz wychowawcę oddziału
                </label>
                <select
                  required
                  value={editingClass.homeroomTeacher}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, homeroomTeacher: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  {!teacherOptions.some((t) => t.value === editingClass.homeroomTeacher) &&
                    editingClass.homeroomTeacher && (
                      <option value={editingClass.homeroomTeacher}>
                        {editingClass.homeroomTeacher}
                      </option>
                    )}
                  {teacherOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">Automatyczna synchronizacja:</span>
                <p>
                  Zmiana symbolu klasy automatycznie zaktualizuje powiązane plany lekcji, rozkłady materiału oraz przypisane konta uczniów i nauczycieli.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
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

      {/* Delete Class Confirmation Modal */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Usuwanie oddziału klasowego
              </h2>
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm">
              <p className="text-slate-700">
                Czy na pewno chcesz usunąć oddział: <strong>Klasa {deletingClass.name}</strong>?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
                <div>Wychowawca: <strong>{deletingClass.homeroomTeacher}</strong></div>
                <div>Liczba uczniów w klasie: <strong>{deletingClass.students.length}</strong></div>
                <div className="pt-1 font-medium text-rose-900">
                  Usunięcie klasy wykasuje jej wpisy w rozkładach materiału i planie lekcji, a przypisane konta zostaną bezpiecznie przepięte do innej aktywnej klasy.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(deletingClass.id);
                  showToast(`Usunięto klasę ${deletingClass.name}.`);
                  setDeletingClass(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
              >
                Usuń klasę
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-lg w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Edytuj ogłoszenie
              </h2>
              <button
                type="button"
                onClick={() => setEditingAnnouncement(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingAnnouncement.title.trim() || !editingAnnouncement.content.trim()) return;
                onUpdateAnnouncement({
                  ...editingAnnouncement,
                  title: editingAnnouncement.title.trim(),
                  content: editingAnnouncement.content.trim(),
                });
                setEditingAnnouncement(null);
                showToast('Zapisano zmiany w ogłoszeniu.');
              }}
              className="space-y-3.5 mt-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  required
                  value={editingAnnouncement.title}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Treść</label>
                <textarea
                  rows={4}
                  required
                  value={editingAnnouncement.content}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingAnnouncement.pinned)}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, pinned: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#7B2276]"
                />
                <span>Przypnij ogłoszenie na górze</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
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

      {/* Edit Calendar Event Modal */}
      {editingCalendarEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Edytuj wpis w terminarzu
              </h2>
              <button
                type="button"
                onClick={() => setEditingCalendarEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingCalendarEvent.title.trim()) return;
                onUpdateCalendarEvent({
                  ...editingCalendarEvent,
                  title: editingCalendarEvent.title.trim(),
                  description: editingCalendarEvent.description.trim(),
                });
                setEditingCalendarEvent(null);
                showToast('Zaktualizowano wpis w terminarzu.');
              }}
              className="space-y-3.5 mt-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={editingCalendarEvent.date}
                    onChange={(e) =>
                      setEditingCalendarEvent({ ...editingCalendarEvent, date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategoria
                  </label>
                  <select
                    value={editingCalendarEvent.category}
                    onChange={(e) =>
                      setEditingCalendarEvent({
                        ...editingCalendarEvent,
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
                  value={editingCalendarEvent.subject ?? ''}
                  onChange={(e) =>
                    setEditingCalendarEvent({ ...editingCalendarEvent, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  <option value="">Wydarzenie ogólne</option>
                  {journal.subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Osoba prowadząca / Login
                </label>
                <select
                  value={editingCalendarEvent.teacher ?? ''}
                  onChange={(e) =>
                    setEditingCalendarEvent({ ...editingCalendarEvent, teacher: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  <option value="">— Wybierz osobę / login —</option>
                  {teacherOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  required
                  value={editingCalendarEvent.title}
                  onChange={(e) =>
                    setEditingCalendarEvent({ ...editingCalendarEvent, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opis</label>
                <textarea
                  rows={3}
                  value={editingCalendarEvent.description}
                  onChange={(e) =>
                    setEditingCalendarEvent({
                      ...editingCalendarEvent,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCalendarEvent(null)}
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

      {/* Edit Behavior Note Modal */}
      {editingBehaviorNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Edytuj uwagę / pochwałę
              </h2>
              <button
                type="button"
                onClick={() => setEditingBehaviorNote(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingBehaviorNote.description.trim()) return;
                const absPts = Math.abs(editingBehaviorNote.points);
                onUpdateBehaviorNote({
                  ...editingBehaviorNote,
                  points: editingBehaviorNote.type === 'negative' ? -absPts : absPts,
                  description: editingBehaviorNote.description.trim(),
                });
                setEditingBehaviorNote(null);
                showToast('Zaktualizowano uwagę / pochwałę.');
              }}
              className="space-y-3.5 mt-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rodzaj</label>
                  <select
                    value={editingBehaviorNote.type}
                    onChange={(e) =>
                      setEditingBehaviorNote({
                        ...editingBehaviorNote,
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
                    value={Math.abs(editingBehaviorNote.points)}
                    onChange={(e) =>
                      setEditingBehaviorNote({
                        ...editingBehaviorNote,
                        points: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategoria</label>
                <input
                  type="text"
                  value={editingBehaviorNote.category}
                  onChange={(e) =>
                    setEditingBehaviorNote({ ...editingBehaviorNote, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Treść</label>
                <textarea
                  rows={3}
                  required
                  value={editingBehaviorNote.description}
                  onChange={(e) =>
                    setEditingBehaviorNote({
                      ...editingBehaviorNote,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBehaviorNote(null)}
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

      {/* Edit Homework Modal */}
      {editingHomework && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Edytuj zadanie domowe
              </h2>
              <button
                type="button"
                onClick={() => setEditingHomework(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingHomework.title.trim()) return;
                onUpdateHomework({
                  ...editingHomework,
                  title: editingHomework.title.trim(),
                  description: editingHomework.description.trim(),
                });
                setEditingHomework(null);
                showToast('Zaktualizowano zadanie domowe.');
              }}
              className="space-y-3.5 mt-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Przedmiot
                  </label>
                  <select
                    value={editingHomework.subject}
                    onChange={(e) =>
                      setEditingHomework({ ...editingHomework, subject: e.target.value })
                    }
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Termin</label>
                  <input
                    type="date"
                    required
                    value={editingHomework.dueDate}
                    onChange={(e) =>
                      setEditingHomework({ ...editingHomework, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  required
                  value={editingHomework.title}
                  onChange={(e) =>
                    setEditingHomework({ ...editingHomework, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opis</label>
                <textarea
                  rows={3}
                  value={editingHomework.description}
                  onChange={(e) =>
                    setEditingHomework({ ...editingHomework, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHomework(null)}
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

      {/* Quick Move Student Between Classes Modal (1-day or permanent) */}
      {movingStudentModal && (onMoveStudentBetweenClasses || onTempMoveStudent) && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Przenieś / przypisz ucznia do innej klasy
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMovingStudentModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!movingStudentModal.toClassId) return;
                const toCls = journal.classes.find((c) => c.id === movingStudentModal.toClassId);
                if (movingStudentModal.mode === 'temp') {
                  if (!onTempMoveStudent || !movingStudentModal.date) return;
                  onTempMoveStudent(
                    movingStudentModal.fromClassId,
                    movingStudentModal.toClassId,
                    movingStudentModal.studentId,
                    movingStudentModal.date,
                    movingStudentModal.reason.trim() || undefined
                  );
                  showToast(
                    `Przypisano ucznia ${movingStudentModal.fullName} z klasy ${movingStudentModal.fromClassName} do klasy ${toCls?.name ?? movingStudentModal.toClassId} na 1 dzień (${formatDatePl(movingStudentModal.date)}).`
                  );
                } else {
                  if (!onMoveStudentBetweenClasses) return;
                  onMoveStudentBetweenClasses(
                    movingStudentModal.fromClassId,
                    movingStudentModal.toClassId,
                    movingStudentModal.studentId,
                    movingStudentModal.targetNumber
                  );
                  showToast(
                    `Przeniesiono ucznia ${movingStudentModal.fullName} z klasy ${movingStudentModal.fromClassName} do klasy ${toCls?.name ?? movingStudentModal.toClassId} na stałe (nr ${movingStudentModal.targetNumber}).`
                  );
                }
                setMovingStudentModal(null);
              }}
              className="space-y-4 mt-4 text-sm"
            >
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div>
                  Uczeń: <strong className="text-slate-900">{movingStudentModal.fullName}</strong>
                </div>
                <div>
                  Obecna klasa:{' '}
                  <strong className="text-[#7B2276]">
                    Klasa {movingStudentModal.fromClassName} (nr {movingStudentModal.currentNumber})
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded">
                <button
                  type="button"
                  onClick={() =>
                    setMovingStudentModal({ ...movingStudentModal, mode: 'temp' })
                  }
                  className={`py-1.5 px-2 text-xs font-semibold rounded-sm cursor-pointer ${
                    movingStudentModal.mode === 'temp'
                      ? 'bg-[#7B2276] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Na 1 dzień (gościnnie)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMovingStudentModal({ ...movingStudentModal, mode: 'permanent' })
                  }
                  className={`py-1.5 px-2 text-xs font-semibold rounded-sm cursor-pointer ${
                    movingStudentModal.mode === 'permanent'
                      ? 'bg-[#7B2276] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Na stałe
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Do klasy
                  </label>
                  <select
                    required
                    value={movingStudentModal.toClassId}
                    onChange={(e) => {
                      const nextTo = e.target.value;
                      const destCls = journal.classes.find((c) => c.id === nextTo);
                      const nextNum = destCls
                        ? destCls.students.reduce((m, s) => Math.max(m, s.number || 0), 0) + 1
                        : 1;
                      setMovingStudentModal({
                        ...movingStudentModal,
                        toClassId: nextTo,
                        targetNumber: nextNum,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold"
                  >
                    {journal.classes
                      .filter((c) => c.id !== movingStudentModal.fromClassId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          Klasa {c.name} ({c.students.length} uczniów)
                        </option>
                      ))}
                  </select>
                </div>
                {movingStudentModal.mode === 'temp' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data (1 dzień)
                    </label>
                    <input
                      type="date"
                      required
                      value={movingStudentModal.date}
                      onChange={(e) =>
                        setMovingStudentModal({
                          ...movingStudentModal,
                          date: e.target.value,
                        })
                      }
                      className="w-full px-2 py-2 text-xs font-mono border border-slate-300 rounded"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nowy nr
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={movingStudentModal.targetNumber}
                      onChange={(e) =>
                        setMovingStudentModal({
                          ...movingStudentModal,
                          targetNumber: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                    />
                  </div>
                )}
              </div>

              {movingStudentModal.mode === 'temp' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Powód / uwaga (opcjonalnie)
                  </label>
                  <input
                    type="text"
                    value={movingStudentModal.reason}
                    onChange={(e) =>
                      setMovingStudentModal({
                        ...movingStudentModal,
                        reason: e.target.value,
                      })
                    }
                    placeholder="np. Zajęcia łączone / opieka na ten dzień"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMovingStudentModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>
                    {movingStudentModal.mode === 'temp'
                      ? 'Przypisz na 1 dzień'
                      : 'Przenieś na stałe'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

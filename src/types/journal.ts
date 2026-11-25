export type UserRole =
  | 'student'
  | 'speech_student'
  | 'parent'
  | 'teacher'
  | 'homeroom'
  | 'speech_therapist'
  | 'pedagogue'
  | 'psychologist'
  | 'librarian'
  | 'secretary'
  | 'educator'
  | 'vicedirector'
  | 'director';

export interface AccountPermissions {
  editTimetable: boolean;
  editGrades: boolean;
  editAttendance: boolean;
  editAnnouncements: boolean;
  editCalendar: boolean;
  editClassesAndTopics: boolean;
  generateCertificates: boolean;
  manageAccounts: boolean;
}

export interface UserAccount {
  id: string;
  login: string;
  email?: string;
  password: string;
  role: UserRole;
  fullName: string;
  subtitle: string;
  schoolName: string;
  className: string;
  studentNumber?: number;
  studentName?: string;
  authProvider?: 'synergia' | 'google';
  permissions?: AccountPermissions;
  lastLoginAt?: string;
  previousLoginAt?: string;
}

export type GradeCategory = string;

export interface GradeCategoryItem {
  id: string;
  name: string;
  defaultWeight: number;
  countsToAverage?: boolean;
}

export interface GradeEntry {
  id: string;
  subjectId: string;
  value: string; // e.g. '5', '4+', '3-', '1', '+', '-'
  weight: number; // 1..5, 0 if not counted
  category: GradeCategory;
  period: 1 | 2;
  date: string; // YYYY-MM-DD
  teacher: string;
  comment: string;
  countsToAverage: boolean;
  isSimulated?: boolean;
}

export interface SubjectInfo {
  id: string;
  name: string;
  teacher: string;
  proposedTerm1?: string;
  finalTerm1?: string;
  proposedTerm2?: string;
  finalTerm2?: string;
  finalYear?: string;
}

export type AttendanceStatus = 'ob' | 'nb' | 'u' | 'sp' | 'zw';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  lessonNumber: number; // 1..8
  subjectName: string;
  teacher: string;
  status: AttendanceStatus;
  topic: string;
  excuseNote?: string;
}

export interface TimetableLesson {
  id: string;
  classId?: string;
  dayIndex: number; // 0 = Poniedziałek .. 4 = Piątek
  lessonNumber: number; // 1..8
  subject: string;
  teacher: string;
  room: string;
  changeType?: 'normal' | 'substitution' | 'cancelled' | 'moved';
  changeNote?: string;
  originalSubject?: string;
  plannedTopic?: string;
  plannedTopicColor?: string;
  plannedTopicId?: string;
}

export interface MessageItem {
  id: string;
  folder: 'inbox' | 'sent' | 'trash';
  senderName: string;
  senderRole: string;
  recipientName: string;
  subject: string;
  body: string;
  date: string; // YYYY-MM-DD HH:mm
  read: boolean;
}

export type CalendarCategory = 'Sprawdzian' | 'Kartkówka' | 'Wydarzenie' | 'Dzień wolny';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subject?: string;
  category: CalendarCategory;
  teacher: string;
  description: string;
  lessonNumber?: number;
}

export interface HomeworkItem {
  id: string;
  subject: string;
  teacher: string;
  assignedDate: string;
  dueDate: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface BehaviorNote {
  id: string;
  date: string;
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  teacher: string;
  description: string;
  points: number;
}

export interface AnnouncementItem {
  id: string;
  date: string;
  author: string;
  authorRole: string;
  title: string;
  content: string;
  pinned?: boolean;
}

export interface ClassStudent {
  number: number;
  id: string;
  fullName: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  homeroomTeacher: string;
  students: ClassStudent[];
}

export interface ReadyTopicTemplate {
  id: string;
  subjectId: string;
  title: string;
  hours: number;
  color: string;
}

export interface SyllabusTopic {
  id: string;
  classId: string;
  subjectId: string;
  order: number;
  title: string;
  hours: number;
  color: string;
  completed: boolean;
}

export interface LessonLog {
  id: string;
  classId: string;
  date: string;
  lessonNumber: number;
  subject: string;
  teacher: string;
  topic: string;
  color?: string;
  syllabusTopicId?: string;
}

export interface MaintenanceBreak {
  enabled: boolean;
  from: string;
  to: string;
  message: string;
  blockNonDirector?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface CancelledDay {
  id: string;
  classId: string; // e.g. '3B' or 'ALL'
  dayIndex: number; // 0..4
  reason: string;
  cancelledBy: string;
  createdAt: string;
}

export interface TemporaryStudentTransfer {
  id: string;
  studentId: string;
  studentName: string;
  fromClassId: string;
  toClassId: string;
  date: string; // YYYY-MM-DD
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export interface JournalState {
  luckyNumber: number;
  schoolYear: string;
  schoolName: string;
  behaviorGrade: string;
  maintenance?: MaintenanceBreak;
  classes: SchoolClass[];
  classRooms?: string[];
  classLessonHours?: Record<string, Record<number, { start: string; end: string }>>;
  cancelledDays?: CancelledDay[];
  temporaryTransfers?: TemporaryStudentTransfer[];
  subjects: SubjectInfo[];
  gradeCategories?: GradeCategoryItem[];
  readyTopics?: ReadyTopicTemplate[];
  grades: GradeEntry[];
  attendance: AttendanceRecord[];
  timetable: TimetableLesson[];
  messages: MessageItem[];
  calendarEvents: CalendarEvent[];
  homework: HomeworkItem[];
  behaviorNotes: BehaviorNote[];
  announcements: AnnouncementItem[];
  classRoster: ClassStudent[];
  syllabusTopics: SyllabusTopic[];
  lessonLogs: LessonLog[];
  _revision?: number;
  _updatedAt?: number;
  _resetToken?: number;
}

export type ActiveTab =
  | 'pulpit'
  | 'indywidualni'
  | 'oceny'
  | 'frekwencja'
  | 'plan'
  | 'wiadomosci'
  | 'terminarz'
  | 'zadania'
  | 'uwagi'
  | 'ogloszenia'
  | 'rozklady'
  | 'lekcja'
  | 'statystyki'
  | 'pomoc'
  | 'nauczyciel';

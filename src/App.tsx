import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import {
  DEFAULT_GRADE_CATEGORIES,
  DEMO_ACCOUNTS,
  INITIAL_JOURNAL_DATA,
} from './data/initialJournalData';
import {
  ActiveTab,
  AnnouncementItem,
  AttendanceRecord,
  AttendanceStatus,
  BehaviorNote,
  CalendarCategory,
  CalendarEvent,
  GradeEntry,
  HomeworkItem,
  JournalState,
  MaintenanceBreak,
  SyllabusTopic,
  TimetableLesson,
  UserAccount,
  UserRole,
} from './types/journal';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { GradesView } from './components/GradesView';
import { AttendanceView } from './components/AttendanceView';
import { TimetableView } from './components/TimetableView';
import { MessagesView } from './components/MessagesView';
import { CalendarView } from './components/CalendarView';
import { HomeworkView } from './components/HomeworkView';
import { BehaviorView } from './components/BehaviorView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { StaffPanelView, StaffSection } from './components/StaffPanelView';
import { LessonDraft, LessonInterfaceView } from './components/LessonInterfaceView';
import { SyllabusView } from './components/SyllabusView';
import { IndywidualniView } from './components/IndywidualniView';
import { HelpView, StatsView } from './components/StatsAndHelpViews';
import { formatPolishDateTime, WEEKDAYS_PL } from './utils/grades';
import {
  getDefaultPermissionsForRole,
  getEffectivePermissions,
  getRoleLabel,
  isStaffRole,
  isStudentRole,
} from './utils/permissions';

const STORAGE_KEY_JOURNAL = 'edziennik_synergia_state_v2';
const STORAGE_KEY_JOURNAL_META = 'edziennik_synergia_journal_meta_v2';
const STORAGE_KEY_USER = 'edziennik_synergia_user_v2';
const STORAGE_KEY_ACCOUNTS = 'edziennik_synergia_accounts_v2';
const STORAGE_KEY_ACCOUNTS_META = 'edziennik_synergia_accounts_meta_v2';

interface ClientSyncMeta {
  revision: number;
  updatedAt: number;
  resetToken: number;
  dirty: boolean;
}

const normalizeLoadedJournal = (raw: unknown): JournalState => {
  const parsed: Partial<JournalState> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Partial<JournalState>) : {};
  const savedClasses = Array.isArray(parsed.classes)
    ? parsed.classes.map((c) => ({
        ...c,
        students: Array.isArray(c?.students) ? c.students : [],
      }))
    : INITIAL_JOURNAL_DATA.classes;
  return {
    ...INITIAL_JOURNAL_DATA,
    ...parsed,
    classes: savedClasses,
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : INITIAL_JOURNAL_DATA.subjects,
    grades: Array.isArray(parsed.grades) ? parsed.grades : INITIAL_JOURNAL_DATA.grades,
    attendance: Array.isArray(parsed.attendance)
      ? parsed.attendance
      : INITIAL_JOURNAL_DATA.attendance,
    timetable: Array.isArray(parsed.timetable) ? parsed.timetable : INITIAL_JOURNAL_DATA.timetable,
    messages: Array.isArray(parsed.messages) ? parsed.messages : INITIAL_JOURNAL_DATA.messages,
    announcements: Array.isArray(parsed.announcements)
      ? parsed.announcements
      : INITIAL_JOURNAL_DATA.announcements,
    calendarEvents: Array.isArray(parsed.calendarEvents)
      ? parsed.calendarEvents
      : INITIAL_JOURNAL_DATA.calendarEvents,
    homework: Array.isArray(parsed.homework) ? parsed.homework : INITIAL_JOURNAL_DATA.homework,
    behaviorNotes: Array.isArray(parsed.behaviorNotes)
      ? parsed.behaviorNotes
      : INITIAL_JOURNAL_DATA.behaviorNotes,
    lessonLogs: (Array.isArray(parsed.lessonLogs)
      ? parsed.lessonLogs
      : INITIAL_JOURNAL_DATA.lessonLogs
    ).map((l) => ({
      ...l,
      classId: l?.classId ?? '3B',
    })),
    gradeCategories:
      Array.isArray(parsed.gradeCategories) && parsed.gradeCategories.length > 0
        ? parsed.gradeCategories
        : DEFAULT_GRADE_CATEGORIES,
    classLessonHours:
      parsed.classLessonHours && typeof parsed.classLessonHours === 'object'
        ? parsed.classLessonHours
        : {},
    cancelledDays: Array.isArray(parsed.cancelledDays) ? parsed.cancelledDays : [],
    temporaryTransfers: Array.isArray(parsed.temporaryTransfers)
      ? parsed.temporaryTransfers
      : [],
    readyTopics: Array.isArray(parsed.readyTopics) ? parsed.readyTopics : [],
    classRooms: Array.isArray(parsed.classRooms)
      ? Array.from(
          new Set(parsed.classRooms.map((r) => String(r ?? '').trim()).filter(Boolean))
        )
      : [],
    syllabusTopics: (Array.isArray(parsed.syllabusTopics)
      ? parsed.syllabusTopics
      : INITIAL_JOURNAL_DATA.syllabusTopics
    ).map((t) => ({
      ...t,
      classId: t?.classId ?? '3B',
      color: t?.color ?? '#7B2276',
    })),
    maintenance:
      parsed.maintenance && typeof parsed.maintenance === 'object'
        ? {
            ...(INITIAL_JOURNAL_DATA.maintenance ?? {
              enabled: false,
              from: '',
              to: '',
              message: 'Ze względu na nowe udostępnienie',
              blockNonDirector: false,
            }),
            ...parsed.maintenance,
          }
        : INITIAL_JOURNAL_DATA.maintenance,
    _revision: Number(parsed._revision ?? 0),
    _updatedAt: Number(parsed._updatedAt ?? 0),
    _resetToken: Number(parsed._resetToken ?? 0),
  };
};

const normalizeUserAccount = (raw: unknown): UserAccount | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Partial<UserAccount>;
  const login = typeof obj.login === 'string' ? obj.login.trim() : '';
  if (!login) return null;
  const role: UserRole = typeof obj.role === 'string' && obj.role ? (obj.role as UserRole) : 'student';
  const fullName =
    typeof obj.fullName === 'string' && obj.fullName.trim() ? obj.fullName.trim() : login;
  return {
    ...obj,
    id: typeof obj.id === 'string' && obj.id ? obj.id : `acc-${login.toLowerCase()}`,
    login,
    password: typeof obj.password === 'string' ? obj.password : '',
    role,
    fullName,
    subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : getRoleLabel(role),
    schoolName: typeof obj.schoolName === 'string' ? obj.schoolName : '',
    className: typeof obj.className === 'string' ? obj.className : '',
  };
};

const normalizeLoadedAccounts = (raw: unknown): UserAccount[] => {
  if (!Array.isArray(raw) || raw.length === 0) return DEMO_ACCOUNTS;
  const valid = raw.map(normalizeUserAccount).filter((a): a is UserAccount => a !== null);
  return valid.length > 0 ? valid : DEMO_ACCOUNTS;
};

export default function App() {
  const [journal, setJournal] = useState<JournalState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JOURNAL);
      if (saved) {
        return normalizeLoadedJournal(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
    return { ...INITIAL_JOURNAL_DATA, _revision: 0, _updatedAt: 0, _resetToken: 0 };
  });

  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (saved) {
        return normalizeLoadedAccounts(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
    return DEMO_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      // Clear any legacy persistent localStorage login so closing the site auto-logs out
      localStorage.removeItem(STORAGE_KEY_USER);
      const saved = sessionStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        return normalizeUserAccount(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('pulpit');
  const [orgSection, setOrgSection] = useState<StaffSection>('logins');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lessonDraft, setLessonDraft] = useState<(LessonDraft & { draftKey: number }) | null>(null);

  const journalRef = useRef<JournalState>(journal);
  const accountsRef = useRef<UserAccount[]>(accounts);
  const journalMetaRef = useRef<ClientSyncMeta>((() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_JOURNAL_META);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ClientSyncMeta> | null;
        if (parsed && typeof parsed === 'object') {
          return {
            revision: Number(parsed.revision ?? 0),
            updatedAt: Number(parsed.updatedAt ?? 0),
            resetToken: Number(parsed.resetToken ?? 0),
            dirty: Boolean(parsed.dirty),
          };
        }
      }
    } catch {
      // ignore
    }
    const rev = Number(journal._revision ?? 0);
    const upd = Number(journal._updatedAt ?? 0);
    const hasLegacyUserEdits =
      rev === 0 &&
      (journal.classes.length !== INITIAL_JOURNAL_DATA.classes.length ||
        journal.classes.some((c) => c.students.length > 0) ||
        Object.keys(journal.classLessonHours ?? {}).length > 0 ||
        (journal.readyTopics?.length ?? 0) > 0 ||
        (journal.cancelledDays?.length ?? 0) > 0 ||
        (journal.temporaryTransfers?.length ?? 0) > 0);
    return {
      revision: hasLegacyUserEdits ? 1 : rev,
      updatedAt: hasLegacyUserEdits ? Date.now() : upd,
      resetToken: Number(journal._resetToken ?? 0),
      dirty: hasLegacyUserEdits,
    };
  })());
  const accountsMetaRef = useRef<ClientSyncMeta>((() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS_META);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ClientSyncMeta> | null;
        if (parsed && typeof parsed === 'object') {
          return {
            revision: Number(parsed.revision ?? 0),
            updatedAt: Number(parsed.updatedAt ?? 0),
            resetToken: Number(parsed.resetToken ?? 0),
            dirty: Boolean(parsed.dirty),
          };
        }
      }
    } catch {
      // ignore
    }
    const hasLegacyAccounts = accounts.length > DEMO_ACCOUNTS.length;
    return {
      revision: hasLegacyAccounts ? 1 : 0,
      updatedAt: hasLegacyAccounts ? Date.now() : 0,
      resetToken: 0,
      dirty: hasLegacyAccounts,
    };
  })());

  const inFlightJournalRef = useRef(0);
  const inFlightAccountsRef = useRef(0);
  const lastLocalMutationAt = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const isFlushingDirtyRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving'>('saved');

  const persistJournalMeta = (meta: ClientSyncMeta) => {
    journalMetaRef.current = meta;
    try {
      localStorage.setItem(STORAGE_KEY_JOURNAL_META, JSON.stringify(meta));
    } catch {
      // ignore storage errors
    }
  };

  const persistAccountsMeta = (meta: ClientSyncMeta) => {
    accountsMetaRef.current = meta;
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS_META, JSON.stringify(meta));
    } catch {
      // ignore storage errors
    }
  };

  const applyJournalState = (
    next: JournalState,
    options?: { fromServer?: boolean; dirty?: boolean }
  ) => {
    const normalized = normalizeLoadedJournal(next);
    let stamped = normalized;
    if (options?.fromServer) {
      persistJournalMeta({
        revision: Number(normalized._revision ?? 0),
        updatedAt: Number(normalized._updatedAt ?? 0),
        resetToken: Number(normalized._resetToken ?? 0),
        dirty: false,
      });
    } else {
      const nextRev = Math.max(
        journalMetaRef.current.revision + 1,
        Number(normalized._revision ?? 0) + 1,
        1
      );
      const nextUpd = Math.max(Date.now(), journalMetaRef.current.updatedAt + 1);
      stamped = {
        ...normalized,
        _revision: nextRev,
        _updatedAt: nextUpd,
        _resetToken: journalMetaRef.current.resetToken,
      };
      persistJournalMeta({
        revision: nextRev,
        updatedAt: nextUpd,
        resetToken: journalMetaRef.current.resetToken,
        dirty: options?.dirty ?? true,
      });
    }
    journalRef.current = stamped;
    setJournal(stamped);
    try {
      localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(stamped));
    } catch {
      // ignore storage errors
    }
  };

  const applyAccountsState = (
    next: UserAccount[],
    options?: {
      fromServer?: boolean;
      dirty?: boolean;
      meta?: { revision?: number; updatedAt?: number; resetToken?: number };
    }
  ) => {
    const normalized = normalizeLoadedAccounts(next);
    if (options?.fromServer) {
      persistAccountsMeta({
        revision: Number(options.meta?.revision ?? accountsMetaRef.current.revision),
        updatedAt: Number(options.meta?.updatedAt ?? accountsMetaRef.current.updatedAt),
        resetToken: Number(options.meta?.resetToken ?? accountsMetaRef.current.resetToken),
        dirty: false,
      });
    } else {
      const nextRev = Math.max(accountsMetaRef.current.revision + 1, 1);
      const nextUpd = Math.max(Date.now(), accountsMetaRef.current.updatedAt + 1);
      persistAccountsMeta({
        revision: nextRev,
        updatedAt: nextUpd,
        resetToken: accountsMetaRef.current.resetToken,
        dirty: options?.dirty ?? true,
      });
    }
    accountsRef.current = normalized;
    setAccounts(normalized);
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(normalized));
    } catch {
      // ignore storage errors
    }
  };

  const enqueueServerPost = async <T = any>(
    url: string,
    payload: unknown,
    onSuccess?: (data: T) => void,
    scope: 'journal' | 'accounts' | 'both' = 'journal'
  ): Promise<boolean> => {
    lastLocalMutationAt.current = Date.now();
    if (scope === 'journal' || scope === 'both') inFlightJournalRef.current += 1;
    if (scope === 'accounts' || scope === 'both') inFlightAccountsRef.current += 1;
    setSyncStatus('saving');
    const task = saveQueueRef.current.then(async () => {
      try {
        const bodyStr = JSON.stringify(payload);
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          return false;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.success === false) {
          return false;
        }
        if (scope === 'journal' || scope === 'both') {
          if (data.journal) {
            if (inFlightJournalRef.current <= 1) {
              applyJournalState(data.journal, { fromServer: true });
            } else {
              persistJournalMeta({
                revision: Math.max(
                  journalMetaRef.current.revision,
                  Number(data.journal._revision ?? 0)
                ),
                updatedAt: Math.max(
                  journalMetaRef.current.updatedAt,
                  Number(data.journal._updatedAt ?? 0)
                ),
                resetToken: Math.max(
                  journalMetaRef.current.resetToken,
                  Number(data.journal._resetToken ?? 0)
                ),
                dirty: journalMetaRef.current.dirty,
              });
            }
          } else if (inFlightJournalRef.current <= 1) {
            persistJournalMeta({ ...journalMetaRef.current, dirty: false });
          }
        }
        if (scope === 'accounts' || scope === 'both') {
          if (Array.isArray(data.accounts)) {
            if (inFlightAccountsRef.current <= 1) {
              applyAccountsState(data.accounts, {
                fromServer: true,
                meta: data.accountsMeta,
              });
            } else {
              persistAccountsMeta({
                revision: Math.max(
                  accountsMetaRef.current.revision,
                  Number(data.accountsMeta?.revision ?? 0)
                ),
                updatedAt: Math.max(
                  accountsMetaRef.current.updatedAt,
                  Number(data.accountsMeta?.updatedAt ?? 0)
                ),
                resetToken: Math.max(
                  accountsMetaRef.current.resetToken,
                  Number(data.accountsMeta?.resetToken ?? 0)
                ),
                dirty: accountsMetaRef.current.dirty,
              });
            }
          } else if (inFlightAccountsRef.current <= 1) {
            persistAccountsMeta({ ...accountsMetaRef.current, dirty: false });
          }
        }
        if (onSuccess) {
          onSuccess(data as T);
        }
        return true;
      } catch {
        return false;
      } finally {
        if (scope === 'journal' || scope === 'both') {
          inFlightJournalRef.current = Math.max(0, inFlightJournalRef.current - 1);
        }
        if (scope === 'accounts' || scope === 'both') {
          inFlightAccountsRef.current = Math.max(0, inFlightAccountsRef.current - 1);
        }
        if (inFlightJournalRef.current === 0 && inFlightAccountsRef.current === 0) {
          setSyncStatus('saved');
        }
        lastLocalMutationAt.current = Date.now();
      }
    });
    saveQueueRef.current = task.catch(() => false);
    return task;
  };

  const mutateJournal = (updater: (prev: JournalState) => JournalState) => {
    const next = updater(journalRef.current);
    applyJournalState(next);
    void enqueueServerPost('/api/journal', journalRef.current, undefined, 'journal');
  };

  const flushDirtyToServer = async () => {
    if (
      isFlushingDirtyRef.current ||
      inFlightJournalRef.current > 0 ||
      inFlightAccountsRef.current > 0
    ) {
      return;
    }
    const needAcc = accountsMetaRef.current.dirty;
    const needJour = journalMetaRef.current.dirty;
    if (!needAcc && !needJour) return;
    isFlushingDirtyRef.current = true;
    try {
      if (needAcc) {
        await enqueueServerPost(
          '/api/accounts',
          { accounts: accountsRef.current, meta: accountsMetaRef.current },
          undefined,
          'accounts'
        );
      }
      if (needJour) {
        await enqueueServerPost('/api/journal', journalRef.current, undefined, 'journal');
      }
    } finally {
      isFlushingDirtyRef.current = false;
    }
  };

  // Initial auto-load + non-destructive real-time SSE + silent auto-save/recovery
  useEffect(() => {
    let active = true;
    const loadingGuard = setTimeout(() => {
      if (active) setIsInitialLoading(false);
    }, 1500);

    const syncFromServer = async (isInitial: boolean) => {
      if (
        !isInitial &&
        (inFlightJournalRef.current > 0 ||
          inFlightAccountsRef.current > 0 ||
          Date.now() - lastLocalMutationAt.current < 1500)
      ) {
        return;
      }
      try {
        const res = await fetch('/api/state', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.toLowerCase().includes('application/json')) return;
        const stateRes = await res.json().catch(() => null);
        if (!active || !stateRes) return;
        if (
          !isInitial &&
          (inFlightJournalRef.current > 0 ||
            inFlightAccountsRef.current > 0 ||
            Date.now() - lastLocalMutationAt.current < 1500)
        ) {
          return;
        }

        const accRes = stateRes.accounts;
        const srvAccMeta = stateRes.accountsMeta ?? { revision: 0, updatedAt: 0, resetToken: 0 };
        const jourRes = stateRes.journal;
        const srvJourMeta = stateRes.journalMeta ?? {
          revision: Number(jourRes?._revision ?? 0),
          updatedAt: Number(jourRes?._updatedAt ?? 0),
          resetToken: Number(jourRes?._resetToken ?? 0),
        };

        // 1. Sync Accounts non-destructively
        if (Array.isArray(accRes) && accRes.length > 0 && inFlightAccountsRef.current === 0) {
          const localAccMeta = accountsMetaRef.current;
          const serverExplicitReset =
            Number(srvAccMeta.resetToken ?? 0) > localAccMeta.resetToken;
          const serverWasWipedToFactory =
            Number(srvAccMeta.revision ?? 0) === 0 &&
            Number(srvAccMeta.resetToken ?? 0) === 0 &&
            (localAccMeta.revision > 0 || localAccMeta.dirty);

          if (localAccMeta.dirty || serverWasWipedToFactory) {
            // Preserve local accounts and merge them safely onto server!
            void enqueueServerPost(
              '/api/accounts',
              { accounts: accountsRef.current, meta: accountsMetaRef.current },
              undefined,
              'accounts'
            );
          } else if (
            serverExplicitReset ||
            Number(srvAccMeta.revision ?? 0) > localAccMeta.revision ||
            Number(srvAccMeta.updatedAt ?? 0) > localAccMeta.updatedAt ||
            accRes.length !== accountsRef.current.length
          ) {
            applyAccountsState(accRes, { fromServer: true, meta: srvAccMeta });
            setCurrentUser((curr) => {
              if (!curr) return null;
              const updatedSelf = accRes.find(
                (a: UserAccount) =>
                  a.id === curr.id || a.login.toLowerCase() === curr.login.toLowerCase()
              );
              if (!updatedSelf) {
                return serverExplicitReset ? null : curr;
              }
              return {
                ...updatedSelf,
                previousLoginAt: curr.previousLoginAt ?? updatedSelf.previousLoginAt,
                lastLoginAt: curr.lastLoginAt ?? updatedSelf.lastLoginAt,
              };
            });
          }
        }

        // 2. Sync Journal non-destructively
        if (
          jourRes &&
          typeof jourRes === 'object' &&
          Array.isArray(jourRes.classes) &&
          inFlightJournalRef.current === 0
        ) {
          const localJourMeta = journalMetaRef.current;
          const serverExplicitReset =
            Number(srvJourMeta.resetToken ?? 0) > localJourMeta.resetToken;
          const serverWasWipedToFactory =
            Number(srvJourMeta.revision ?? 0) === 0 &&
            Number(srvJourMeta.resetToken ?? 0) === 0 &&
            (localJourMeta.revision > 0 || localJourMeta.dirty);

          if (localJourMeta.dirty || serverWasWipedToFactory) {
            // Preserve local classes, grades, timetable, bells, topics & push back to server!
            void enqueueServerPost('/api/journal', journalRef.current, undefined, 'journal');
          } else if (
            serverExplicitReset ||
            Number(srvJourMeta.revision ?? 0) > localJourMeta.revision ||
            Number(srvJourMeta.updatedAt ?? 0) > localJourMeta.updatedAt
          ) {
            applyJournalState(jourRes, { fromServer: true });
          }
        }
      } catch {
        // Silent fallback to local cache if server temporarily unreachable
      } finally {
        if (isInitial && active) {
          clearTimeout(loadingGuard);
          setIsInitialLoading(false);
        }
      }
    };

    void syncFromServer(true);

    let es: EventSource | null = null;
    let esErrorCount = 0;
    try {
      es = new EventSource('/api/events');
      es.onopen = () => {
        esErrorCount = 0;
      };
      es.onmessage = () => {
        esErrorCount = 0;
        void syncFromServer(false);
      };
      es.onerror = () => {
        esErrorCount += 1;
        if (esErrorCount >= 3 && es) {
          es.close();
          es = null;
        }
      };
    } catch {
      // ignore EventSource errors
    }

    const interval = setInterval(() => {
      if (accountsMetaRef.current.dirty || journalMetaRef.current.dirty) {
        void flushDirtyToServer();
      } else {
        void syncFromServer(false);
      }
    }, 2500);

    const flushOnLeave = () => {
      try {
        if (accountsMetaRef.current.dirty && typeof navigator.sendBeacon === 'function') {
          const accPayload = JSON.stringify({
            accounts: accountsRef.current,
            meta: accountsMetaRef.current,
          });
          if (accPayload.length < 62000) {
            navigator.sendBeacon('/api/accounts', new Blob([accPayload], { type: 'text/plain' }));
          }
        }
        if (journalMetaRef.current.dirty && typeof navigator.sendBeacon === 'function') {
          const jourPayload = JSON.stringify(journalRef.current);
          if (jourPayload.length < 62000) {
            navigator.sendBeacon('/api/journal', new Blob([jourPayload], { type: 'text/plain' }));
          }
        }
      } catch {
        // ignore beacon errors
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushOnLeave();
      } else if (document.visibilityState === 'visible') {
        void flushDirtyToServer().then(() => syncFromServer(false));
      }
    };
    const handleOnline = () => {
      void flushDirtyToServer();
    };
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pagehide', flushOnLeave);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      clearTimeout(loadingGuard);
      es?.close();
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', flushOnLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Keep localStorage mirrored cleanly (never triggers automatic server POSTs)
  useEffect(() => {
    journalRef.current = journal;
    try {
      localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(journal));
    } catch {
      // ignore storage errors
    }
  }, [journal]);

  useEffect(() => {
    accountsRef.current = accounts;
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch {
      // ignore storage errors
    }
  }, [accounts]);

  // Session-only persistence: closing the tab/browser automatically logs the user out
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      if (currentUser) {
        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch {
      // ignore storage errors
    }
  }, [currentUser]);

  const handleLogin = (
    account: UserAccount,
    serverAccounts?: UserAccount[],
    serverJournal?: unknown,
    serverAccountsMeta?: { revision?: number; updatedAt?: number; resetToken?: number }
  ) => {
    const nowStr = account.lastLoginAt || formatPolishDateTime(new Date());
    const loggedInAccount: UserAccount = {
      ...account,
      lastLoginAt: nowStr,
    };
    setCurrentUser(loggedInAccount);
    lastLocalMutationAt.current = Date.now();

    if (
      Array.isArray(serverAccounts) &&
      serverAccounts.length > 0 &&
      !accountsMetaRef.current.dirty
    ) {
      applyAccountsState(serverAccounts, { fromServer: true, meta: serverAccountsMeta });
    } else {
      const prev = accountsRef.current;
      const idx = prev.findIndex(
        (a) =>
          a.id === loggedInAccount.id ||
          a.login.toLowerCase() === loggedInAccount.login.toLowerCase()
      );
      const next =
        idx >= 0
          ? prev.map((a, i) => (i === idx ? loggedInAccount : a))
          : [...prev, loggedInAccount];
      const wasMissingOnServer =
        Array.isArray(serverAccounts) &&
        !serverAccounts.some(
          (a) =>
            a.id === loggedInAccount.id ||
            a.login.toLowerCase() === loggedInAccount.login.toLowerCase()
        );
      applyAccountsState(next, {
        fromServer: !accountsMetaRef.current.dirty && !wasMissingOnServer,
        dirty: accountsMetaRef.current.dirty || wasMissingOnServer,
        meta: serverAccountsMeta,
      });
      if (wasMissingOnServer) {
        void enqueueServerPost('/api/accounts/save', { account: loggedInAccount }, undefined, 'accounts');
      } else if (accountsMetaRef.current.dirty) {
        void enqueueServerPost(
          '/api/accounts',
          { accounts: next, meta: accountsMetaRef.current },
          undefined,
          'accounts'
        );
      }
    }

    if (
      serverJournal &&
      typeof serverJournal === 'object' &&
      Array.isArray((serverJournal as JournalState).classes)
    ) {
      const srvRev = Number((serverJournal as JournalState)._revision ?? 0);
      if (
        !journalMetaRef.current.dirty &&
        (srvRev > 0 || journalMetaRef.current.revision === 0)
      ) {
        applyJournalState(serverJournal as JournalState, { fromServer: true });
      } else if (journalMetaRef.current.dirty || journalMetaRef.current.revision > srvRev) {
        void enqueueServerPost('/api/journal', journalRef.current, undefined, 'journal');
      }
    }
    setActiveTab('pulpit');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const handleResetDemo = () => {
    lastLocalMutationAt.current = Date.now();
    const token = Date.now();
    persistJournalMeta({ revision: 0, updatedAt: token, resetToken: token, dirty: false });
    persistAccountsMeta({ revision: 0, updatedAt: token, resetToken: token, dirty: false });
    applyJournalState(
      { ...INITIAL_JOURNAL_DATA, _revision: 0, _updatedAt: token, _resetToken: token },
      { fromServer: true }
    );
    applyAccountsState(DEMO_ACCOUNTS, {
      fromServer: true,
      meta: { revision: 0, updatedAt: token, resetToken: token },
    });
    inFlightJournalRef.current += 1;
    inFlightAccountsRef.current += 1;
    fetch('/api/reset', { method: 'POST', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.journal) {
          applyJournalState(data.journal, { fromServer: true });
        }
        if (Array.isArray(data?.accounts)) {
          applyAccountsState(data.accounts, { fromServer: true, meta: data.accountsMeta });
        }
      })
      .catch(() => {})
      .finally(() => {
        inFlightJournalRef.current = Math.max(0, inFlightJournalRef.current - 1);
        inFlightAccountsRef.current = Math.max(0, inFlightAccountsRef.current - 1);
        lastLocalMutationAt.current = Date.now();
      });
    setShowSettingsModal(false);
  };

  const navigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  // Journal mutations
  const handleAddGrade = (grade: Omit<GradeEntry, 'id'>) => {
    mutateJournal((prev) => ({
      ...prev,
      grades: [
        { ...grade, id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
        ...prev.grades,
      ],
    }));
  };

  const handleUpdateGrade = (updated: GradeEntry) => {
    mutateJournal((prev) => ({
      ...prev,
      grades: prev.grades.map((g) => (g.id === updated.id ? updated : g)),
    }));
  };

  const handleDeleteGrade = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      grades: prev.grades.filter((g) => g.id !== id),
    }));
  };

  const handleClearSimulatedGrades = () => {
    mutateJournal((prev) => ({
      ...prev,
      grades: prev.grades.filter((g) => !g.isSimulated),
    }));
  };

  const handleExcuseAbsences = (recordIds: string[], excuseNote: string) => {
    mutateJournal((prev) => ({
      ...prev,
      attendance: prev.attendance.map((rec) =>
        recordIds.includes(rec.id) ? { ...rec, status: 'u', excuseNote } : rec
      ),
    }));
  };

  const handleTakeAttendance = (
    date: string,
    lessonNumber: number,
    subjectName: string,
    statusForJan: AttendanceStatus,
    topic: string
  ) => {
    mutateJournal((prev) => {
      const existingIdx = prev.attendance.findIndex(
        (a) => a.date === date && a.lessonNumber === lessonNumber
      );
      const newRecord = {
        id: existingIdx >= 0 ? prev.attendance[existingIdx].id : `att-${Date.now()}`,
        date,
        lessonNumber,
        subjectName,
        teacher: currentUser?.fullName ?? 'mgr Piotr Nowak',
        status: statusForJan,
        topic,
      };
      if (existingIdx >= 0) {
        const next = [...prev.attendance];
        next[existingIdx] = newRecord;
        return { ...prev, attendance: next };
      }
      return { ...prev, attendance: [...prev.attendance, newRecord] };
    });
  };

  const handleSaveAttendanceRecord = (record: AttendanceRecord) => {
    mutateJournal((prev) => {
      const exists = prev.attendance.some((a) => a.id === record.id);
      if (exists) {
        return {
          ...prev,
          attendance: prev.attendance.map((a) => (a.id === record.id ? record : a)),
        };
      }
      return {
        ...prev,
        attendance: [...prev.attendance, record],
      };
    });
  };

  const handleDeleteAttendanceRecord = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.id !== id),
    }));
  };

  const handleLogLesson = (
    classId: string,
    date: string,
    lessonNumber: number,
    subjectName: string,
    topic: string,
    statusForJan: AttendanceStatus,
    color?: string,
    syllabusTopicId?: string
  ) => {
    mutateJournal((prev) => {
      let nextAttendance = prev.attendance;
      if (classId === '3B') {
        const existingIdx = prev.attendance.findIndex(
          (a) => a.date === date && a.lessonNumber === lessonNumber
        );
        const newRecord: AttendanceRecord = {
          id: existingIdx >= 0 ? prev.attendance[existingIdx].id : `att-${Date.now()}`,
          date,
          lessonNumber,
          subjectName,
          teacher: currentUser?.fullName ?? 'mgr Piotr Nowak',
          status: statusForJan,
          topic,
        };
        if (existingIdx >= 0) {
          nextAttendance = [...prev.attendance];
          nextAttendance[existingIdx] = newRecord;
        } else {
          nextAttendance = [...prev.attendance, newRecord];
        }
      }
      return {
        ...prev,
        attendance: nextAttendance,
        lessonLogs: [
          ...prev.lessonLogs,
          {
            id: `ll-${Date.now()}`,
            classId,
            date,
            lessonNumber,
            subject: subjectName,
            teacher: currentUser?.fullName ?? 'Nauczyciel',
            topic,
            color: color ?? '#7B2276',
            syllabusTopicId,
          },
        ],
        syllabusTopics: syllabusTopicId
          ? prev.syllabusTopics.map((st) =>
              st.id === syllabusTopicId ? { ...st, completed: true } : st
            )
          : prev.syllabusTopics,
      };
    });
  };

  const handleCreateClass = (name: string, homeroomTeacher: string) => {
    const trimmedName = name.trim().toUpperCase();
    const trimmedTeacher = homeroomTeacher.trim() || 'Wychowawca';
    if (!trimmedName) return;

    const prev = journalRef.current;
    if (!prev.classes.some((c) => c.name.toUpperCase() === trimmedName)) {
      applyJournalState({
        ...prev,
        classes: [
          ...prev.classes,
          {
            id: trimmedName,
            name: trimmedName,
            homeroomTeacher: trimmedTeacher,
            students: [],
          },
        ],
      });
    }

    void enqueueServerPost(
      '/api/classes/create',
      { name: trimmedName, homeroomTeacher: trimmedTeacher },
      undefined,
      'journal'
    );
  };

  const handleUpdateClass = (oldClassId: string, newName: string, homeroomTeacher: string) => {
    const trimmedName = newName.trim().toUpperCase();
    const trimmedTeacher = homeroomTeacher.trim();
    if (!trimmedName) return;

    lastLocalMutationAt.current = Date.now();
    const prev = journalRef.current;
    const nextClasses = prev.classes.map((cls) =>
      cls.id === oldClassId
        ? {
            ...cls,
            id: trimmedName,
            name: trimmedName,
            homeroomTeacher: trimmedTeacher || cls.homeroomTeacher,
          }
        : cls
    );

    const nextSyllabus =
      oldClassId !== trimmedName
        ? prev.syllabusTopics.map((t) =>
            t.classId === oldClassId ? { ...t, classId: trimmedName } : t
          )
        : prev.syllabusTopics;

    const nextTimetable =
      oldClassId !== trimmedName
        ? prev.timetable.map((t) =>
            t.classId === oldClassId ? { ...t, classId: trimmedName } : t
          )
        : prev.timetable;

    const nextLessonLogs =
      oldClassId !== trimmedName
        ? prev.lessonLogs.map((l) =>
            l.classId === oldClassId ? { ...l, classId: trimmedName } : l
          )
        : prev.lessonLogs;

    applyJournalState({
      ...prev,
      classes: nextClasses,
      syllabusTopics: nextSyllabus,
      timetable: nextTimetable,
      lessonLogs: nextLessonLogs,
    });

    if (oldClassId !== trimmedName) {
      const nextAccounts = accountsRef.current.map((acc) =>
        acc.className === oldClassId
          ? {
              ...acc,
              className: trimmedName,
              subtitle: acc.subtitle.replace(`Klasa ${oldClassId}`, `Klasa ${trimmedName}`),
            }
          : acc
      );
      applyAccountsState(nextAccounts);

      if (currentUser?.className === oldClassId) {
        setCurrentUser((curr) =>
          curr
            ? {
                ...curr,
                className: trimmedName,
                subtitle: curr.subtitle.replace(`Klasa ${oldClassId}`, `Klasa ${trimmedName}`),
              }
            : null
        );
      }
    }

    void enqueueServerPost(
      '/api/classes/update',
      { oldClassId, newName: trimmedName, homeroomTeacher: trimmedTeacher },
      undefined,
      'both'
    );
  };

  const handleDeleteClass = (classId: string) => {
    const prev = journalRef.current;
    const remainingClasses = prev.classes.filter((c) => c.id !== classId);
    const fallbackClass = remainingClasses[0]?.name ?? '';

    applyJournalState({
      ...prev,
      classes: remainingClasses,
      syllabusTopics: prev.syllabusTopics.filter((t) => t.classId !== classId),
      timetable: prev.timetable.filter((t) => t.classId !== classId),
      lessonLogs: prev.lessonLogs.filter((l) => l.classId !== classId),
    });

    const nextAccounts = accountsRef.current.map((acc) => {
      if (acc.className === classId) {
        return {
          ...acc,
          className: fallbackClass,
          subtitle: fallbackClass
            ? acc.subtitle.replace(`Klasa ${classId}`, `Klasa ${fallbackClass}`)
            : acc.subtitle.replace(` · Klasa ${classId}`, ''),
        };
      }
      return acc;
    });
    applyAccountsState(nextAccounts);

    if (currentUser?.className === classId) {
      setCurrentUser((curr) =>
        curr
          ? {
              ...curr,
              className: fallbackClass,
              subtitle: fallbackClass
                ? curr.subtitle.replace(`Klasa ${classId}`, `Klasa ${fallbackClass}`)
                : curr.subtitle.replace(` · Klasa ${classId}`, ''),
            }
          : null
      );
    }

    void enqueueServerPost('/api/classes/delete', { classId }, undefined, 'both');
  };

  const handleApplyAutoPermissions = (targetRole?: UserRole) => {
    const nextAccounts = accountsRef.current.map((acc) => {
      if (!targetRole || acc.role === targetRole) {
        return {
          ...acc,
          permissions: getDefaultPermissionsForRole(acc.role),
        };
      }
      return acc;
    });
    applyAccountsState(nextAccounts);

    if (currentUser && (!targetRole || currentUser.role === targetRole)) {
      setCurrentUser((curr) =>
        curr
          ? {
              ...curr,
              permissions: getDefaultPermissionsForRole(curr.role),
            }
          : null
      );
    }

    void enqueueServerPost(
      '/api/accounts',
      { accounts: nextAccounts, meta: accountsMetaRef.current },
      undefined,
      'accounts'
    );
  };

  const handleCreateSubject = (name: string, teacher: string) => {
    const trimmedName = name.trim();
    const trimmedTeacher = teacher.trim() || 'Nauczyciel';
    if (!trimmedName) return;

    const slug = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = `${slug || 'subj'}-${Date.now().toString(36).slice(-4)}`;

    const prev = journalRef.current;
    if (!prev.subjects.some((s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      applyJournalState({
        ...prev,
        subjects: [...prev.subjects, { id, name: trimmedName, teacher: trimmedTeacher }],
      });
    }

    void enqueueServerPost(
      '/api/subjects/create',
      { id, name: trimmedName, teacher: trimmedTeacher },
      undefined,
      'journal'
    );
  };

  const handleDeleteSubject = (subjectId: string) => {
    const prev = journalRef.current;
    applyJournalState({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
    });

    void enqueueServerPost('/api/subjects/delete', { subjectId }, undefined, 'journal');
  };

  const handleCreateGradeCategory = (
    name: string,
    defaultWeight: number,
    countsToAverage: boolean
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const id = `cat-${Date.now().toString(36)}`;
    const weight = Math.min(5, Math.max(0, Number(defaultWeight) || 1));

    const prev = journalRef.current;
    const currentCats = prev.gradeCategories ?? DEFAULT_GRADE_CATEGORIES;
    if (!currentCats.some((c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      applyJournalState({
        ...prev,
        gradeCategories: [
          ...currentCats,
          { id, name: trimmedName, defaultWeight: weight, countsToAverage },
        ],
      });
    }

    void enqueueServerPost(
      '/api/categories/create',
      { id, name: trimmedName, defaultWeight: weight, countsToAverage },
      undefined,
      'journal'
    );
  };

  const handleDeleteGradeCategory = (categoryId: string) => {
    const prev = journalRef.current;
    const currentCats = prev.gradeCategories ?? DEFAULT_GRADE_CATEGORIES;
    applyJournalState({
      ...prev,
      gradeCategories: currentCats.filter((c) => c.id !== categoryId),
    });

    void enqueueServerPost('/api/categories/delete', { categoryId }, undefined, 'journal');
  };

  const handleSaveClassLessonHours = (
    classId: string,
    hours: Record<number, { start: string; end: string }>
  ) => {
    const trimmed = classId.trim();
    if (!trimmed) return;
    const prev = journalRef.current;
    const matchedCls = prev.classes.find(
      (c) =>
        c.id.toUpperCase() === trimmed.toUpperCase() ||
        c.name.toUpperCase() === trimmed.toUpperCase()
    );
    const canonicalId = matchedCls?.id ?? trimmed.toUpperCase();

    applyJournalState({
      ...prev,
      classLessonHours: {
        ...(prev.classLessonHours ?? {}),
        [canonicalId]: hours,
      },
    });

    void enqueueServerPost(
      '/api/classes/hours',
      { classId: canonicalId, hours },
      undefined,
      'journal'
    );
  };

  const handleCancelWholeDay = (classId: string, dayIndex: number, reason: string) => {
    const cleanReason = reason.trim();
    if (!cleanReason) return;
    const prev = journalRef.current;
    const targetClassId =
      classId.trim().toUpperCase() === 'ALL'
        ? 'ALL'
        : prev.classes.find(
            (c) =>
              c.id.toUpperCase() === classId.trim().toUpperCase() ||
              c.name.toUpperCase() === classId.trim().toUpperCase()
          )?.id ?? classId.trim().toUpperCase();

    const filteredDays = (prev.cancelledDays ?? []).filter(
      (d) => !(d.dayIndex === dayIndex && d.classId === targetClassId)
    );
    const newEntry = {
      id: `cday-${targetClassId}-${dayIndex}-${Date.now().toString(36)}`,
      classId: targetClassId,
      dayIndex,
      reason: cleanReason,
      cancelledBy: currentUser?.fullName ?? 'Dyrekcja',
      createdAt: formatPolishDateTime(new Date()),
    };

    applyJournalState({
      ...prev,
      cancelledDays: [...filteredDays, newEntry],
      timetable: prev.timetable.map((slot) => {
        const slotClass = slot.classId ?? '3B';
        const matches = targetClassId === 'ALL' || slotClass === targetClassId;
        if (slot.dayIndex === dayIndex && matches) {
          return { ...slot, changeType: 'cancelled', changeNote: cleanReason };
        }
        return slot;
      }),
    });

    void enqueueServerPost(
      '/api/timetable/cancel-day',
      {
        classId: targetClassId,
        dayIndex,
        reason: cleanReason,
        cancelledBy: currentUser?.fullName ?? 'Dyrekcja',
      },
      undefined,
      'journal'
    );
  };

  const handleRestoreWholeDay = (id?: string, classId?: string, dayIndex?: number) => {
    const prev = journalRef.current;
    const currentDays = prev.cancelledDays ?? [];
    const target = id
      ? currentDays.find((d) => d.id === id)
      : currentDays.find((d) => d.classId === classId && d.dayIndex === dayIndex);
    const targetClassId = target?.classId ?? classId;
    const targetDayIndex = target?.dayIndex ?? dayIndex;

    applyJournalState({
      ...prev,
      cancelledDays: currentDays.filter((d) => {
        if (id && d.id === id) return false;
        if (
          targetClassId &&
          targetDayIndex !== undefined &&
          d.classId === targetClassId &&
          d.dayIndex === targetDayIndex
        ) {
          return false;
        }
        return true;
      }),
      timetable: prev.timetable.map((slot) => {
        if (targetDayIndex === undefined || slot.dayIndex !== targetDayIndex) return slot;
        const slotClass = slot.classId ?? '3B';
        const matches = targetClassId === 'ALL' || slotClass === targetClassId;
        if (matches && slot.changeType === 'cancelled') {
          return { ...slot, changeType: 'normal', changeNote: undefined };
        }
        return slot;
      }),
    });

    void enqueueServerPost(
      '/api/timetable/restore-day',
      { id, classId: targetClassId, dayIndex: targetDayIndex },
      undefined,
      'journal'
    );
  };

  const handleTempMoveStudent = (
    fromClassId: string,
    toClassId: string,
    studentId: string,
    date: string,
    reason?: string
  ) => {
    if (!fromClassId || !toClassId || !studentId || !date || fromClassId === toClassId) return;
    const prev = journalRef.current;
    const fromCls = prev.classes.find((c) => c.id === fromClassId);
    const toCls = prev.classes.find((c) => c.id === toClassId);
    const student = fromCls?.students.find((s) => s.id === studentId);
    if (!fromCls || !toCls || !student) return;

    const existing = prev.temporaryTransfers ?? [];
    const filtered = existing.filter(
      (t) => !(t.studentId === studentId && t.date === date)
    );
    const entry = {
      id: `tmp-${Date.now().toString(36)}`,
      studentId,
      studentName: student.fullName,
      fromClassId: fromCls.id,
      toClassId: toCls.id,
      date,
      reason: reason?.trim() || undefined,
      createdBy: currentUser?.fullName ?? 'Nauczyciel',
      createdAt: formatPolishDateTime(new Date()),
    };

    applyJournalState({
      ...prev,
      temporaryTransfers: [...filtered, entry],
    });

    void enqueueServerPost(
      '/api/classes/students/temp-move',
      {
        fromClassId: fromCls.id,
        toClassId: toCls.id,
        studentId,
        date,
        reason: reason?.trim() || '',
        createdBy: currentUser?.fullName ?? 'Nauczyciel',
      },
      undefined,
      'journal'
    );
  };

  const handleDeleteTempStudent = (id: string) => {
    const prev = journalRef.current;
    applyJournalState({
      ...prev,
      temporaryTransfers: (prev.temporaryTransfers ?? []).filter((t) => t.id !== id),
    });

    void enqueueServerPost('/api/classes/students/temp-delete', { id }, undefined, 'journal');
  };

  const handleAddStudentToClass = (classId: string, fullName: string, number: number) => {
    const trimmedName = fullName.trim();
    const upperTarget = classId.trim().toUpperCase();
    if (!upperTarget || !trimmedName) return;
    const newStudent = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      number,
      fullName: trimmedName,
    };

    const prev = journalRef.current;
    const matchedCls = prev.classes.find(
      (c) => c.id.trim().toUpperCase() === upperTarget || c.name.trim().toUpperCase() === upperTarget
    );
    const canonicalClassId = matchedCls?.id ?? classId;

    applyJournalState({
      ...prev,
      classes: prev.classes.map((cls) => {
        if (cls.id !== canonicalClassId) return cls;
        const exists = cls.students.some(
          (s) =>
            s.fullName.trim().toLowerCase() === trimmedName.toLowerCase() &&
            s.number === number
        );
        if (exists) return cls;
        return {
          ...cls,
          students: [...cls.students, newStudent].sort((a, b) => a.number - b.number),
        };
      }),
    });

    void enqueueServerPost(
      '/api/classes/students/add',
      { classId: canonicalClassId, fullName: trimmedName, number, id: newStudent.id },
      undefined,
      'journal'
    );
  };

  const handleDeleteStudentFromClass = (classId: string, studentId: string) => {
    const prev = journalRef.current;
    const upperTarget = classId.trim().toUpperCase();
    applyJournalState({
      ...prev,
      classes: prev.classes.map((cls) =>
        cls.id.trim().toUpperCase() === upperTarget ||
        cls.name.trim().toUpperCase() === upperTarget
          ? {
              ...cls,
              students: cls.students.filter((s) => s.id !== studentId),
            }
          : cls
      ),
    });

    void enqueueServerPost(
      '/api/classes/students/delete',
      { classId, studentId },
      undefined,
      'journal'
    );
  };

  const handleMoveStudentBetweenClasses = (
    fromClassId: string,
    toClassId: string,
    studentId: string,
    targetNumber?: number
  ) => {
    if (!fromClassId || !toClassId || !studentId || fromClassId === toClassId) return;
    const prev = journalRef.current;
    const fromClass = prev.classes.find((c) => c.id === fromClassId);
    const toClass = prev.classes.find((c) => c.id === toClassId);
    const studentToMove = fromClass?.students.find((s) => s.id === studentId);
    if (!fromClass || !toClass || !studentToMove) return;

    const maxTargetNum = toClass.students.reduce((max, s) => Math.max(max, s.number || 0), 0);
    const finalNumber =
      targetNumber && Number.isFinite(targetNumber) && targetNumber >= 1
        ? Math.round(targetNumber)
        : maxTargetNum + 1;

    const movedStudent = { ...studentToMove, number: finalNumber };

    applyJournalState({
      ...prev,
      classes: prev.classes.map((cls) => {
        if (cls.id === fromClassId) {
          return {
            ...cls,
            students: cls.students.filter((s) => s.id !== studentId),
          };
        }
        if (cls.id === toClassId) {
          const filtered = cls.students.filter(
            (s) =>
              s.id !== studentId &&
              s.fullName.trim().toLowerCase() !== studentToMove.fullName.trim().toLowerCase()
          );
          return {
            ...cls,
            students: [...filtered, movedStudent].sort((a, b) => a.number - b.number),
          };
        }
        return cls;
      }),
    });

    const movedNameLower = studentToMove.fullName.trim().toLowerCase();
    let accountsUpdated = false;
    const nextAccounts = accountsRef.current.map((acc) => {
      if (
        isStudentRole(acc.role) &&
        acc.fullName.trim().toLowerCase() === movedNameLower &&
        (acc.className === fromClass.name || acc.className === fromClassId || !acc.className)
      ) {
        accountsUpdated = true;
        return {
          ...acc,
          className: toClass.name,
          studentNumber: finalNumber,
          subtitle: `${getRoleLabel(acc.role)} · Klasa ${toClass.name} · nr ${finalNumber}`,
        };
      }
      return acc;
    });
    if (accountsUpdated) {
      applyAccountsState(nextAccounts);
      if (
        currentUser &&
        isStudentRole(currentUser.role) &&
        currentUser.fullName.trim().toLowerCase() === movedNameLower
      ) {
        setCurrentUser((curr) =>
          curr
            ? {
                ...curr,
                className: toClass.name,
                studentNumber: finalNumber,
                subtitle: `${getRoleLabel(curr.role)} · Klasa ${toClass.name} · nr ${finalNumber}`,
              }
            : null
        );
      }
    }

    void enqueueServerPost(
      '/api/classes/students/move',
      { fromClassId, toClassId, studentId, targetNumber: finalNumber },
      undefined,
      'both'
    );
  };

  const handleCreateReadyTopic = (
    subjectId: string,
    title: string,
    hours: number,
    color: string
  ) => {
    const trimmed = title.trim();
    if (!subjectId || !trimmed) return;
    const safeHours = Math.min(10, Math.max(1, Number(hours) || 1));
    const safeColor = color || '#7B2276';
    const id = `rt-${Date.now().toString(36)}`;

    const prev = journalRef.current;
    const existingList = Array.isArray(prev.readyTopics) ? [...prev.readyTopics] : [];
    const idx = existingList.findIndex(
      (t) => t.subjectId === subjectId && t.title.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (idx >= 0) {
      existingList[idx] = { ...existingList[idx], title: trimmed, hours: safeHours, color: safeColor };
    } else {
      existingList.push({ id, subjectId, title: trimmed, hours: safeHours, color: safeColor });
    }
    applyJournalState({ ...prev, readyTopics: existingList });

    void enqueueServerPost(
      '/api/topics/ready/create',
      { id, subjectId, title: trimmed, hours: safeHours, color: safeColor },
      undefined,
      'journal'
    );
  };

  const handleDeleteReadyTopic = (topicId: string) => {
    const prev = journalRef.current;
    applyJournalState({
      ...prev,
      readyTopics: (prev.readyTopics ?? []).filter((t) => t.id !== topicId),
    });

    void enqueueServerPost('/api/topics/ready/delete', { topicId }, undefined, 'journal');
  };

  const handleAddSyllabusTopic = (
    classId: string,
    subjectId: string,
    title: string,
    hours: number,
    color: string
  ) => {
    mutateJournal((prev) => {
      const count = prev.syllabusTopics.filter(
        (t) => t.classId === classId && t.subjectId === subjectId
      ).length;
      return {
        ...prev,
        syllabusTopics: [
          ...prev.syllabusTopics,
          {
            id: `syl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            classId,
            subjectId,
            order: count + 1,
            title,
            hours,
            color,
            completed: false,
          },
        ],
      };
    });
  };

  const handleAddSyllabusTopicsBulk = (
    classId: string,
    subjectId: string,
    items: { title: string; hours: number; color: string }[]
  ) => {
    if (items.length === 0) return;
    mutateJournal((prev) => {
      const existing = prev.syllabusTopics.filter(
        (t) => t.classId === classId && t.subjectId === subjectId
      );
      let nextOrder = existing.length;
      const toAdd: SyllabusTopic[] = [];
      for (const item of items) {
        if (
          !existing.some((e) => e.title.trim().toLowerCase() === item.title.trim().toLowerCase()) &&
          !toAdd.some((e) => e.title.trim().toLowerCase() === item.title.trim().toLowerCase())
        ) {
          nextOrder += 1;
          toAdd.push({
            id: `syl-${Date.now()}-${nextOrder}-${Math.random().toString(36).slice(2, 5)}`,
            classId,
            subjectId,
            order: nextOrder,
            title: item.title.trim(),
            hours: item.hours,
            color: item.color,
            completed: false,
          });
        }
      }
      if (toAdd.length === 0) return prev;
      return {
        ...prev,
        syllabusTopics: [...prev.syllabusTopics, ...toAdd],
      };
    });
  };

  const handleToggleSyllabusTopic = (topicId: string) => {
    mutateJournal((prev) => ({
      ...prev,
      syllabusTopics: prev.syllabusTopics.map((t) =>
        t.id === topicId ? { ...t, completed: !t.completed } : t
      ),
    }));
  };

  const handleReorderSyllabusTopic = (
    classId: string,
    subjectId: string,
    sourceTopicId: string,
    targetTopicId: string
  ) => {
    mutateJournal((prev) => {
      const group = prev.syllabusTopics
        .filter((t) => t.classId === classId && t.subjectId === subjectId)
        .sort((a, b) => a.order - b.order);
      const fromIdx = group.findIndex((t) => t.id === sourceTopicId);
      const toIdx = group.findIndex((t) => t.id === targetTopicId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const reordered = [...group];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      const orderMap = new Map(reordered.map((t, idx) => [t.id, idx + 1]));
      return {
        ...prev,
        syllabusTopics: prev.syllabusTopics.map((t) =>
          orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t
        ),
      };
    });
  };

  const handleUpdateSyllabusTopic = (updated: SyllabusTopic) => {
    mutateJournal((prev) => ({
      ...prev,
      syllabusTopics: prev.syllabusTopics.map((t) => (t.id === updated.id ? updated : t)),
    }));
  };

  const handleDeleteSyllabusTopic = (topicId: string) => {
    mutateJournal((prev) => {
      const target = prev.syllabusTopics.find((t) => t.id === topicId);
      const remaining = prev.syllabusTopics.filter((t) => t.id !== topicId);
      if (!target) return { ...prev, syllabusTopics: remaining };
      const group = remaining
        .filter((t) => t.classId === target.classId && t.subjectId === target.subjectId)
        .sort((a, b) => a.order - b.order);
      const orderMap = new Map(group.map((t, idx) => [t.id, idx + 1]));
      return {
        ...prev,
        syllabusTopics: remaining.map((t) =>
          orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t
        ),
      };
    });
  };

  const handleCreateAccount = (newAcc: Omit<UserAccount, 'id'>, autoLogin?: boolean) => {
    const created: UserAccount = {
      ...newAcc,
      login: newAcc.login.trim(),
      fullName: newAcc.fullName.trim(),
      id: `acc-${Date.now()}`,
    };
    applyAccountsState([...accountsRef.current, created]);
    void enqueueServerPost('/api/accounts/save', created, undefined, 'accounts');

    if (isStudentRole(created.role) && created.studentNumber && created.className) {
      handleAddStudentToClass(created.className, created.fullName, created.studentNumber);
    }
    if (autoLogin) {
      setCurrentUser(created);
      setActiveTab('pulpit');
    }
  };

  const handleUpdateAccount = (updated: UserAccount) => {
    const cleaned: UserAccount = {
      ...updated,
      login: updated.login.trim(),
      fullName: updated.fullName.trim(),
    };
    applyAccountsState(accountsRef.current.map((a) => (a.id === cleaned.id ? cleaned : a)));
    void enqueueServerPost('/api/accounts/save', cleaned, undefined, 'accounts');

    if (currentUser?.id === cleaned.id) {
      setCurrentUser(cleaned);
    }
  };

  const handleDeleteAccount = (id: string) => {
    applyAccountsState(accountsRef.current.filter((a) => a.id !== id || a.id === 'acc-director'));
    void enqueueServerPost('/api/accounts/delete', { id }, undefined, 'accounts');
  };

  const handleMarkMessageRead = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
  };

  const handleMoveMessageFolder = (id: string, folder: 'inbox' | 'sent' | 'trash') => {
    mutateJournal((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === id ? { ...m, folder } : m)),
    }));
  };

  const handleSendMessage = (recipientName: string, subject: string, body: string) => {
    const now = formatPolishDateTime(new Date());
    const roleDesc = currentUser
      ? isStudentRole(currentUser.role)
        ? `${getRoleLabel(currentUser.role)} ${currentUser.className ?? '3B'}`
        : getRoleLabel(currentUser.role)
      : 'Użytkownik';
    mutateJournal((prev) => ({
      ...prev,
      messages: [
        {
          id: `msg-${Date.now()}`,
          folder: 'sent',
          senderName: currentUser?.fullName ?? 'Użytkownik',
          senderRole: roleDesc,
          recipientName,
          subject,
          body,
          date: now,
          read: true,
        },
        ...prev.messages,
      ],
    }));
  };

  const handleToggleHomework = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      homework: prev.homework.map((h) =>
        h.id === id ? { ...h, completed: !h.completed } : h
      ),
    }));
  };

  const handleAddBehaviorNote = (
    type: 'positive' | 'negative',
    category: string,
    description: string,
    points: number
  ) => {
    mutateJournal((prev) => ({
      ...prev,
      behaviorNotes: [
        {
          id: `bn-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type,
          category,
          teacher: currentUser?.fullName ?? 'Wychowawca',
          description,
          points,
        },
        ...prev.behaviorNotes,
      ],
    }));
  };

  const handleUpdateBehaviorNote = (updated: BehaviorNote) => {
    mutateJournal((prev) => ({
      ...prev,
      behaviorNotes: prev.behaviorNotes.map((n) => (n.id === updated.id ? updated : n)),
    }));
  };

  const handleDeleteBehaviorNote = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      behaviorNotes: prev.behaviorNotes.filter((n) => n.id !== id),
    }));
  };

  const handleAddAnnouncement = (title: string, content: string, pinned: boolean) => {
    mutateJournal((prev) => ({
      ...prev,
      announcements: [
        {
          id: `ann-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          author: currentUser?.fullName ?? 'Dyrektor Szkoły',
          authorRole: currentUser ? getRoleLabel(currentUser.role) : 'Dyrektor',
          title,
          content,
          pinned,
        },
        ...prev.announcements,
      ],
    }));
  };

  const handleUpdateAnnouncement = (updated: AnnouncementItem) => {
    mutateJournal((prev) => ({
      ...prev,
      announcements: prev.announcements.map((a) => (a.id === updated.id ? updated : a)),
    }));
  };

  const handleDeleteAnnouncement = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((a) => a.id !== id),
    }));
  };

  const handleAddCalendarEvent = (
    date: string,
    title: string,
    subject: string,
    category: CalendarCategory,
    description: string,
    lessonNumber?: number,
    teacher?: string
  ) => {
    mutateJournal((prev) => ({
      ...prev,
      calendarEvents: [
        {
          id: `cal-${Date.now()}`,
          date,
          title,
          subject,
          category,
          teacher: teacher?.trim() || currentUser?.fullName || 'Nauczyciel',
          description,
          lessonNumber,
        },
        ...prev.calendarEvents,
      ],
    }));
  };

  const handleUpdateCalendarEvent = (updated: CalendarEvent) => {
    mutateJournal((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteCalendarEvent = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter((c) => c.id !== id),
    }));
  };

  const handleAddHomework = (
    subject: string,
    dueDate: string,
    title: string,
    description: string
  ) => {
    mutateJournal((prev) => ({
      ...prev,
      homework: [
        {
          id: `hw-${Date.now()}`,
          subject,
          teacher: currentUser?.fullName ?? 'Nauczyciel',
          assignedDate: new Date().toISOString().slice(0, 10),
          dueDate,
          title,
          description,
          completed: false,
        },
        ...prev.homework,
      ],
    }));
  };

  const handleUpdateHomework = (updated: HomeworkItem) => {
    mutateJournal((prev) => ({
      ...prev,
      homework: prev.homework.map((h) => (h.id === updated.id ? updated : h)),
    }));
  };

  const handleDeleteHomework = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      homework: prev.homework.filter((h) => h.id !== id),
    }));
  };

  const handleUpdateTimetableChange = (
    lessonId: string,
    changeType: TimetableLesson['changeType'],
    subjectOverride?: string,
    teacherOverride?: string,
    changeNote?: string
  ) => {
    mutateJournal((prev) => ({
      ...prev,
      timetable: prev.timetable.map((slot) => {
        if (slot.id !== lessonId) return slot;
        if (changeType === 'normal') {
          return {
            ...slot,
            subject: slot.originalSubject ?? slot.subject.replace(' (Zastępstwo)', ''),
            changeType: 'normal',
            changeNote: undefined,
            originalSubject: undefined,
          };
        }
        if (changeType === 'substitution') {
          return {
            ...slot,
            originalSubject: slot.originalSubject ?? slot.subject,
            subject: subjectOverride ? `${subjectOverride} (Zastępstwo)` : slot.subject,
            teacher: teacherOverride || slot.teacher,
            changeType: 'substitution',
            changeNote,
          };
        }
        return {
          ...slot,
          changeType: 'cancelled',
          changeNote,
        };
      }),
    }));
  };

  const handleUpdateLuckyNumber = (num: number) => {
    mutateJournal((prev) => ({ ...prev, luckyNumber: num }));
  };

  const handleUpdateBehaviorGrade = (grade: string) => {
    mutateJournal((prev) => ({ ...prev, behaviorGrade: grade }));
  };

  const handleCreateClassRoom = (roomName: string) => {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    const prev = journalRef.current;
    const existing = Array.isArray(prev.classRooms) ? prev.classRooms : [];
    if (!existing.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      applyJournalState({
        ...prev,
        classRooms: [...existing, trimmed],
      });
    }
    void enqueueServerPost('/api/rooms/create', { name: trimmed }, undefined, 'journal');
  };

  const handleDeleteClassRoom = (roomName: string) => {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    const prev = journalRef.current;
    applyJournalState({
      ...prev,
      classRooms: (prev.classRooms ?? []).filter(
        (r) => r.toLowerCase() !== trimmed.toLowerCase()
      ),
    });
    void enqueueServerPost('/api/rooms/delete', { name: trimmed }, undefined, 'journal');
  };

  const handleSaveTimetableSlot = (slot: TimetableLesson) => {
    const slotClass = slot.classId ?? '3B';
    const trimmedRoom = slot.room?.trim();
    mutateJournal((prev) => {
      const existingRooms = Array.isArray(prev.classRooms) ? prev.classRooms : [];
      const nextRooms =
        trimmedRoom && !existingRooms.some((r) => r.toLowerCase() === trimmedRoom.toLowerCase())
          ? [...existingRooms, trimmedRoom]
          : existingRooms;
      const exists = prev.timetable.some((t) => t.id === slot.id);
      if (exists) {
        return {
          ...prev,
          classRooms: nextRooms,
          timetable: prev.timetable.map((t) => (t.id === slot.id ? slot : t)),
        };
      }
      return {
        ...prev,
        classRooms: nextRooms,
        timetable: [
          ...prev.timetable.filter(
            (t) =>
              !(
                (t.classId ?? '3B') === slotClass &&
                t.dayIndex === slot.dayIndex &&
                t.lessonNumber === slot.lessonNumber
              )
          ),
          { ...slot, classId: slotClass },
        ],
      };
    });
  };

  const handleMoveTimetableSlot = (
    sourceId: string,
    targetDayIndex: number,
    targetLessonNumber: number,
    classId: string,
    markAsMoved: boolean
  ) => {
    mutateJournal((prev) => {
      const source = prev.timetable.find((t) => t.id === sourceId);
      if (!source) return prev;
      const sourceClass = source.classId ?? classId;
      const targetExisting = prev.timetable.find(
        (t) =>
          (t.classId ?? '3B') === sourceClass &&
          t.dayIndex === targetDayIndex &&
          t.lessonNumber === targetLessonNumber &&
          t.id !== sourceId
      );

      const moveNote = `z ${WEEKDAYS_PL[source.dayIndex].slice(0, 3)} L${source.lessonNumber}`;
      const swapNote = `z ${WEEKDAYS_PL[targetDayIndex].slice(0, 3)} L${targetLessonNumber}`;

      return {
        ...prev,
        timetable: prev.timetable.map((slot) => {
          if (slot.id === source.id) {
            return {
              ...slot,
              classId: sourceClass,
              dayIndex: targetDayIndex,
              lessonNumber: targetLessonNumber,
              changeType: markAsMoved ? 'moved' : slot.changeType,
              changeNote: markAsMoved ? moveNote : slot.changeNote,
            };
          }
          if (targetExisting && slot.id === targetExisting.id) {
            return {
              ...slot,
              classId: sourceClass,
              dayIndex: source.dayIndex,
              lessonNumber: source.lessonNumber,
              changeType: markAsMoved ? 'moved' : slot.changeType,
              changeNote: markAsMoved ? swapNote : slot.changeNote,
            };
          }
          return slot;
        }),
      };
    });
  };

  const handleStartLessonFromSlot = (slot: TimetableLesson) => {
    const cleanSubject = slot.subject.replace(' (Zastępstwo)', '');
    const subjObj = journal.subjects.find((s) => s.name === cleanSubject);
    setLessonDraft({
      draftKey: Date.now(),
      classId: slot.classId ?? '3B',
      lessonNumber: slot.lessonNumber,
      subjectId: subjObj?.id ?? journal.subjects[0]?.id ?? 'mat',
      topic: slot.plannedTopic,
      color: slot.plannedTopicColor,
      syllabusTopicId: slot.plannedTopicId,
    });
    navigate('lekcja');
  };

  const handleDeleteTimetableSlot = (id: string) => {
    mutateJournal((prev) => ({
      ...prev,
      timetable: prev.timetable.filter((t) => t.id !== id),
    }));
  };

  const handleSaveSubjectFinalGrade = (subjectId: string, finalYear: string) => {
    mutateJournal((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId ? { ...s, finalYear } : s
      ),
    }));
  };

  const handleSaveMaintenance = (maintenance: MaintenanceBreak) => {
    const withTime: MaintenanceBreak = {
      ...maintenance,
      updatedAt: formatPolishDateTime(new Date()),
    };
    applyJournalState({
      ...journalRef.current,
      maintenance: withTime,
    });
    void enqueueServerPost('/api/maintenance', withTime, undefined, 'journal');
  };

  if (!currentUser) {
    return (
      <LoginView
        accounts={accounts}
        maintenance={journal.maintenance}
        isSyncingInitial={isInitialLoading}
        onLogin={handleLogin}
      />
    );
  }

  const unreadMessagesCount = journal.messages.filter(
    (m) => m.folder === 'inbox' && !m.read
  ).length;

  const perms = getEffectivePermissions(currentUser);
  const hasAnyStaffPermission =
    perms.editTimetable ||
    perms.editGrades ||
    perms.editAttendance ||
    perms.editAnnouncements ||
    perms.editCalendar ||
    perms.editClassesAndTopics ||
    perms.generateCertificates ||
    perms.manageAccounts;

  const isStaff = isStaffRole(currentUser.role) || hasAnyStaffPermission;

  const openOrgSection = (sec: StaffSection) => {
    setOrgSection(sec);
    navigate('nauczyciel');
  };

  const tabTitles: Record<ActiveTab, string> = {
    pulpit: 'Pulpit główny',
    indywidualni: 'O projekcie',
    oceny: 'Oceny',
    frekwencja: 'Frekwencja',
    plan: 'Plan lekcji',
    wiadomosci: 'Wiadomości',
    terminarz: 'Terminarz',
    zadania: 'Zadania domowe',
    uwagi: 'Uwagi i zachowanie',
    ogloszenia: 'Ogłoszenia',
    rozklady: 'Rozkłady materiału',
    lekcja: 'Interfejs lekcyjny',
    statystyki: 'Statystyki',
    pomoc: 'Pomoc',
    nauczyciel: 'Organizacja szkoły',
  };

  const circleShortcuts: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    accent?: boolean;
  }[] = [
    { id: 'indywidualni', label: 'indywidualni', icon: MessageSquare, accent: true },
    { id: 'lekcja', label: 'Lekcja', icon: Bell },
    { id: 'oceny', label: 'Oceny', icon: FileSpreadsheet },
    { id: 'frekwencja', label: 'Frekwencja', icon: ClipboardCheck },
    { id: 'wiadomosci', label: 'Wiadomości', icon: Mail, badge: unreadMessagesCount },
    { id: 'ogloszenia', label: 'Ogłoszenia', icon: Megaphone },
    { id: 'terminarz', label: 'Terminarz', icon: CalendarDays },
  ];

  return (
    <div
      className="min-h-screen bg-[#E9ECEF] print:bg-white flex flex-col relative"
      onClick={() => openDropdown && setOpenDropdown(null)}
    >
      {/* 1. Classic Top Black Utility Bar */}
      <div className="print:hidden bg-[#111111] text-white text-xs">
        <div className="max-w-[1320px] mx-auto px-4 h-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center gap-1.5 text-slate-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Menu</span>
          </button>

          <div className="hidden md:flex items-center ml-auto gap-1">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'dziennik' ? null : 'dziennik')}
                className="px-2.5 py-1 hover:bg-white/10 rounded-sm inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Dziennik</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {openDropdown === 'dziennik' && (
                <div className="absolute right-0 mt-1 w-48 bg-white text-slate-800 border border-slate-300 rounded shadow-lg py-1 z-50">
                  <button type="button" onClick={() => navigate('pulpit')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Strona główna</button>
                  <button type="button" onClick={() => navigate('oceny')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Oceny</button>
                  <button type="button" onClick={() => navigate('frekwencja')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Frekwencja</button>
                  <button type="button" onClick={() => navigate('plan')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Plan lekcji</button>
                  <button type="button" onClick={() => navigate('lekcja')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Lekcja (tematy i obecność)</button>
                  <button type="button" onClick={() => navigate('rozklady')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Rozkłady materiału</button>
                  <button type="button" onClick={() => navigate('uwagi')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Uwagi i zachowanie</button>
                </div>
              )}
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'moduly' ? null : 'moduly')}
                className="px-2.5 py-1 hover:bg-white/10 rounded-sm inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Moduły</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {openDropdown === 'moduly' && (
                <div className="absolute right-0 mt-1 w-44 bg-white text-slate-800 border border-slate-300 rounded shadow-lg py-1 z-50">
                  <button type="button" onClick={() => navigate('indywidualni')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">indywidualni.pl</button>
                  <button type="button" onClick={() => navigate('wiadomosci')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Wiadomości</button>
                  <button type="button" onClick={() => navigate('ogloszenia')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Ogłoszenia</button>
                  <button type="button" onClick={() => navigate('terminarz')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Terminarz</button>
                  <button type="button" onClick={() => navigate('zadania')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Zadania domowe</button>
                </div>
              )}
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'narzedzia' ? null : 'narzedzia')}
                className="px-2.5 py-1 hover:bg-white/10 rounded-sm inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Narzędzia</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {openDropdown === 'narzedzia' && (
                <div className="absolute right-0 mt-1 w-48 bg-white text-slate-800 border border-slate-300 rounded shadow-lg py-1 z-50">
                  <button type="button" onClick={() => navigate('oceny')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Kalkulator średniej</button>
                  <button type="button" onClick={() => navigate('rozklady')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Rozkłady materiału</button>
                  {isStaff && (
                    <button type="button" onClick={() => openOrgSection('director')} className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]">Szczęśliwy numerek</button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('statystyki')}
              className="px-2.5 py-1 hover:bg-white/10 rounded-sm cursor-pointer"
            >
              Statystyki
            </button>

            {isStaff && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown(openDropdown === 'organizacja' ? null : 'organizacja')
                  }
                  className="px-2.5 py-1 hover:bg-white/10 rounded-sm inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Organizacja szkoły</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>
                {openDropdown === 'organizacja' && (
                  <div className="absolute right-0 mt-1 w-60 bg-white text-slate-800 border border-slate-300 rounded shadow-lg py-1 z-50">
                    {perms.manageAccounts && (
                      <button
                        type="button"
                        onClick={() => openOrgSection('logins')}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276] font-semibold"
                      >
                        Konta, loginy, rangi i uprawnienia
                      </button>
                    )}
                    {perms.editClassesAndTopics && (
                      <button
                        type="button"
                        onClick={() => openOrgSection('classes_topics')}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]"
                      >
                        Klasy, uczniowie (1-dniowe/stałe) i tematy
                      </button>
                    )}
                    {(perms.editTimetable || perms.editClassesAndTopics || currentUser.role === 'director') && (
                      <button
                        type="button"
                        onClick={() => openOrgSection('lesson_hours')}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276] font-semibold"
                      >
                        Godziny lekcyjne dla klas
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('plan')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]"
                    >
                      Plan lekcji
                    </button>
                    {(perms.editTimetable || perms.editAnnouncements) && (
                      <button
                        type="button"
                        onClick={() => openOrgSection('director')}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]"
                      >
                        Zastępstwa, numerek i ogłoszenia
                      </button>
                    )}
                    {(currentUser.role === 'director' ||
                      perms.manageAccounts ||
                      perms.editAnnouncements) && (
                      <button
                        type="button"
                        onClick={() => openOrgSection('maintenance')}
                        className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 font-semibold"
                      >
                        Przerwa techniczna
                      </button>
                    )}
                    {perms.generateCertificates && (
                      <button
                        type="button"
                        onClick={() => openOrgSection('certificates')}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F5EEF8] hover:text-[#7B2276]"
                      >
                        Arkusze ocen i wzory świadectw
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="px-2.5 py-1 hover:bg-white/10 rounded-sm cursor-pointer"
            >
              Ustawienia
            </button>

            <button
              type="button"
              onClick={() => navigate('pomoc')}
              className="px-2.5 py-1 hover:bg-white/10 rounded-sm cursor-pointer"
            >
              Pomoc
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 hover:bg-white/10 rounded-sm font-semibold text-rose-200 cursor-pointer"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </div>

      {/* 2. Classic Silver-Sage Polygon Synergia Header Banner */}
      <header className="print:hidden relative overflow-hidden bg-gradient-to-r from-[#ECEEEF] via-[#E5E8EC] to-[#B7CCC0] border-b border-[#C5CCD4]">
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 130"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
        >
          <polygon points="0,0 260,0 130,130 0,130" fill="#FFFFFF" fillOpacity="0.45" />
          <polygon points="260,0 560,0 410,130 130,130" fill="#DDE2E6" fillOpacity="0.45" />
          <polygon points="880,0 1160,0 1010,130 760,130" fill="#D5E3DA" fillOpacity="0.55" />
          <polygon points="1160,0 1440,0 1440,130 1010,130" fill="#9BB9A9" fillOpacity="0.55" />
        </svg>

        <div className="relative max-w-[1320px] mx-auto px-4 sm:px-6 pt-1.5 pb-3">
          <div className="flex justify-end text-[11px] text-slate-600 mb-2">
            <span>
              ostatnie logowanie:{' '}
              <span className="font-mono tabular-nums">
                {currentUser.previousLoginAt || currentUser.lastLoginAt || formatPolishDateTime()}
              </span>
              <span className="mx-2 text-slate-400">|</span>
              jesteś zalogowany jako:{' '}
              <strong className="text-slate-900">{currentUser.fullName}</strong>{' '}
              <span className="text-[#8D2877] font-semibold">
                ({getRoleLabel(currentUser.role)})
              </span>
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('pulpit')}
              className="flex items-center gap-3 text-left cursor-pointer self-start md:self-auto"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B81D6B] via-[#8E247B] to-[#5E195B] text-white flex items-center justify-center shadow-sm border-2 border-white">
                <span className="font-display font-extrabold text-2xl italic tracking-tighter">
                  S
                </span>
              </div>
              <div className="leading-none">
                <div className="text-[11px] font-bold tracking-[0.18em] text-slate-700 text-right">
                  LIBRUS
                </div>
                <div className="font-display text-3xl font-extrabold text-[#9A2578] tracking-tight -mt-0.5">
                  Synergia
                </div>
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              {circleShortcuts.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className="group flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <div
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${
                        isActive
                          ? 'bg-[#8D2877] text-white border-[#6E1F5E] shadow-xs'
                          : item.accent
                            ? 'bg-gradient-to-b from-white via-[#F6F8FA] to-[#E3E7EC] text-[#9A2578] border-[#C1C8D0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.08)] group-hover:border-[#9A2578]'
                            : 'bg-gradient-to-b from-white via-[#F6F8FA] to-[#E3E7EC] text-slate-600 border-[#C1C8D0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.08)] group-hover:text-[#8D2877]'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[1.75]" />
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="absolute -bottom-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E11D48] text-white font-mono text-[10px] font-bold flex items-center justify-center tabular-nums shadow">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] ${
                        isActive
                          ? 'font-bold text-[#8D2877]'
                          : 'text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Fixed Left Blue Tab: "Interfejs lekcyjny / Otwórz" */}
      <button
        type="button"
        onClick={() => navigate('lekcja')}
        title="Otwórz Interfejs lekcyjny"
        className="print:hidden hidden xl:flex fixed left-0 top-48 z-30 flex-col items-center bg-[#1D70B8] hover:bg-[#165994] text-white rounded-r-md shadow-md overflow-hidden cursor-pointer transition-colors"
      >
        <span
          className="px-2 py-4 text-xs font-semibold tracking-wide"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Interfejs lekcyjny
        </span>
        <span className="w-full py-1.5 px-1 bg-[#2B2B2B] text-[10px] font-semibold text-center">
          Otwórz
        </span>
      </button>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/50 flex">
          <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-xl overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <span className="font-display font-bold text-slate-900">{currentUser.fullName}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1 text-sm">
                {(Object.keys(tabTitles) as ActiveTab[]).map((tabKey) => {
                  if (tabKey === 'nauczyciel' && !isStaff) return null;
                  return (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => navigate(tabKey)}
                      className={`w-full text-left px-3 py-2 rounded font-medium ${
                        activeTab === tabKey
                          ? 'bg-[#F5EEF8] text-[#7B2276] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {tabTitles[tabKey]}
                    </button>
                  );
                })}
                {(currentUser.role === 'director' ||
                  perms.manageAccounts ||
                  perms.editAnnouncements) && (
                  <button
                    type="button"
                    onClick={() => openOrgSection('maintenance')}
                    className="w-full text-left px-3 py-2 rounded font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100"
                  >
                    Przerwa techniczna
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full py-2 bg-rose-50 text-rose-700 font-semibold text-sm rounded"
            >
              Wyloguj
            </button>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 4. Main Content Area */}
      <main className="flex-1 max-w-[1220px] w-full mx-auto px-4 sm:px-6 py-5 print:p-0 print:max-w-none">
        <div className="print:hidden flex flex-wrap items-end gap-1 pl-0.5 -mb-px relative z-10">
          <button
            type="button"
            onClick={() => navigate('pulpit')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-t-[4px] border border-b-0 cursor-pointer transition-colors ${
              activeTab === 'pulpit'
                ? 'bg-[#76A815] text-white border-[#689412]'
                : 'bg-[#E3E7EC] text-slate-700 border-[#C5CCD4] hover:bg-white'
            }`}
          >
            Start
          </button>
          {activeTab !== 'pulpit' && (
            <span className="px-4 py-1.5 text-xs font-semibold rounded-t-[4px] border border-b-0 border-[#689412] bg-[#76A815] text-white">
              {tabTitles[activeTab]}
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate('plan')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-t-[4px] border border-b-0 border-[#C5CCD4] cursor-pointer ${
              activeTab === 'plan' ? 'hidden' : 'bg-[#F3F5F7] text-slate-700 hover:bg-white'
            }`}
          >
            Plan lekcji
          </button>
          <button
            type="button"
            onClick={() => navigate('rozklady')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-t-[4px] border border-b-0 border-[#C5CCD4] cursor-pointer ${
              activeTab === 'rozklady' ? 'hidden' : 'bg-[#F3F5F7] text-slate-700 hover:bg-white'
            }`}
          >
            Rozkłady materiału
          </button>
          <button
            type="button"
            onClick={() => navigate('zadania')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-t-[4px] border border-b-0 border-[#C5CCD4] cursor-pointer ${
              activeTab === 'zadania' ? 'hidden' : 'bg-[#F3F5F7] text-slate-700 hover:bg-white'
            }`}
          >
            Zadania domowe
          </button>
        </div>

        <div className="bg-white border border-[#C5CCD4] rounded-b-[3px] rounded-tr-[3px] shadow-sm p-4 sm:p-5 print:border-0 print:shadow-none print:p-0">
          {(isInitialLoading || syncStatus === 'saving') && (
            <div className="mb-4 px-3 py-2 rounded border bg-slate-50 border-slate-200 text-slate-600 text-xs font-medium flex items-center justify-between gap-2">
              <span>
                {isInitialLoading
                  ? 'Ładowanie zapisanych danych szkoły...'
                  : 'Automatyczne zapisywanie zmian...'}
              </span>
            </div>
          )}
          {activeTab === 'pulpit' && (
            <DashboardView journal={journal} user={currentUser} onNavigate={navigate} />
          )}
          {activeTab === 'indywidualni' && <IndywidualniView journal={journal} />}
          {activeTab === 'oceny' && (
            <GradesView
              journal={journal}
              userRole={currentUser.role}
              accounts={accounts}
              canEditOverride={perms.editGrades}
              onAddSimulatedGrade={handleAddGrade}
              onClearSimulatedGrades={handleClearSimulatedGrades}
              onAddRealGrade={handleAddGrade}
              onUpdateGrade={handleUpdateGrade}
              onDeleteGrade={handleDeleteGrade}
              onCreateSubject={handleCreateSubject}
              onDeleteSubject={handleDeleteSubject}
              onCreateGradeCategory={handleCreateGradeCategory}
              onDeleteGradeCategory={handleDeleteGradeCategory}
            />
          )}
          {activeTab === 'frekwencja' && (
            <AttendanceView
              journal={journal}
              userRole={currentUser.role}
              canEditAttendance={perms.editAttendance}
              onExcuseAbsences={handleExcuseAbsences}
              onSaveAttendanceRecord={handleSaveAttendanceRecord}
              onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
            />
          )}
          {activeTab === 'plan' && (
            <TimetableView
              journal={journal}
              user={currentUser}
              accounts={accounts}
              onSaveTimetableSlot={handleSaveTimetableSlot}
              onMoveTimetableSlot={handleMoveTimetableSlot}
              onDeleteTimetableSlot={handleDeleteTimetableSlot}
              onStartLessonFromSlot={handleStartLessonFromSlot}
              onSaveClassLessonHours={handleSaveClassLessonHours}
              onCancelWholeDay={handleCancelWholeDay}
              onRestoreWholeDay={handleRestoreWholeDay}
              onCreateClass={handleCreateClass}
              onCreateClassRoom={handleCreateClassRoom}
              onDeleteClassRoom={handleDeleteClassRoom}
            />
          )}
          {activeTab === 'wiadomosci' && (
            <MessagesView
              journal={journal}
              user={currentUser}
              accounts={accounts}
              onMarkRead={handleMarkMessageRead}
              onMoveFolder={handleMoveMessageFolder}
              onSendMessage={handleSendMessage}
            />
          )}
          {activeTab === 'terminarz' && (
            <CalendarView
              journal={journal}
              userRole={currentUser.role}
              accounts={accounts}
              canEditOverride={perms.editCalendar}
              onAddCalendarEvent={handleAddCalendarEvent}
              onUpdateCalendarEvent={handleUpdateCalendarEvent}
              onDeleteCalendarEvent={handleDeleteCalendarEvent}
            />
          )}
          {activeTab === 'zadania' && (
            <HomeworkView
              journal={journal}
              userRole={currentUser.role}
              canEditOverride={perms.editCalendar}
              onToggleHomework={handleToggleHomework}
              onAddHomework={handleAddHomework}
              onUpdateHomework={handleUpdateHomework}
              onDeleteHomework={handleDeleteHomework}
            />
          )}
          {activeTab === 'uwagi' && (
            <BehaviorView
              journal={journal}
              userRole={currentUser.role}
              canEditOverride={perms.editCalendar}
              onAddBehaviorNote={handleAddBehaviorNote}
              onUpdateBehaviorNote={handleUpdateBehaviorNote}
              onDeleteBehaviorNote={handleDeleteBehaviorNote}
            />
          )}
          {activeTab === 'ogloszenia' && (
            <AnnouncementsView
              journal={journal}
              userRole={currentUser.role}
              canEditOverride={perms.editAnnouncements}
              onAddAnnouncement={handleAddAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
            />
          )}
          {activeTab === 'rozklady' && (
            <SyllabusView
              journal={journal}
              userRole={currentUser.role}
              canEditOverride={perms.editClassesAndTopics}
              onAddSyllabusTopic={handleAddSyllabusTopic}
              onAddSyllabusTopicsBulk={handleAddSyllabusTopicsBulk}
              onToggleSyllabusTopic={handleToggleSyllabusTopic}
              onReorderSyllabusTopic={handleReorderSyllabusTopic}
              onUpdateSyllabusTopic={handleUpdateSyllabusTopic}
              onDeleteSyllabusTopic={handleDeleteSyllabusTopic}
              onCreateReadyTopic={handleCreateReadyTopic}
              onDeleteReadyTopic={handleDeleteReadyTopic}
            />
          )}
          {activeTab === 'lekcja' && (
            <LessonInterfaceView
              key={lessonDraft?.draftKey ?? 'default'}
              journal={journal}
              user={currentUser}
              initialDraft={lessonDraft}
              onLogLesson={handleLogLesson}
            />
          )}
          {activeTab === 'statystyki' && <StatsView journal={journal} />}
          {activeTab === 'pomoc' && <HelpView />}
          {activeTab === 'nauczyciel' && isStaff && (
            <StaffPanelView
              journal={journal}
              user={currentUser}
              accounts={accounts}
              initialSection={orgSection}
              onAddGrade={handleAddGrade}
              onTakeAttendance={handleTakeAttendance}
              onAddBehaviorNote={handleAddBehaviorNote}
              onUpdateBehaviorNote={handleUpdateBehaviorNote}
              onDeleteBehaviorNote={handleDeleteBehaviorNote}
              onAddAnnouncement={handleAddAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onAddCalendarEvent={handleAddCalendarEvent}
              onUpdateCalendarEvent={handleUpdateCalendarEvent}
              onDeleteCalendarEvent={handleDeleteCalendarEvent}
              onAddHomework={handleAddHomework}
              onUpdateHomework={handleUpdateHomework}
              onDeleteHomework={handleDeleteHomework}
              onUpdateTimetableChange={handleUpdateTimetableChange}
              onUpdateLuckyNumber={handleUpdateLuckyNumber}
              onUpdateBehaviorGrade={handleUpdateBehaviorGrade}
              onCreateClass={handleCreateClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onAddStudentToClass={handleAddStudentToClass}
              onDeleteStudentFromClass={handleDeleteStudentFromClass}
              onMoveStudentBetweenClasses={handleMoveStudentBetweenClasses}
              onAddSyllabusTopic={handleAddSyllabusTopic}
              onAddSyllabusTopicsBulk={handleAddSyllabusTopicsBulk}
              onReorderSyllabusTopic={handleReorderSyllabusTopic}
              onUpdateSyllabusTopic={handleUpdateSyllabusTopic}
              onDeleteSyllabusTopic={handleDeleteSyllabusTopic}
              onCreateReadyTopic={handleCreateReadyTopic}
              onDeleteReadyTopic={handleDeleteReadyTopic}
              onCreateAccount={handleCreateAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onApplyAutoPermissions={handleApplyAutoPermissions}
              onSaveSubjectFinalGrade={handleSaveSubjectFinalGrade}
              onSaveMaintenance={handleSaveMaintenance}
              onCreateSubject={handleCreateSubject}
              onDeleteSubject={handleDeleteSubject}
              onCreateGradeCategory={handleCreateGradeCategory}
              onDeleteGradeCategory={handleDeleteGradeCategory}
              onSaveClassLessonHours={handleSaveClassLessonHours}
              onCancelWholeDay={handleCancelWholeDay}
              onRestoreWholeDay={handleRestoreWholeDay}
              onTempMoveStudent={handleTempMoveStudent}
              onDeleteTempStudent={handleDeleteTempStudent}
              onCreateClassRoom={handleCreateClassRoom}
              onDeleteClassRoom={handleDeleteClassRoom}
            />
          )}
        </div>
      </main>

      {/* Ustawienia modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Ustawienia konta
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Użytkownik:</span>
                <span className="font-semibold text-slate-900">{currentUser.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ranga:</span>
                <span className="font-semibold text-[#8D2877]">
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uprawnienia:</span>
                <span className="font-medium text-slate-900">{currentUser.subtitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rok szkolny:</span>
                <span className="font-mono text-slate-900">{journal.schoolYear}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Zapis i ładowanie automatyczne aktywne — wszystkie konta, klasy i oceny zapisują się na bieżąco.
                  </span>
                </div>
                {perms.manageAccounts && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      openOrgSection('logins');
                    }}
                    className="w-full py-2 px-3 bg-[#F5EEF8] hover:bg-[#EBDCF2] text-[#7B2276] text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Zarządzaj kontami, rangami i uprawnieniami</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Przywróć początkowy stan dziennika</span>
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-[#7B2276] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

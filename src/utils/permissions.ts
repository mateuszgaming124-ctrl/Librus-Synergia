import { AccountPermissions, UserAccount, UserRole } from '../types/journal';

export interface RoleMeta {
  value: UserRole;
  label: string;
  isStaff: boolean;
  badgeClass: string;
}

export const ROLE_OPTIONS: RoleMeta[] = [
  {
    value: 'director',
    label: 'Dyrektor',
    isStaff: true,
    badgeClass: 'bg-purple-50 text-[#8D2877] border-purple-300',
  },
  {
    value: 'teacher',
    label: 'Nauczyciel',
    isStaff: true,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    value: 'psychologist',
    label: 'Psycholog',
    isStaff: true,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    value: 'speech_therapist',
    label: 'Logopeda',
    isStaff: true,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    value: 'parent',
    label: 'Rodzic',
    isStaff: false,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  {
    value: 'student',
    label: 'Uczeń',
    isStaff: false,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  {
    value: 'speech_student',
    label: 'Uczeń logopedyczny',
    isStaff: false,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    value: 'vicedirector',
    label: 'Wicedyrektor',
    isStaff: true,
    badgeClass: 'bg-purple-50 text-[#8D2877] border-purple-200',
  },
  {
    value: 'homeroom',
    label: 'Wychowawca',
    isStaff: true,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  {
    value: 'pedagogue',
    label: 'Pedagog szkolny',
    isStaff: true,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    value: 'librarian',
    label: 'Bibliotekarz',
    isStaff: true,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    value: 'secretary',
    label: 'Sekretariat',
    isStaff: true,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    value: 'educator',
    label: 'Wychowawca świetlicy',
    isStaff: true,
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
];

export function getRoleMeta(role: UserRole): RoleMeta {
  return ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[2];
}

export function getRoleLabel(role: UserRole): string {
  return getRoleMeta(role).label;
}

export function isStaffRole(role: UserRole): boolean {
  return getRoleMeta(role).isStaff;
}

export function isStudentRole(role: UserRole): boolean {
  return role === 'student' || role === 'speech_student';
}

export function getRolePermissionSummary(role: UserRole): string {
  switch (role) {
    case 'director':
    case 'vicedirector':
      return 'Pełny dostęp do 8/8 modułów (w tym zarządzanie kontami i oddziałami szkolnymi)';
    case 'teacher':
    case 'homeroom':
      return 'Dostęp dydaktyczny (7/8 modułów): oceny, frekwencja, tematy, plan, terminarz, ogłoszenia, świadectwa';
    case 'psychologist':
      return 'Pomoc psychologiczna (4/8 modułów): frekwencja, uwagi i zachowanie, terminarz, ogłoszenia, plan';
    case 'speech_therapist':
      return 'Terapia logopedyczna (4/8 modułów): frekwencja, uwagi i zachowanie, terminarz, ogłoszenia, plan';
    case 'pedagogue':
      return 'Pedagog szkolny (4/8 modułów): frekwencja, uwagi, terminarz, ogłoszenia, plan';
    case 'secretary':
      return 'Sekretariat (6/8 modułów): konta, świadectwa, oddziały, plan, terminarz, ogłoszenia';
    case 'librarian':
    case 'educator':
      return 'Świetlica / Biblioteka (3/8 modułów): frekwencja, terminarz, ogłoszenia';
    case 'parent':
      return 'Tryb rodzica: podgląd postępów dziecka, ocen, frekwencji, uwag, planu oraz usprawiedliwienia';
    case 'student':
      return 'Tryb ucznia: podgląd ocen, średnich, frekwencji, planu lekcji i zadań domowych';
    case 'speech_student':
      return 'Tryb ucznia logopedycznego: podgląd ocen, frekwencji, planu lekcji, zadań domowych i zajęć logopedycznych';
    default:
      return 'Domyślne uprawnienia dla wybranego stanowiska';
  }
}

export function getDefaultPermissionsForRole(role: UserRole): AccountPermissions {
  if (role === 'director' || role === 'vicedirector') {
    return {
      editTimetable: true,
      editGrades: true,
      editAttendance: true,
      editAnnouncements: true,
      editCalendar: true,
      editClassesAndTopics: true,
      generateCertificates: true,
      manageAccounts: true,
    };
  }
  if (role === 'teacher' || role === 'homeroom') {
    return {
      editTimetable: true,
      editGrades: true,
      editAttendance: true,
      editAnnouncements: true,
      editCalendar: true,
      editClassesAndTopics: true,
      generateCertificates: true,
      manageAccounts: true,
    };
  }
  if (role === 'secretary') {
    return {
      editTimetable: true,
      editGrades: false,
      editAttendance: false,
      editAnnouncements: true,
      editCalendar: true,
      editClassesAndTopics: true,
      generateCertificates: true,
      manageAccounts: true,
    };
  }
  if (
    role === 'speech_therapist' ||
    role === 'pedagogue' ||
    role === 'psychologist'
  ) {
    return {
      editTimetable: true,
      editGrades: false,
      editAttendance: true,
      editAnnouncements: true,
      editCalendar: true,
      editClassesAndTopics: false,
      generateCertificates: false,
      manageAccounts: false,
    };
  }
  if (role === 'librarian' || role === 'educator') {
    return {
      editTimetable: false,
      editGrades: false,
      editAttendance: true,
      editAnnouncements: true,
      editCalendar: true,
      editClassesAndTopics: false,
      generateCertificates: false,
      manageAccounts: false,
    };
  }
  return {
    editTimetable: false,
    editGrades: false,
    editAttendance: false,
    editAnnouncements: false,
    editCalendar: false,
    editClassesAndTopics: false,
    generateCertificates: false,
    manageAccounts: false,
  };
}

export function getEffectivePermissions(user: UserAccount): AccountPermissions {
  if (user.role === 'director') {
    return getDefaultPermissionsForRole('director');
  }
  const defaults = getDefaultPermissionsForRole(user.role);
  if (!user.permissions) {
    return defaults;
  }
  return {
    ...defaults,
    ...user.permissions,
  };
}

export const PERMISSION_LABELS: {
  key: keyof AccountPermissions;
  label: string;
  description: string;
}[] = [
  {
    key: 'editTimetable',
    label: 'Plan lekcji i zastępstwa',
    description: 'Edycja, dodawanie, usuwanie i przenoszenie lekcji',
  },
  {
    key: 'editGrades',
    label: 'Oceny',
    description: 'Wystawianie, edycja i usuwanie ocen bieżących i końcowych',
  },
  {
    key: 'editAttendance',
    label: 'Frekwencja',
    description: 'Sprawdzanie obecności oraz edycja/usuwanie wpisów',
  },
  {
    key: 'editAnnouncements',
    label: 'Ogłoszenia',
    description: 'Publikacja, przypinanie, edycja i usuwanie ogłoszeń',
  },
  {
    key: 'editCalendar',
    label: 'Terminarz, uwagi i zadania',
    description: 'Dodawanie, edycja i usuwanie wpisów w terminarzu, uwag i zadań',
  },
  {
    key: 'editClassesAndTopics',
    label: 'Klasy i tematy z kolorem',
    description: 'Tworzenie klas, uczniów oraz tematów rozkładów materiału',
  },
  {
    key: 'generateCertificates',
    label: 'Wzory świadectw',
    description: 'Generowanie i wydruk świadectw szkolnych MEiN',
  },
  {
    key: 'manageAccounts',
    label: 'Konta, loginy i uprawnienia',
    description: 'Zakładanie loginów Synergii, wybór rangi oraz zmiana uprawnień',
  },
];

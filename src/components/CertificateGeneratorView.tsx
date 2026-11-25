import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, FileText, Printer, Users } from 'lucide-react';
import { JournalState, UserAccount } from '../types/journal';
import {
  behaviorGradeToOfficialWord,
  calculateWeightedAverage,
  formatAverage,
  gradeToOfficialWord,
  normalizeFinalGradeDigit,
  numericAverageToFinalGrade,
  qualifiesForHonors,
} from '../utils/grades';

interface CertificateGeneratorViewProps {
  journal: JournalState;
  user: UserAccount;
  onSaveSubjectFinalGrade: (subjectId: string, finalYear: string) => void;
}

const CERTIFICATE_TEMPLATES = [
  {
    id: 'promocyjne',
    title: 'ŚWIADECTWO SZKOLNE PROMOCYJNE',
    symbol: 'MEiN-I/10',
    resolutionText: 'uzyskał(a) promocję do klasy programowo wyższej.',
  },
  {
    id: 'ukonczenia',
    title: 'ŚWIADECTWO UKOŃCZENIA SZKOŁY',
    symbol: 'MEiN-I/14',
    resolutionText: 'ukończył(a) szkołę z wynikiem pozytywnym.',
  },
] as const;

const OFFICIAL_GRADE_OPTIONS = [
  { value: '6', label: '6 — celujący' },
  { value: '5', label: '5 — bardzo dobry' },
  { value: '4', label: '4 — dobry' },
  { value: '3', label: '3 — dostateczny' },
  { value: '2', label: '2 — dopuszczający' },
  { value: '1', label: '1 — niedostateczny' },
  { value: 'zwolniony', label: 'zwolniony' },
  { value: 'nieklasyfikowany', label: 'nieklasyfikowany' },
];

export const CertificateGeneratorView: React.FC<CertificateGeneratorViewProps> = ({
  journal,
  user,
  onSaveSubjectFinalGrade,
}) => {
  const [selectedClassId, setSelectedClassId] = useState(journal.classes[0]?.id ?? '3B');
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

  const [scope, setScope] = useState<'single' | 'whole_class'>('single');
  const [selectedStudentId, setSelectedStudentId] = useState(
    activeClass.students[0]?.id ?? 'st-14'
  );
  const [templateType, setTemplateType] = useState<'promocyjne' | 'ukonczenia'>('promocyjne');
  const [schoolHeaderText, setSchoolHeaderText] = useState('');
  const [issueCityDate, setIssueCityDate] = useState('26 czerwca 2027 r.');
  const [birthDatePlace, setBirthDatePlace] = useState('..........................., ur. ...........................');
  const [pesel, setPesel] = useState('...........');
  const [honorsOverride, setHonorsOverride] = useState<'auto' | 'yes' | 'no'>('auto');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const defaultAchievements = useMemo(() => {
    const positives = journal.behaviorNotes
      .filter((n) => n.type === 'positive')
      .map((n) => n.description);
    return positives.length > 0 ? positives.join('; ') : 'Brak wpisów szczególnych osiągnięć';
  }, [journal.behaviorNotes]);

  const [achievementsText, setAchievementsText] = useState(defaultAchievements);

  // Build subject rows from journal (excluding Godzina wychowawcza per MEN rules)
  const gradedSubjects = useMemo(() => {
    return journal.subjects
      .filter((s) => s.id !== 'gw' && !s.name.toLowerCase().includes('wychowawcza'))
      .map((subj) => {
        const subjGrades = journal.grades.filter(
          (g) => g.subjectId === subj.id && !g.isSimulated
        );
        const weightedAvg = calculateWeightedAverage(subjGrades);

        let resolvedRaw = '';
        let sourceLabel = '';

        if (subj.finalYear) {
          resolvedRaw = subj.finalYear;
          sourceLabel = 'Ocena roczna w dzienniku';
        } else if (subj.finalTerm2) {
          resolvedRaw = subj.finalTerm2;
          sourceLabel = 'Ocena II okres';
        } else if (weightedAvg !== null) {
          const rounded = numericAverageToFinalGrade(weightedAvg);
          resolvedRaw = rounded ? String(rounded) : '4';
          sourceLabel = `Ze średniej (${formatAverage(weightedAvg)})`;
        } else if (subj.proposedTerm1) {
          const digit = normalizeFinalGradeDigit(subj.proposedTerm1);
          resolvedRaw = digit ? String(digit) : '4';
          sourceLabel = 'Z oceny przewidywanej I okr.';
        } else {
          resolvedRaw = 'nieklasyfikowany';
          sourceLabel = 'Brak ocen w dzienniku';
        }

        const digit = normalizeFinalGradeDigit(resolvedRaw);
        const officialWord = gradeToOfficialWord(resolvedRaw);

        return {
          subject: subj,
          weightedAvg,
          resolvedRaw,
          digit,
          officialWord,
          sourceLabel,
        };
      });
  }, [journal.subjects, journal.grades]);

  const honorsEval = useMemo(() => {
    const digits = gradedSubjects.map((r) => r.digit);
    return qualifiesForHonors(digits, journal.behaviorGrade);
  }, [gradedSubjects, journal.behaviorGrade]);

  const showRedWhiteStripe =
    honorsOverride === 'yes' ? true : honorsOverride === 'no' ? false : honorsEval.qualified;

  const currentTemplateMeta =
    CERTIFICATE_TEMPLATES.find((t) => t.id === templateType) ?? CERTIFICATE_TEMPLATES[0];

  const studentsToRender = useMemo(() => {
    if (scope === 'whole_class') {
      return activeClass.students;
    }
    const found =
      activeClass.students.find((s) => s.id === selectedStudentId) ?? activeClass.students[0];
    return found ? [found] : [];
  }, [scope, activeClass.students, selectedStudentId]);

  const officialBehavior = behaviorGradeToOfficialWord(journal.behaviorGrade);
  const certificateNumberPrefix = `${activeClass.name}/${journal.schoolYear.replace('/', '-')}`;

  return (
    <div className="space-y-6">
      {/* Control panel — hidden during print */}
      <section className="print:hidden border border-slate-200 rounded-md p-5 bg-slate-50/70 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#7B2276]" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Generator wzorów świadectw szkolnych (MEN / MEiN)
              </h2>
              <p className="text-xs text-slate-500">
                Automatycznie pobiera oceny końcowe z dziennika i formatuje je słownie w pełnym
                brzmieniu zgodnie z wytycznymi rozporządzenia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center gap-2 cursor-pointer self-start lg:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Drukuj / Zapisz wzór PDF</span>
          </button>
        </div>

        {savedNotice && (
          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Class, Student, Template & Honors Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wybierz klasę
            </label>
            <select
              value={activeClass.id}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedClassId(nextId);
                const nextCls = journal.classes.find((c) => c.id === nextId);
                if (nextCls && nextCls.students[0]) {
                  setSelectedStudentId(nextCls.students[0].id);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded font-semibold"
            >
              {journal.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Klasa {cls.name} ({cls.students.length} uczniów)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Zakres wzoru</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'single' | 'whole_class')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
            >
              <option value="single">Wybrany uczeń</option>
              <option value="whole_class">
                Cała klasa ({activeClass.students.length} świadectw)
              </option>
            </select>
          </div>

          {scope === 'single' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Uczeń</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={activeClass.students.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
              >
                {activeClass.students.length === 0 ? (
                  <option value="">Brak uczniów w klasie</option>
                ) : (
                  activeClass.students.map((st) => (
                    <option key={st.id} value={st.id}>
                      nr {st.number} · {st.fullName}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <div className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7B2276] shrink-0" />
                <span>Generowanie zbiorcze dla {activeClass.students.length} uczniów</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wzór druku MEiN
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as 'promocyjne' | 'ukonczenia')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
            >
              <option value="promocyjne">Świadectwo promocyjne (MEiN-I/10)</option>
              <option value="ukonczenia">Świadectwo ukończenia (MEiN-I/14)</option>
            </select>
          </div>
        </div>

        {/* Certificate metadata inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nazwa i siedziba szkoły (nagłówek druku)
            </label>
            <input
              type="text"
              value={schoolHeaderText}
              onChange={(e) => setSchoolHeaderText(e.target.value)}
              placeholder="Wpisz nazwę szkoły i miejscowość (opcjonalnie)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Miejscowość i data wydania
            </label>
            <input
              type="text"
              value={issueCityDate}
              onChange={(e) => setIssueCityDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wyróżnienie (pasek)
            </label>
            <select
              value={honorsOverride}
              onChange={(e) => setHonorsOverride(e.target.value as 'auto' | 'yes' | 'no')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
            >
              <option value="auto">
                Automatycznie ({honorsEval.qualified ? 'Tak — śr. >= 4,75' : 'Nie'})
              </option>
              <option value="yes">Z wyróżnieniem (pasek)</option>
              <option value="no">Bez wyróżnienia</option>
            </select>
          </div>
        </div>

        {scope === 'single' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data i miejsce urodzenia (do wzoru)
              </label>
              <input
                type="text"
                value={birthDatePlace}
                onChange={(e) => setBirthDatePlace(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PESEL</label>
              <input
                type="text"
                value={pesel}
                onChange={(e) => setPesel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Szczególne osiągnięcia (pobrane z pochwał)
              </label>
              <input
                type="text"
                value={achievementsText}
                onChange={(e) => setAchievementsText(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded"
              />
            </div>
          </div>
        )}

        {/* Editable mapping of final grades pulled from journal */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-semibold text-slate-800">
              Oceny końcowe pobrane z dziennika i przeliczone na zapis oficjalny
            </div>
            <div className="font-mono text-slate-700 tabular-nums">
              Średnia na świadectwie:{' '}
              <strong>
                {honorsEval.average !== null ? honorsEval.average.toFixed(2).replace('.', ',') : '—'}
              </strong>{' '}
              · Zachowanie: <strong>{officialBehavior}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-4">Przedmiot (obowiązkowe zajęcia)</th>
                  <th className="py-2 px-3">Źródło w dzienniku</th>
                  <th className="py-2 px-3 w-48">Ocena końcowa (zmień/zatwierdź)</th>
                  <th className="py-2 px-4">Sformatowana ocena na świadectwie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradedSubjects.map((row) => (
                  <tr key={row.subject.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 font-semibold text-slate-900">
                      {row.subject.name}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{row.sourceLabel}</td>
                    <td className="py-2 px-3">
                      <select
                        value={row.resolvedRaw}
                        onChange={(e) => {
                          onSaveSubjectFinalGrade(row.subject.id, e.target.value);
                          setSavedNotice(
                            `Zapisano ocenę roczną dla przedmiotu ${row.subject.name}: ${gradeToOfficialWord(
                              e.target.value
                            )}.`
                          );
                          setTimeout(() => setSavedNotice(null), 3000);
                        }}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium"
                      >
                        {OFFICIAL_GRADE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-4 font-serif font-semibold text-slate-900">
                      {row.officialWord}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Official Certificate Preview Sheet(s) */}
      {studentsToRender.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded">
          Wybrana klasa ({activeClass.name}) nie ma jeszcze przypisanych uczniów. Dopisz uczniów w
          zakładce „Klasy i wybór tematów”, aby wygenerować wzór świadectwa.
        </div>
      ) : (
        <div className="space-y-8">
          {studentsToRender.map((student, idx) => (
            <article
              key={student.id}
              className="relative bg-white border-2 border-slate-800 shadow-sm mx-auto max-w-[820px] p-8 sm:p-12 font-serif text-slate-900 print:shadow-none print:border-slate-900 print:break-after-page overflow-hidden"
            >
              {/* Official Polish red-and-white honors stripe when qualified */}
              {showRedWhiteStripe && (
                <div
                  aria-label="Pasek biało-czerwony — świadectwo z wyróżnieniem"
                  className="absolute top-0 bottom-0 left-7 w-5 flex border-x border-slate-300 pointer-events-none"
                >
                  <div className="w-1/2 h-full bg-white" />
                  <div className="w-1/2 h-full bg-[#DC143C]" />
                </div>
              )}

              <div className={showRedWhiteStripe ? 'pl-8' : ''}>
                {/* Header */}
                <div className="flex items-start justify-between text-[11px] text-slate-600 mb-4">
                  <span className="font-sans uppercase tracking-wider font-semibold">
                    Wzór {currentTemplateMeta.symbol}
                  </span>
                  <span className="font-mono tabular-nums">
                    Nr {certificateNumberPrefix}/{String(student.number).padStart(2, '0')}
                  </span>
                </div>

                <div className="text-center space-y-1.5 border-b border-slate-300 pb-5">
                  <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700">
                    RZECZPOSPOLITA POLSKA
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-slate-950">
                    {currentTemplateMeta.title}
                  </h3>
                  {showRedWhiteStripe && (
                    <div className="text-xs font-bold tracking-widest uppercase text-[#B91C1C]">
                      Z WYRÓŻNIENIEM
                    </div>
                  )}
                  <div className="text-xs text-slate-600 pt-1 min-h-[18px]">
                    {schoolHeaderText.trim() ||
                      '........................................................................................................ (nazwa i siedziba szkoły)'}
                  </div>
                </div>

                {/* Student Identity Block */}
                <div className="py-5 space-y-2 text-sm leading-relaxed border-b border-slate-200">
                  <p>
                    <span className="font-bold text-base">{student.fullName}</span>
                  </p>
                  <p className="text-xs text-slate-700">
                    urodzony(a): <span className="text-slate-900">{birthDatePlace}</span> · PESEL:{' '}
                    <span className="font-mono text-slate-900">{pesel}</span>
                  </p>
                  <p className="text-sm">
                    w roku szkolnym{' '}
                    <strong className="font-mono tabular-nums">{journal.schoolYear}</strong>{' '}
                    uczęszczał(a) do klasy <strong>{activeClass.name}</strong> i{' '}
                    {currentTemplateMeta.resolutionText}
                  </p>
                </div>

                {/* Official Grades Table */}
                <div className="py-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 text-center">
                    Wyniki klasyfikacji rocznej
                  </div>

                  <div className="border border-slate-800">
                    <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-100 text-xs font-bold">
                      <div className="col-span-7 py-2 px-3 border-r border-slate-800">
                        Obowiązkowe zajęcia edukacyjne
                      </div>
                      <div className="col-span-5 py-2 px-3">Ocena (w pełnym brzmieniu)</div>
                    </div>

                    <div className="divide-y divide-slate-300 text-xs">
                      {gradedSubjects.map((row) => (
                        <div key={row.subject.id} className="grid grid-cols-12">
                          <div className="col-span-7 py-1.5 px-3 border-r border-slate-800 font-medium text-slate-900">
                            {row.subject.name}
                          </div>
                          <div className="col-span-5 py-1.5 px-3 font-semibold text-slate-950">
                            {row.officialWord}
                          </div>
                        </div>
                      ))}

                      {/* Behavior Grade Row */}
                      <div className="grid grid-cols-12 border-t-2 border-slate-800 bg-slate-50">
                        <div className="col-span-7 py-2 px-3 border-r border-slate-800 font-bold text-slate-900">
                          Zachowanie
                        </div>
                        <div className="col-span-5 py-2 px-3 font-bold text-slate-950">
                          {officialBehavior}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Achievements */}
                <div className="py-3 border-t border-slate-200 text-xs space-y-1">
                  <div className="font-bold uppercase tracking-wide text-slate-700">
                    Szczególne osiągnięcia:
                  </div>
                  <p className="text-slate-800 italic">
                    {scope === 'single' ? achievementsText : defaultAchievements}
                  </p>
                </div>

                {/* Footer & Signatures */}
                <div className="pt-8 mt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="space-y-6">
                    <div className="text-slate-600">{issueCityDate}</div>
                    <div className="text-[11px] text-slate-500">
                      (miejscowość i data)
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-slate-400 pb-1 font-medium text-slate-900">
                      {activeClass.homeroomTeacher}
                    </div>
                    <div className="text-[11px] text-slate-500">Wychowawca klasy</div>
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-slate-400 pb-1 font-medium text-slate-900">
                      {user.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500">Dyrektor szkoły</div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                  <span>m.p. (pieczęć urzędowa szkoły)</span>
                  <span>
                    Świadectwo {idx + 1} z {studentsToRender.length} · Klasa {activeClass.name}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

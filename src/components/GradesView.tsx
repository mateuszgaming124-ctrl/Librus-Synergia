import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calculator, Edit3, Info, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { DEFAULT_GRADE_CATEGORIES } from '../data/initialJournalData';
import {
  GradeCategory,
  GradeCategoryItem,
  GradeEntry,
  JournalState,
  UserAccount,
  UserRole,
} from '../types/journal';
import {
  calculateWeightedAverage,
  formatAverage,
  formatDatePl,
  getGradeBadgeStyle,
} from '../utils/grades';
import { getRoleLabel, isStudentRole } from '../utils/permissions';

interface GradesViewProps {
  journal: JournalState;
  userRole: UserRole;
  accounts?: UserAccount[];
  canEditOverride?: boolean;
  onAddSimulatedGrade: (grade: Omit<GradeEntry, 'id'>) => void;
  onClearSimulatedGrades: () => void;
  onAddRealGrade: (grade: Omit<GradeEntry, 'id'>) => void;
  onUpdateGrade: (grade: GradeEntry) => void;
  onDeleteGrade: (id: string) => void;
  onCreateSubject?: (name: string, teacher: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onCreateGradeCategory?: (
    name: string,
    defaultWeight: number,
    countsToAverage: boolean
  ) => void;
  onDeleteGradeCategory?: (categoryId: string) => void;
}

const GRADE_VALUES = ['6', '5+', '5', '5-', '4+', '4', '4-', '3+', '3', '3-', '2+', '2', '1'];

export const GradesView: React.FC<GradesViewProps> = ({
  journal,
  userRole,
  accounts = [],
  canEditOverride,
  onAddSimulatedGrade,
  onClearSimulatedGrades,
  onAddRealGrade,
  onUpdateGrade,
  onDeleteGrade,
  onCreateSubject,
  onDeleteSubject,
  onCreateGradeCategory,
  onDeleteGradeCategory,
}) => {
  const canEdit = canEditOverride ?? (userRole === 'director' || userRole === 'teacher');
  const categoriesList: GradeCategoryItem[] = useMemo(
    () =>
      journal.gradeCategories && journal.gradeCategories.length > 0
        ? journal.gradeCategories
        : DEFAULT_GRADE_CATEGORIES,
    [journal.gradeCategories]
  );
  const [periodFilter, setPeriodFilter] = useState<'all' | 1 | 2>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeEntry | null>(null);
  const [isEditingSelected, setIsEditingSelected] = useState(false);

  // Edit form inside modal
  const [editValue, setEditValue] = useState('5');
  const [editWeight, setEditWeight] = useState(3);
  const [editCategory, setEditCategory] = useState<GradeCategory>('Sprawdzian');
  const [editPeriod, setEditPeriod] = useState<1 | 2>(1);
  const [editComment, setEditComment] = useState('');

  // Add real grade modal (for staff)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState(journal.subjects[0]?.id ?? 'mat');
  const [newValue, setNewValue] = useState('5');
  const [newWeight, setNewWeight] = useState(3);
  const [newCategory, setNewCategory] = useState<GradeCategory>('Sprawdzian');
  const [newPeriod, setNewPeriod] = useState<1 | 2>(1);
  const [newComment, setNewComment] = useState('');

  // Subject & Category manager modal (for staff)
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<'subjects' | 'categories'>('subjects');
  const [subjNameInput, setSubjNameInput] = useState('');
  const [subjTeacherInput, setSubjTeacherInput] = useState('');
  const [catNameInput, setCatNameInput] = useState('');
  const [catWeightInput, setCatWeightInput] = useState(2);
  const [catCountsAvgInput, setCatCountsAvgInput] = useState(true);
  const [manageFeedback, setManageFeedback] = useState<string | null>(null);

  // Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simSubjectId, setSimSubjectId] = useState(journal.subjects[0]?.id ?? 'mat');
  const [simValue, setSimValue] = useState('5');
  const [simWeight, setSimWeight] = useState(3);
  const [simPeriod, setSimPeriod] = useState<1 | 2>(1);

  useEffect(() => {
    if (journal.subjects.length > 0 && !journal.subjects.some((s) => s.id === newSubjectId)) {
      setNewSubjectId(journal.subjects[0].id);
    }
    if (journal.subjects.length > 0 && !journal.subjects.some((s) => s.id === simSubjectId)) {
      setSimSubjectId(journal.subjects[0].id);
    }
  }, [journal.subjects, newSubjectId, simSubjectId]);

  useEffect(() => {
    if (categoriesList.length > 0 && !categoriesList.some((c) => c.name === newCategory)) {
      setNewCategory(categoriesList[0].name);
      setNewWeight(categoriesList[0].defaultWeight);
    }
  }, [categoriesList, newCategory]);

  const simulatedCount = journal.grades.filter((g) => g.isSimulated).length;

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journal.subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.teacher.toLowerCase().includes(q)
    );
  }, [journal.subjects, searchQuery]);

  const overallRealAvg = useMemo(() => {
    const real = journal.grades.filter((g) => !g.isSimulated);
    return calculateWeightedAverage(real);
  }, [journal.grades]);

  const overallWithSimAvg = useMemo(() => {
    return calculateWeightedAverage(journal.grades);
  }, [journal.grades]);

  const subjectMap = new Map(journal.subjects.map((s) => [s.id, s]));

  const handleAddSim = (e: React.FormEvent) => {
    e.preventDefault();
    const subj = subjectMap.get(simSubjectId);
    onAddSimulatedGrade({
      subjectId: simSubjectId,
      value: simValue,
      weight: simWeight,
      category: 'Sprawdzian',
      period: simPeriod,
      date: '2026-11-20',
      teacher: subj?.teacher ?? 'Symulacja',
      comment: 'Ocena symulowana (kalkulator średniej)',
      countsToAverage: true,
      isSimulated: true,
    });
  };

  const openGradeModal = (g: GradeEntry) => {
    setSelectedGrade(g);
    setIsEditingSelected(false);
    setEditValue(g.value);
    setEditWeight(g.weight);
    setEditCategory(g.category);
    setEditPeriod(g.period);
    setEditComment(g.comment);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade) return;
    const updated: GradeEntry = {
      ...selectedGrade,
      value: editValue,
      weight: editWeight,
      category: editCategory,
      period: editPeriod,
      comment: editComment.trim(),
    };
    onUpdateGrade(updated);
    setSelectedGrade(updated);
    setIsEditingSelected(false);
  };

  const handleCreateRealGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const subj = subjectMap.get(newSubjectId);
    const catObj = categoriesList.find((c) => c.name === newCategory);
    onAddRealGrade({
      subjectId: newSubjectId,
      value: newValue,
      weight: newWeight,
      category: newCategory,
      period: newPeriod,
      date: new Date().toISOString().slice(0, 10),
      teacher: subj?.teacher ?? 'Dyrektor / Nauczyciel',
      comment: newComment.trim() || `${newCategory}`,
      countsToAverage: catObj?.countsToAverage !== false && newWeight > 0,
    });
    setNewComment('');
    setShowAddModal(false);
  };

  const handleCreateSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjNameInput.trim()) return;
    onCreateSubject?.(subjNameInput.trim(), subjTeacherInput.trim() || 'Nauczyciel');
    setManageFeedback(`Dodano przedmiot: ${subjNameInput.trim()}`);
    setSubjNameInput('');
    setSubjTeacherInput('');
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;
    onCreateGradeCategory?.(catNameInput.trim(), catWeightInput, catCountsAvgInput);
    setManageFeedback(`Dodano kategorię ocen: ${catNameInput.trim()}`);
    setCatNameInput('');
    setCatWeightInput(2);
    setCatCountsAvgInput(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & controls */}
      <section className="pb-5 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">Oceny ucznia</h1>
            <p className="text-xs text-slate-500 mt-1">
              Rok szkolny {journal.schoolYear} · Średnia ważona wszystkich ocen:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatAverage(overallRealAvg)}
              </span>
              {simulatedCount > 0 && (
                <>
                  {' '}
                  · Po symulacji:{' '}
                  <span className="font-mono font-semibold text-[#7B2276] tabular-nums">
                    {formatAverage(overallWithSimAvg)}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded bg-[#76A815] hover:bg-[#659011] text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Wystaw ocenę</span>
                </button>
                {(onCreateSubject || onCreateGradeCategory) && (
                  <button
                    type="button"
                    onClick={() => {
                      setManageFeedback(null);
                      setShowManageModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded border border-[#7B2276] text-[#7B2276] bg-white hover:bg-[#F8F1F8] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Przedmioty i kategorie</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setShowSimulator((v) => !v)}
              className={`px-3.5 py-2 text-xs font-semibold rounded border flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                showSimulator
                  ? 'bg-[#7B2276] text-white border-[#7B2276]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Symulator średniej</span>
            </button>

            {simulatedCount > 0 && (
              <button
                type="button"
                onClick={onClearSimulatedGrades}
                className="px-3.5 py-2 text-xs font-semibold rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wyczyść symulację ({simulatedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded self-start">
            <button
              type="button"
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                periodFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Wszystkie okresy
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter(1)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                periodFilter === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Okres 1
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter(2)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer whitespace-nowrap ${
                periodFilter === 2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Okres 2
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj przedmiotu lub nauczyciela..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#7B2276]"
            />
          </div>
        </div>

        {/* Interactive grade simulator drawer */}
        {showSimulator && (
          <form
            onSubmit={handleAddSim}
            className="mt-4 p-4 rounded bg-[#F8F1F8] border border-[#D8BFE2] grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#521F61] mb-1">Przedmiot</label>
              <select
                value={simSubjectId}
                onChange={(e) => setSimSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8BFE2] rounded"
              >
                {journal.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#521F61] mb-1">Ocena</label>
              <select
                value={simValue}
                onChange={(e) => setSimValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8BFE2] rounded font-mono"
              >
                {GRADE_VALUES.map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#521F61] mb-1">Waga</label>
              <select
                value={simWeight}
                onChange={(e) => setSimWeight(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8BFE2] rounded font-mono"
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    Waga {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={simPeriod}
                onChange={(e) => setSimPeriod(Number(e.target.value) as 1 | 2)}
                aria-label="Okres"
                className="px-2.5 py-2 text-sm bg-white border border-[#D8BFE2] rounded"
              >
                <option value={1}>Okr. 1</option>
                <option value={2}>Okr. 2</option>
              </select>
              <button
                type="submit"
                className="flex-1 px-3.5 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Gradebook table */}
      <section className="border border-slate-300 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-xs font-semibold text-slate-700">
                <th className="py-3 px-4 w-56">Przedmiot</th>
                {(periodFilter === 'all' || periodFilter === 1) && (
                  <>
                    <th className="py-3 px-4">Oceny bieżące (Okres 1)</th>
                    <th className="py-3 px-3 text-right w-20">Śr. I</th>
                    <th className="py-3 px-3 text-center w-16">I</th>
                  </>
                )}
                {(periodFilter === 'all' || periodFilter === 2) && (
                  <>
                    <th className="py-3 px-4">Oceny bieżące (Okres 2)</th>
                    <th className="py-3 px-3 text-right w-20">Śr. II</th>
                    <th className="py-3 px-3 text-center w-16">II</th>
                  </>
                )}
                <th className="py-3 px-3 text-right w-20">Śr. R</th>
                <th className="py-3 px-3 text-center w-16">R</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredSubjects.map((subj, idx) => {
                const grades1 = journal.grades.filter(
                  (g) => g.subjectId === subj.id && g.period === 1
                );
                const grades2 = journal.grades.filter(
                  (g) => g.subjectId === subj.id && g.period === 2
                );
                const allSubjGrades = [...grades1, ...grades2];

                const avg1 = calculateWeightedAverage(grades1);
                const avg2 = calculateWeightedAverage(grades2);
                const avgYear = calculateWeightedAverage(allSubjGrades);

                return (
                  <tr
                    key={subj.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50`}
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-slate-900">{subj.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{subj.teacher}</div>
                    </td>

                    {(periodFilter === 'all' || periodFilter === 1) && (
                      <>
                        <td className="py-3 px-4 align-middle">
                          {grades1.length === 0 ? (
                            <span className="text-xs text-slate-400">Brak ocen</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {grades1.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => openGradeModal(g)}
                                  title={`${g.category} (waga ${g.weight}) · ${formatDatePl(g.date)}`}
                                  className={`min-w-[2rem] h-7 px-2 rounded border font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${getGradeBadgeStyle(
                                    g.value
                                  )} ${g.isSimulated ? 'ring-2 ring-[#7B2276] border-dashed' : ''}`}
                                >
                                  {g.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-slate-700 tabular-nums align-middle">
                          {formatAverage(avg1)}
                        </td>
                        <td className="py-3 px-3 text-center align-middle">
                          {subj.proposedTerm1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-slate-50 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                              {subj.proposedTerm1}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {(periodFilter === 'all' || periodFilter === 2) && (
                      <>
                        <td className="py-3 px-4 align-middle">
                          {grades2.length === 0 ? (
                            <span className="text-xs text-slate-400">Brak ocen</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {grades2.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => openGradeModal(g)}
                                  title={`${g.category} (waga ${g.weight}) · ${formatDatePl(g.date)}`}
                                  className={`min-w-[2rem] h-7 px-2 rounded border font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${getGradeBadgeStyle(
                                    g.value
                                  )} ${g.isSimulated ? 'ring-2 ring-[#7B2276] border-dashed' : ''}`}
                                >
                                  {g.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-slate-700 tabular-nums align-middle">
                          {formatAverage(avg2)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-400 align-middle">
                          {subj.finalTerm2 ?? '—'}
                        </td>
                      </>
                    )}

                    <td className="py-3 px-3 text-right font-mono text-xs font-bold text-slate-900 tabular-nums align-middle">
                      {formatAverage(avgYear)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs text-slate-400 align-middle">
                      {subj.finalYear ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Kliknij ocenę, aby zobaczyć szczegóły
              {canEdit ? ' lub ją edytować / usunąć' : ''}.
            </span>
          </div>
          <div className="font-mono">Śr. I — średnia ważona · I — ocena przewidywana</div>
        </div>
      </section>

      {/* Grade detail / edit / delete modal */}
      {selectedGrade && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setSelectedGrade(null)}
        >
          <div
            className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">
                  {subjectMap.get(selectedGrade.subjectId)?.name} · Okres {selectedGrade.period}
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">
                  {isEditingSelected ? 'Edycja oceny' : 'Szczegóły oceny'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGrade(null)}
                aria-label="Zamknij"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isEditingSelected ? (
              <>
                <div className="py-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ocena:</span>
                    <span
                      className={`px-3 py-1 rounded border font-mono font-bold text-base tabular-nums ${getGradeBadgeStyle(
                        selectedGrade.value
                      )}`}
                    >
                      {selectedGrade.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kategoria:</span>
                    <span className="font-medium text-slate-900">{selectedGrade.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Waga:</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {selectedGrade.weight}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Data wystawienia:</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {formatDatePl(selectedGrade.date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nauczyciel:</span>
                    <span className="text-slate-900">{selectedGrade.teacher}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Komentarz</div>
                    <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded p-3">
                      {selectedGrade.comment || 'Brak komentarza.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSelected(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#7B2276] bg-[#F8F1F8] hover:bg-[#EADBF0] rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edytuj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteGrade(selectedGrade.id);
                          setSelectedGrade(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usuń ocenę</span>
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedGrade(null)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B2276] hover:bg-[#621A5E] rounded cursor-pointer"
                  >
                    Zamknij
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-3.5 mt-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ocena</label>
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded"
                    >
                      {GRADE_VALUES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Waga</label>
                    <select
                      value={editWeight}
                      onChange={(e) => setEditWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <option key={w} value={w}>
                          Waga {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kategoria
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as GradeCategory)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                    >
                      {!categoriesList.some((c) => c.name === editCategory) && editCategory && (
                        <option value={editCategory}>{editCategory}</option>
                      )}
                      {categoriesList.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} (waga {c.defaultWeight})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Okres</label>
                    <select
                      value={editPeriod}
                      onChange={(e) => setEditPeriod(Number(e.target.value) as 1 | 2)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                    >
                      <option value={1}>Okres 1</option>
                      <option value={2}>Okres 2</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Komentarz</label>
                  <input
                    type="text"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSelected(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
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

      {/* Add real grade modal */}
      {showAddModal && canEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Wystaw nową ocenę
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRealGrade} className="space-y-3.5 mt-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Przedmiot</label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                >
                  {journal.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ocena</label>
                  <select
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded"
                  >
                    {GRADE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waga</label>
                  <select
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  >
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        Waga {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      setNewCategory(chosen as GradeCategory);
                      const found = categoriesList.find((c) => c.name === chosen);
                      if (found) setNewWeight(found.defaultWeight);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} (waga {c.defaultWeight})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Okres</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(Number(e.target.value) as 1 | 2)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  >
                    <option value={1}>Okres 1</option>
                    <option value={2}>Okres 2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Komentarz</label>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="np. Odpowiedź ustna"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  Dodaj ocenę
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Subjects & Grade Categories modal */}
      {showManageModal && canEdit && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setShowManageModal(false)}
        >
          <div
            className="bg-white border border-slate-300 rounded-md max-w-2xl w-full p-6 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7B2276]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Zarządzaj przedmiotami i kategoriami ocen
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 inline-flex p-1 bg-slate-100 border border-slate-200 rounded">
              <button
                type="button"
                onClick={() => setManageTab('subjects')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer inline-flex items-center gap-1.5 ${
                  manageTab === 'subjects' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Przedmioty ({journal.subjects.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setManageTab('categories')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer inline-flex items-center gap-1.5 ${
                  manageTab === 'categories'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Kategorie ocen ({categoriesList.length})</span>
              </button>
            </div>

            {manageFeedback && (
              <div className="mt-3 px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {manageFeedback}
              </div>
            )}

            {manageTab === 'subjects' ? (
              <div className="mt-4 space-y-4">
                <form
                  onSubmit={handleCreateSubjectSubmit}
                  className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3"
                >
                  <div className="text-xs font-bold text-slate-800">Dodaj nowy przedmiot</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Nazwa przedmiotu
                      </label>
                      <input
                        type="text"
                        required
                        value={subjNameInput}
                        onChange={(e) => setSubjNameInput(e.target.value)}
                        placeholder="np. Muzyka, Etyka, Robotyka"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Nauczyciel prowadzący
                      </label>
                      {(() => {
                        const teacherList = Array.from(
                          new Map([
                            ...accounts
                              .filter((a) => !isStudentRole(a.role) && a.role !== 'parent')
                              .map((a) => [a.fullName, `${a.fullName} (${getRoleLabel(a.role)})`] as const),
                            ...journal.subjects.map((s) => [s.teacher, `${s.teacher} (${s.name})`] as const),
                            ...journal.classes.map((c) => [c.homeroomTeacher, `${c.homeroomTeacher} (Wych. ${c.name})`] as const),
                          ]).entries()
                        );
                        return (
                          <>
                            <select
                              value={
                                teacherList.some(([val]) => val === subjTeacherInput)
                                  ? subjTeacherInput
                                  : ''
                              }
                              onChange={(e) => {
                                if (e.target.value) setSubjTeacherInput(e.target.value);
                              }}
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded mb-1.5"
                            >
                              <option value="">— Wybierz nauczyciela z listy —</option>
                              {teacherList.map(([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={subjTeacherInput}
                              onChange={(e) => setSubjTeacherInput(e.target.value)}
                              placeholder="Lub wpisz nauczyciela ręcznie..."
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj przedmiot</span>
                  </button>
                </form>

                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {journal.subjects.map((subj) => (
                    <div
                      key={subj.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{subj.name}</span>
                        <span className="text-slate-500 ml-2">— {subj.teacher}</span>
                      </div>
                      {onDeleteSubject && journal.subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSubject(subj.id);
                            setManageFeedback(`Usunięto przedmiot: ${subj.name}`);
                          }}
                          title="Usuń przedmiot"
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <form
                  onSubmit={handleCreateCategorySubmit}
                  className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3"
                >
                  <div className="text-xs font-bold text-slate-800">
                    Dodaj nową kategorię ocen
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Nazwa kategorii
                      </label>
                      <input
                        type="text"
                        required
                        value={catNameInput}
                        onChange={(e) => setCatNameInput(e.target.value)}
                        placeholder="np. Egzamin próbny, Referat, Ćwiczenia"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Domyślna waga
                      </label>
                      <select
                        value={catWeightInput}
                        onChange={(e) => setCatWeightInput(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded"
                      >
                        {[0, 1, 2, 3, 4, 5].map((w) => (
                          <option key={w} value={w}>
                            Waga {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catCountsAvgInput}
                      onChange={(e) => setCatCountsAvgInput(e.target.checked)}
                      className="rounded border-slate-300 text-[#7B2276]"
                    />
                    <span>Wliczaj oceny tej kategorii do średniej ważonej</span>
                  </label>
                  <div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#7B2276] hover:bg-[#621A5E] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dodaj kategorię</span>
                    </button>
                  </div>
                </form>

                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {categoriesList.map((cat) => (
                    <div
                      key={cat.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{cat.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700">
                          waga {cat.defaultWeight}
                        </span>
                        {cat.countsToAverage === false && (
                          <span className="text-[11px] text-slate-500">(bez średniej)</span>
                        )}
                      </div>
                      {onDeleteGradeCategory && categoriesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGradeCategory(cat.id);
                            setManageFeedback(`Usunięto kategorię: ${cat.name}`);
                          }}
                          title="Usuń kategorię"
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7B2276] rounded cursor-pointer"
              >
                Zapisz i zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

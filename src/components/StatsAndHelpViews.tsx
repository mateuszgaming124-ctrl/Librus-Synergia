import React from 'react';
import { BarChart3, HelpCircle } from 'lucide-react';
import { JournalState } from '../types/journal';
import { calculateWeightedAverage, formatAverage } from '../utils/grades';

export const StatsView: React.FC<{ journal: JournalState }> = ({ journal }) => {
  const realGrades = journal.grades.filter((g) => !g.isSimulated);
  const overallAvg = calculateWeightedAverage(realGrades);

  const subjectRows = journal.subjects
    .map((subj) => {
      const sg = realGrades.filter((g) => g.subjectId === subj.id);
      const avg = calculateWeightedAverage(sg);
      return { name: subj.name, avg, count: sg.length };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-[#7B2276]" />
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Statystyki — Zestawienie średnich ocen
            </h1>
            <p className="text-xs text-slate-500">
              Średnia ogólna: <strong className="font-mono">{formatAverage(overallAvg)}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {subjectRows.map((row) => {
          const pct = row.avg ? Math.min(100, (row.avg / 6) * 100) : 0;
          return (
            <div key={row.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{row.name}</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatAverage(row.avg)} ({row.count} ocen)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7B2276] rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HelpView: React.FC = () => {
  const sections = [
    {
      title: '1. Prowadzenie lekcji i Interfejs lekcyjny',
      text: 'Kliknij niebieską zakładkę „Interfejs lekcyjny” po lewej stronie ekranu lub ikonę „Lekcja” w górnym pasku. Wybierz godzinę lekcyjną i przedmiot, pobierz temat z Rozkładu materiału i sprawdź listę obecności.',
    },
    {
      title: '2. Kategorie ocen i średnia ważona',
      text: 'W zakładce Oceny każda ocena cząstkowa posiada przypisaną wagę (1–5) i kategorię (Sprawdzian, Kartkówka, Odpowiedź ustna, Projekt). Średnia ważona przelicza się automatycznie.',
    },
    {
      title: '3. Szczęśliwy numerek',
      text: 'Szczęśliwy numerek jest widoczny na stronie startowej oraz na liście obecności w Interfejsie lekcyjnym. Dyrektor może losować lub zmieniać numer w sekcji Organizacja szkoły.',
    },
    {
      title: '4. Rozkłady materiału i Zadania domowe',
      text: 'W menu Dziennik → Rozkłady materiału nauczyciele i dyrektor mogą dodawać tematy z podstawy programowej oraz oznaczać stopień realizacji godzin.',
    },
    {
      title: '5. Frekwencja i usprawiedliwienia',
      text: 'Statusy obecności to: ob (obecność), nb (nieobecność), u (usprawiedliwiona), sp (spóźnienie), zw (zwolnienie). Rodzic może usprawiedliwiać nieobecności bezpośrednio w module Frekwencja.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
        <HelpCircle className="w-5 h-5 text-[#7B2276]" />
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Pomoc — Przewodnik po systemie Synergia
          </h1>
          <p className="text-xs text-slate-500">
            Skrócona instrukcja obsługi modułów dziennika elektronicznego
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {sections.map((s) => (
          <div key={s.title} className="py-4 first:pt-0 last:pb-0">
            <h2 className="font-display text-sm font-bold text-slate-900">{s.title}</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

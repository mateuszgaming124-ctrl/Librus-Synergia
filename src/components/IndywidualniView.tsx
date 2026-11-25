import React from 'react';
import { BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { JournalState } from '../types/journal';

interface IndywidualniViewProps {
  journal: JournalState;
}

export const IndywidualniView: React.FC<IndywidualniViewProps> = ({ journal }) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#1D70B8] via-[#76A815] to-[#B81D6B] text-white font-display font-extrabold text-sm flex items-center justify-center">
              i
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-800">
              indywidualni<span className="text-[#1D70B8]">.pl</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">edukacja dla efektów</p>
        </div>
        <span className="text-xs font-mono text-slate-500">
          Rok szkolny {journal.schoolYear}
        </span>
      </div>

      {/* Magenta banner matching LIBRUS Synergia screenshot */}
      <div className="bg-gradient-to-r from-[#9A2578] to-[#B84D95] text-white px-5 py-2.5 rounded-sm shadow-xs">
        <h2 className="font-display text-lg font-bold tracking-wide uppercase">
          MODUŁ INDYWIDUALNI
        </h2>
      </div>

      <p className="text-center text-sm font-medium text-slate-800">
        Na Twoim koncie w LIBRUS Synergia dostępny jest moduł Indywidualni w{' '}
        <strong className="text-[#9A2578]">wersji podstawowej</strong>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <section className="border-2 border-[#9A2578] rounded-lg overflow-hidden bg-white shadow-xs">
          <div className="bg-[#9A2578] text-white p-5 text-center">
            <div className="font-display text-xl font-extrabold uppercase tracking-wide">
              Wersja Podstawowa
            </div>
            <div className="text-xs font-semibold tracking-wider uppercase text-purple-100 mt-1">
              Modułu Indywidualni
            </div>
          </div>
          <div className="p-5 space-y-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">
              Dostępna na Twoim koncie, obejmuje:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#76A815] shrink-0 mt-0.5" />
                <span>Diagnoza stylów uczenia się i predyspozycji uczniów</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#76A815] shrink-0 mt-0.5" />
                <span>Podstawowe rekomendacje metod pracy dla nauczyciela i rodzica</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#76A815] shrink-0 mt-0.5" />
                <span>Raporty klasowe dostępne z poziomu modułu</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
          <div className="bg-slate-100 text-slate-700 p-5 text-center border-b border-slate-200">
            <div className="font-display text-xl font-extrabold uppercase tracking-wide">
              Wersja Rozszerzona
            </div>
            <div className="text-xs font-semibold tracking-wider uppercase text-slate-500 mt-1">
              Modułu Indywidualni
            </div>
          </div>
          <div className="p-5 space-y-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              Udostępniana po zakupie przez szkołę licencji rozszerzonej:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#9A2578] shrink-0 mt-0.5" />
                <span>Indywidualne plany edukacyjno-terapeutyczne (IPET)</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-[#9A2578] shrink-0 mt-0.5" />
                <span>Rozbudowana baza materiałów i kart pracy dla uczniów</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-[#9A2578] shrink-0 mt-0.5" />
                <span>Szczegółowa analityka postępów w zespołach klasowych</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

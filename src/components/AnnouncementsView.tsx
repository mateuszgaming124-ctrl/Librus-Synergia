import React, { useState } from 'react';
import { Edit3, Megaphone, Pin, Plus, Trash2, X } from 'lucide-react';
import { AnnouncementItem, JournalState, UserRole } from '../types/journal';
import { formatDatePl } from '../utils/grades';

interface AnnouncementsViewProps {
  journal: JournalState;
  userRole: UserRole;
  canEditOverride?: boolean;
  onAddAnnouncement: (title: string, content: string, pinned: boolean) => void;
  onUpdateAnnouncement: (item: AnnouncementItem) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  journal,
  userRole,
  canEditOverride,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}) => {
  const canEdit = canEditOverride ?? (userRole === 'director' || userRole === 'teacher');
  const [modalItem, setModalItem] = useState<{
    existing?: AnnouncementItem;
    title: string;
    content: string;
    pinned: boolean;
  } | null>(null);

  const sorted = [...journal.announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.date.localeCompare(a.date);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem || !modalItem.title.trim() || !modalItem.content.trim()) return;
    if (modalItem.existing) {
      onUpdateAnnouncement({
        ...modalItem.existing,
        title: modalItem.title.trim(),
        content: modalItem.content.trim(),
        pinned: modalItem.pinned,
      });
    } else {
      onAddAnnouncement(modalItem.title.trim(), modalItem.content.trim(), modalItem.pinned);
    }
    setModalItem(null);
  };

  return (
    <div className="space-y-5">
      <section className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#7B2276]" />
            <h1 className="font-display text-xl font-bold text-slate-900">Ogłoszenia</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Oficjalne komunikaty dyrekcji, wychowawców i organizacji szkolnych
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setModalItem({ title: '', content: '', pinned: false })}
            className="px-4 py-2 bg-[#76A815] hover:bg-[#659011] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj ogłoszenie</span>
          </button>
        )}
      </section>

      <div className="space-y-3.5">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 border border-slate-200 rounded">
            Brak ogłoszeń.
          </div>
        ) : (
          sorted.map((ann) => (
            <article
              key={ann.id}
              className="border border-slate-200 rounded-md p-5 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{ann.author}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ann.authorRole}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatDatePl(ann.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {ann.pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2276]">
                      <Pin className="w-3.5 h-3.5" />
                      Przypięte
                    </span>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateAnnouncement({
                            ...ann,
                            pinned: !ann.pinned,
                          })
                        }
                        title={ann.pinned ? 'Odepnij ogłoszenie' : 'Przypnij na górze'}
                        className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{ann.pinned ? 'Odepnij' : 'Przypnij'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setModalItem({
                            existing: ann,
                            title: ann.title,
                            content: ann.content,
                            pinned: Boolean(ann.pinned),
                          })
                        }
                        className="px-2 py-1 text-xs font-semibold text-[#7B2276] hover:bg-[#F8F1F8] rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edytuj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usuń</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h2 className="font-display text-base font-bold text-slate-900">{ann.title}</h2>
              <p className="text-sm text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>
            </article>
          ))
        )}
      </div>

      {/* Create / Edit modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-md max-w-lg w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                {modalItem.existing ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'}
              </h2>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  required
                  value={modalItem.title}
                  onChange={(e) => setModalItem({ ...modalItem, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Treść</label>
                <textarea
                  rows={5}
                  required
                  value={modalItem.content}
                  onChange={(e) => setModalItem({ ...modalItem, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalItem.pinned}
                  onChange={(e) => setModalItem({ ...modalItem, pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-[#7B2276]"
                />
                <span>Przypnij ogłoszenie na górze</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#76A815] hover:bg-[#659011] rounded cursor-pointer"
                >
                  {modalItem.existing ? 'Zapisz zmiany' : 'Opublikuj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

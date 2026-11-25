import React, { useMemo, useState } from 'react';
import { Inbox, Mail, PenSquare, Reply, RotateCcw, Search, Send, Trash2, X } from 'lucide-react';
import { JournalState, MessageItem, UserAccount } from '../types/journal';
import { getRoleLabel } from '../utils/permissions';

interface MessagesViewProps {
  journal: JournalState;
  user: UserAccount;
  accounts?: UserAccount[];
  onMarkRead: (id: string) => void;
  onMoveFolder: (id: string, folder: 'inbox' | 'sent' | 'trash') => void;
  onSendMessage: (recipientName: string, subject: string, body: string) => void;
}

const DEFAULT_RECIPIENTS = [
  'mgr Piotr Nowak (Wychowawca 3B · Matematyka)',
  'mgr Katarzyna Wiśniewska (Język polski)',
  'mgr Tomasz Zieliński (Język angielski)',
  'mgr inż. Marek Wójcik (Informatyka)',
  'dr Agnieszka Kamińska (Fizyka)',
  'Dyrektor Mateusz (Dyrektor)',
  'Wicedyrektor Szkoły',
  'Psycholog',
  'Logopeda',
  'Pedagog szkolny',
  'Bibliotekarz szkolny',
  'Sekretariat Szkoły',
  'Jan Kowalski (Uczeń 3B)',
  'Anna Kowalska (Rodzic)',
];

export const MessagesView: React.FC<MessagesViewProps> = ({
  journal,
  user,
  accounts = [],
  onMarkRead,
  onMoveFolder,
  onSendMessage,
}) => {
  const recipientOptions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const addOpt = (val: string) => {
      const clean = val.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push(clean);
      }
    };
    accounts.forEach((acc) => {
      addOpt(`${acc.fullName} (login: ${acc.login} · ${getRoleLabel(acc.role)})`);
    });
    journal.classes.forEach((c) => addOpt(`${c.homeroomTeacher} (Wychowawca ${c.name})`));
    journal.subjects.forEach((s) => addOpt(`${s.teacher} (${s.name})`));
    DEFAULT_RECIPIENTS.forEach(addOpt);
    return list;
  }, [accounts, journal.classes, journal.subjects]);

  const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    journal.messages.find((m) => m.folder === 'inbox')?.id ?? null
  );

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false);
  const [recipient, setRecipient] = useState(recipientOptions[0] ?? DEFAULT_RECIPIENTS[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journal.messages
      .filter((m) => m.folder === folder)
      .filter(
        (m) =>
          !q ||
          m.subject.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          m.recipientName.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [journal.messages, folder, searchQuery]);

  const activeMessage: MessageItem | undefined =
    filteredMessages.find((m) => m.id === selectedId) ?? filteredMessages[0];

  const handleSelectMessage = (msg: MessageItem) => {
    setSelectedId(msg.id);
    if (!msg.read && msg.folder === 'inbox') {
      onMarkRead(msg.id);
    }
  };

  const handleReply = (msg: MessageItem) => {
    setRecipient(msg.senderName);
    setSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setBody(`\n\n--- Wiadomość oryginalna (${msg.date}) ---\n${msg.body}`);
    setShowCompose(true);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    onSendMessage(recipient, subject.trim(), body.trim());
    setShowCompose(false);
    setSubject('');
    setBody('');
    setFolder('sent');
  };

  const unreadInboxCount = journal.messages.filter(
    (m) => m.folder === 'inbox' && !m.read
  ).length;

  return (
    <div className="space-y-4">
      <section className="bg-[#EFF2F5] border border-[#CFD5DC] rounded-[2px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-900">Wiadomości</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Skrzynka komunikacji szkolnej · Zalogowano jako {user.fullName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRecipient(recipientOptions[0] ?? DEFAULT_RECIPIENTS[0]);
            setSubject('');
            setBody('');
            setShowCompose(true);
          }}
          className="px-4 py-2 bg-[#8D2877] hover:bg-[#6E1F5E] text-white text-xs font-semibold rounded-[2px] flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span>Napisz wiadomość</span>
        </button>
      </section>

      <section className="bg-white border border-[#CFD5DC] rounded-[2px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Left folder & list pane */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          {/* Folder tabs */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setFolder('inbox')}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                folder === 'inbox'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Odebrane ({unreadInboxCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFolder('sent')}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                folder === 'sent'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Wysłane</span>
            </button>
            <button
              type="button"
              onClick={() => setFolder('trash')}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                folder === 'trash'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosz</span>
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj wiadomości..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#6E2C81]"
              />
            </div>
          </div>

          {/* Message list */}
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Brak wiadomości w tym folderze.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = activeMessage?.id === msg.id;
                const isUnread = !msg.read && msg.folder === 'inbox';
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5EEF8]'
                        : isUnread
                          ? 'bg-slate-50 hover:bg-slate-100/70'
                          : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className={isUnread ? 'font-bold text-slate-900' : 'font-medium'}>
                        {folder === 'sent' ? `Do: ${msg.recipientName}` : msg.senderName}
                      </span>
                      <span className="font-mono tabular-nums shrink-0">{msg.date}</span>
                    </div>
                    <div
                      className={`text-sm mt-1 truncate ${
                        isUnread ? 'font-bold text-[#521F61]' : 'font-medium text-slate-800'
                      }`}
                    >
                      {msg.subject}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{msg.body}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right reader pane */}
        <div className="lg:col-span-7 flex flex-col">
          {activeMessage ? (
            <>
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    {activeMessage.subject}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                    <div>
                      Nadawca:{' '}
                      <span className="font-semibold text-slate-800">
                        {activeMessage.senderName}
                      </span>{' '}
                      ({activeMessage.senderRole})
                    </div>
                    <div>
                      Odbiorca:{' '}
                      <span className="text-slate-700">{activeMessage.recipientName}</span> · Data:{' '}
                      <span className="font-mono tabular-nums">{activeMessage.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeMessage.folder !== 'trash' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReply(activeMessage)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#6E2C81] bg-[#F5EEF8] hover:bg-[#EADBF0] rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Odpowiedz</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveFolder(activeMessage.id, 'trash')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usuń</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMoveFolder(activeMessage.id, 'inbox')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Przywróć do Odebranych</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 text-sm text-slate-800 whitespace-pre-line leading-relaxed flex-1">
                {activeMessage.body}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
              <Mail className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Wybierz wiadomość z listy, aby przeczytać jej treść.</p>
            </div>
          )}
        </div>
      </section>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display text-lg font-bold text-slate-900">Nowa wiadomość</h3>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSend} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresat</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#6E2C81]"
                >
                  {!recipientOptions.includes(recipient) && (
                    <option value={recipient}>{recipient}</option>
                  )}
                  {recipientOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temat</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Wpisz temat wiadomości"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#6E2C81]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Treść</label>
                <textarea
                  rows={6}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Treść wiadomości..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#6E2C81]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#6E2C81] hover:bg-[#5B216D] rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Wyślij wiadomość</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
